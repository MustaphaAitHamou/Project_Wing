import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { lastCodeSentTo, makeUser, parcelInput, resetDb, tripInput } from "./helpers";
import { cancelParcel, saveParcel } from "@/server/services/parcels";
import { saveTrip } from "@/server/services/trips";
import { acceptProposal, createProposal } from "@/server/services/proposals";
import { handleProviderEvent, startCheckout } from "@/server/payments/service";
import { verifyCode } from "@/server/services/delivery";
import { cancelBooking, getBookingDetail, markInTransit } from "@/server/services/bookings";
import { openDispute, resolveDispute, getDispute } from "@/server/services/disputes";
import { createReview } from "@/server/services/reviews";
import { drainJobs } from "@/server/jobs/runner";
import type { CurrentUser } from "@/server/auth/session";

const declarations = { honorDeclaration: true as const, rulesAccepted: true as const };

async function paidBooking() {
  const sender = await makeUser();
  const traveler = await makeUser({ kyc: true });
  const parcel = await saveParcel(sender, { data: await parcelInput(), publish: true, declarations });
  const trip = await saveTrip(traveler, { data: await tripInput() });
  const prop = await createProposal(traveler, { parcelId: parcel.id, tripId: trip.id, price: 4000 });
  const booking = await acceptProposal(sender, prop.id);
  await startCheckout(sender.id, booking.id);
  const payment = await db.payment.findFirstOrThrow({ where: { bookingId: booking.id } });
  const ev = { id: `evt_${booking.id}`, type: "checkout.completed" as const, sessionId: payment.providerSessionId!, providerPaymentId: `pi_${booking.id}`, amount: 4000, currency: "EUR", paymentId: payment.id };
  await handleProviderEvent("local_sandbox", ev, ev);
  return { sender, traveler, parcel, trip, booking, payment, ev };
}

describe("sécurité et autorisations", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("un expéditeur ne peut pas modifier ni supprimer le colis d'un autre (IDOR)", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const p = await saveParcel(owner, { data: await parcelInput(), publish: true, declarations });
    await expect(saveParcel(other, { id: p.id, data: await parcelInput({ title: "Piraté !!" }), publish: true, declarations })).rejects.toThrow(/introuvable/i);
    await expect(cancelParcel(other.id, p.id)).rejects.toThrow(/introuvable/i);
    expect((await db.parcel.findUniqueOrThrow({ where: { id: p.id } })).title).toBe("Vêtements enfants");
  });

  it("un utilisateur non participant ne voit pas une réservation", async () => {
    const { booking } = await paidBooking();
    const intruder = await makeUser({ kyc: true });
    await expect(getBookingDetail(intruder.id, booking.id)).rejects.toThrow(/introuvable/i);
  });

  it("un voyageur ne peut pas confirmer une livraison à laquelle il ne participe pas", async () => {
    const { booking, sender } = await paidBooking();
    const intruder = await makeUser({ kyc: true });
    const code = await lastCodeSentTo(sender.email);
    await expect(verifyCode(intruder.id, booking.id, "PICKUP", { code })).rejects.toThrow(/introuvable/i);
    // L'expéditeur non plus : seul le voyageur saisit le code.
    await expect(verifyCode(sender.id, booking.id, "PICKUP", { code })).rejects.toThrow(/voyageur/i);
  });

  it("OTP invalide : essais décomptés puis blocage", async () => {
    const { booking, traveler, sender } = await paidBooking();
    const good = await lastCodeSentTo(sender.email);
    const bad = good === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await expect(verifyCode(traveler.id, booking.id, "PICKUP", { code: bad })).rejects.toThrow(/incorrect/i);
    await expect(verifyCode(traveler.id, booking.id, "PICKUP", { code: good })).rejects.toThrow(/essais dépassé/i);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("READY_FOR_PICKUP");
  });

  it("OTP expiré refusé", async () => {
    const { booking, traveler, sender } = await paidBooking();
    const code = await lastCodeSentTo(sender.email);
    await db.deliveryVerification.updateMany({ where: { bookingId: booking.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(verifyCode(traveler.id, booking.id, "PICKUP", { code })).rejects.toThrow(/expiré/i);
  });

  it("double confirmation de remise impossible (même en parallèle)", async () => {
    const { booking, traveler, sender } = await paidBooking();
    const code = await lastCodeSentTo(sender.email);
    const results = await Promise.allSettled([verifyCode(traveler.id, booking.id, "PICKUP", { code }), verifyCode(traveler.id, booking.id, "PICKUP", { code })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(verifyCode(traveler.id, booking.id, "PICKUP", { code })).rejects.toThrow();
    expect(await db.bookingStatusHistory.count({ where: { bookingId: booking.id, toStatus: "PICKED_UP" } })).toBe(1);
  });

  it("impossible de livrer un colis non récupéré", async () => {
    const { booking, traveler } = await paidBooking();
    await expect(markInTransit(traveler.id, booking.id)).rejects.toThrow();
    await expect(verifyCode(traveler.id, booking.id, "DELIVERY", { code: "123456" })).rejects.toThrow(/pas attendue/i);
  });

  it("webhook reçu deux fois : traité une seule fois", async () => {
    const { booking, ev } = await paidBooking();
    const r = await handleProviderEvent("local_sandbox", ev, ev);
    expect(r.duplicate).toBe(true);
    expect(await db.bookingStatusHistory.count({ where: { bookingId: booking.id, toStatus: "PAID" } })).toBe(1);
    expect(await db.job.count({ where: { type: "otp.issue", payload: { path: ["bookingId"], equals: booking.id } } })).toBe(1);
  });

  it("paiement en double (deux sessions payées) : le second est remboursé automatiquement", async () => {
    const { booking, sender } = await paidBooking();
    await expect(startCheckout(sender.id, booking.id)).rejects.toThrow(/pas en attente de paiement/);
    // Simule une seconde session ouverte avant le premier paiement puis payée.
    const p2 = await db.payment.create({ data: { bookingId: booking.id, provider: "local_sandbox", amount: 4000, currency: "EUR", idempotencyKey: "dup", providerSessionId: "sbx_cs_dup" } });
    const ev2 = { id: "evt_dup", type: "checkout.completed" as const, sessionId: "sbx_cs_dup", providerPaymentId: "pi_dup", amount: 4000, currency: "EUR", paymentId: p2.id };
    await handleProviderEvent("local_sandbox", ev2, ev2);
    expect((await db.payment.findUniqueOrThrow({ where: { id: p2.id } })).status).toBe("REFUNDED");
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("READY_FOR_PICKUP");
  });

  it("montant encaissé différent du montant attendu : rejeté", async () => {
    const sender = await makeUser();
    const traveler = await makeUser({ kyc: true });
    const parcel = await saveParcel(sender, { data: await parcelInput(), publish: true, declarations });
    const trip = await saveTrip(traveler, { data: await tripInput() });
    const prop = await createProposal(traveler, { parcelId: parcel.id, tripId: trip.id, price: 4000 });
    const booking = await acceptProposal(sender, prop.id);
    await startCheckout(sender.id, booking.id);
    const payment = await db.payment.findFirstOrThrow({ where: { bookingId: booking.id } });
    const ev = { id: "evt_bad_amount", type: "checkout.completed" as const, sessionId: payment.providerSessionId!, providerPaymentId: "pi_x", amount: 100, currency: "EUR", paymentId: payment.id };
    await expect(handleProviderEvent("local_sandbox", ev, ev)).rejects.toThrow(/Montant/);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("AWAITING_PAYMENT");
  });

  it("réservations concurrentes sur un même colis : une seule réussit", async () => {
    const sender = await makeUser();
    const t1 = await makeUser({ kyc: true });
    const t2 = await makeUser({ kyc: true });
    const parcel = await saveParcel(sender, { data: await parcelInput(), publish: true, declarations });
    const trip1 = await saveTrip(t1, { data: await tripInput() });
    const trip2 = await saveTrip(t2, { data: await tripInput() });
    const p1 = await createProposal(t1, { parcelId: parcel.id, tripId: trip1.id, price: 3000 });
    const p2 = await createProposal(t2, { parcelId: parcel.id, tripId: trip2.id, price: 3200 });
    const res = await Promise.allSettled([acceptProposal(sender, p1.id), acceptProposal(sender, p2.id)]);
    expect(res.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.booking.count({ where: { parcelId: parcel.id } })).toBe(1);
  });

  it("capacité : pas de survente même avec des acceptations simultanées", async () => {
    const traveler = await makeUser({ kyc: true });
    const trip = await saveTrip(traveler, { data: await tripInput({ capacityGrams: 6000 }) });
    const senders: CurrentUser[] = [];
    const proposals = [];
    for (let i = 0; i < 3; i++) {
      const s = await makeUser();
      senders.push(s);
      const p = await saveParcel(s, { data: await parcelInput({ weightGrams: 4000 }), publish: true, declarations });
      proposals.push(await createProposal(traveler, { parcelId: p.id, tripId: trip.id, price: 3000 }));
    }
    const res = await Promise.allSettled(proposals.map((p, i) => acceptProposal(senders[i]!, p.id)));
    expect(res.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const t = await db.trip.findUniqueOrThrow({ where: { id: trip.id } });
    expect(t.reservedGrams).toBe(4000);
  });

  it("le prix est figé après acceptation", async () => {
    const { booking } = await paidBooking();
    const b = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(b.transportPrice).toBe(4000);
    await expect(db.booking.update({ where: { id: booking.id }, data: { transportPrice: 0 } })).rejects.toThrow(); // contrainte CHECK
  });

  it("un voyageur non vérifié ne peut pas proposer ses services", async () => {
    const sender = await makeUser();
    const traveler = await makeUser({ kyc: false });
    const parcel = await saveParcel(sender, { data: await parcelInput(), publish: true, declarations });
    const trip = await saveTrip(traveler, { data: await tripInput() });
    await expect(createProposal(traveler, { parcelId: parcel.id, tripId: trip.id, price: 3000 })).rejects.toThrow(/identité/);
  });

  it("une catégorie interdite ne peut pas être publiée ; un corridor fermé est bloqué", async () => {
    const sender = await makeUser();
    const weapons = (await db.parcelCategory.findUniqueOrThrow({ where: { slug: "armes" } })).id;
    await expect(saveParcel(sender, { data: await parcelInput({ categoryId: weapons }), publish: true, declarations })).rejects.toThrow(/interdits/);
    await db.corridor.updateMany({ data: { status: "DISABLED" } });
    await expect(saveParcel(sender, { data: await parcelInput(), publish: true, declarations })).rejects.toThrow(/pas encore ouvert/);
  });

  it("avis impossible avant la fin de la transaction", async () => {
    const { booking, sender } = await paidBooking();
    await expect(createReview(sender.id, { bookingId: booking.id, rating: 5 })).rejects.toThrow(/terminée/);
  });

  it("annulation après paiement : remboursement exécuté par le prestataire puis REFUNDED", async () => {
    const { booking, sender, trip } = await paidBooking();
    await cancelBooking(sender.id, booking.id, "Changement de plans");
    const b = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(b.status).toBe("REFUNDED");
    const refund = await db.refund.findFirstOrThrow({ where: { payment: { bookingId: booking.id } } });
    expect(refund.providerRefundId).toMatch(/^sbx_re_/);
    expect((await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).reservedGrams).toBe(0);
  });

  it("litige : gel de la réservation puis remboursement décidé par l'admin", async () => {
    const { booking, sender, traveler } = await paidBooking();
    const code = await lastCodeSentTo(sender.email);
    await verifyCode(traveler.id, booking.id, "PICKUP", { code });
    const d = await openDispute(sender.id, { bookingId: booking.id, type: "DAMAGED", description: "Le colis est arrivé ouvert et abîmé, photos jointes." });
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("DISPUTED");
    await expect(markInTransit(traveler.id, booking.id)).rejects.toThrow();
    const admin = await makeUser({ role: "ADMIN" });
    await expect(getDispute((await makeUser()).id, d.id)).rejects.toThrow(/introuvable/i);
    await resolveDispute(admin.id, { disputeId: d.id, resolution: "FULL_REFUND", note: "Dommage constaté sur photos." });
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("REFUNDED");
    expect(await db.auditLog.count({ where: { action: "dispute.resolve", targetId: d.id } })).toBe(1);
    await drainJobs();
  });
});
