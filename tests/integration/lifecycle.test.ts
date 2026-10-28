import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { cityId, lastCodeSentTo, makeUser, parcelInput, resetDb, tripInput } from "./helpers";
import { saveParcel } from "@/server/services/parcels";
import { saveTrip } from "@/server/services/trips";
import { searchParcels, searchParamsSchema, searchTrips } from "@/server/services/search";
import { matchesForParcel, matchesForTrip } from "@/server/services/matching";
import { acceptProposal, createProposal } from "@/server/services/proposals";
import { startCheckout, handleProviderEvent, startPayoutOnboarding, releasePayout } from "@/server/payments/service";
import { verifyCode } from "@/server/services/delivery";
import { completeBooking, getBookingDetail, markArrived, markInTransit } from "@/server/services/bookings";
import { createReview, getPublicProfile } from "@/server/services/reviews";
import { drainJobs } from "@/server/jobs/runner";
import { sendMessage, listConversations, getConversation } from "@/server/services/messaging";
import type { CurrentUser } from "@/server/auth/session";

/**
 * Parcours complet expéditeur ↔ voyageur, sans paiement réel (simulateur local,
 * qui passe par le même traitement de webhook que Stripe).
 */
describe("cycle de vie complet d'une expédition", () => {
  let sender: CurrentUser;
  let traveler: CurrentUser;
  let parcelId: string;
  let tripId: string;
  let bookingId: string;

  beforeAll(async () => {
    await resetDb();
    sender = await makeUser({ firstName: "Lila" });
    traveler = await makeUser({ firstName: "Amar", kyc: true });
  });

  it("l'expéditeur publie un colis", async () => {
    const p = await saveParcel(sender, { data: await parcelInput(), publish: true, declarations: { honorDeclaration: true, rulesAccepted: true } });
    expect(p.status).toBe("PUBLISHED");
    parcelId = p.id;
    expect(await db.parcelRecipient.count({ where: { parcelId } })).toBe(1);
  });

  it("le voyageur publie un trajet", async () => {
    const t = await saveTrip(traveler, { data: await tripInput() });
    expect(t.status).toBe("PUBLISHED");
    tripId = t.id;
  });

  it("la recherche PostgreSQL trouve les annonces, avec tolérance aux accents et variantes", async () => {
    for (const to of ["Béjaïa", "bejaia", "Bgayet", "bougie"]) {
      const r = await searchTrips(searchParamsSchema.parse({ mode: "trajets", from: "Marseille", to }));
      expect(r.items.map((x) => x.id)).toContain(tripId);
    }
    const parcels = await searchParcels(searchParamsSchema.parse({ mode: "colis", from: "marseille", to: "bejaia" }));
    expect(parcels.items.map((x) => x.id)).toContain(parcelId);
    const none = await searchTrips(searchParamsSchema.parse({ mode: "trajets", from: "Paris", to: "Oran" }));
    expect(none.total).toBe(0);
  });

  it("le matching rapproche colis et trajet dans les deux sens", async () => {
    const m1 = await matchesForParcel(parcelId);
    expect(m1.items[0]?.trip.id).toBe(tripId);
    expect(m1.items[0]?.match.score).toBeGreaterThanOrEqual(90);
    const m2 = await matchesForTrip(tripId);
    expect(m2.items[0]?.parcel.id).toBe(parcelId);
    await drainJobs();
    expect(await db.notification.count({ where: { userId: traveler.id, type: "MATCHING_PARCEL" } })).toBeGreaterThanOrEqual(1);
  });

  it("le voyageur propose, l'expéditeur accepte : réservation créée et capacité réservée", async () => {
    const prop = await createProposal(traveler, { parcelId, tripId, price: 3500, message: "Bonjour, je pars de Marseille le 11." });
    expect(prop.status).toBe("PENDING");
    const booking = await acceptProposal(sender, prop.id);
    bookingId = booking.id;
    expect(booking.status).toBe("ACCEPTED");
    expect(booking).toMatchObject({ transportPrice: 3500, platformFee: 350, travelerNet: 3150, totalCharged: 3500 });
    const trip = await db.trip.findUniqueOrThrow({ where: { id: tripId } });
    expect(trip.reservedGrams).toBe(4000);
    expect((await db.parcel.findUniqueOrThrow({ where: { id: parcelId } })).status).toBe("RESERVED");
  });

  it("la messagerie fonctionne entre les participants uniquement", async () => {
    const convs = await listConversations(sender.id);
    expect(convs).toHaveLength(1);
    await sendMessage(sender.id, convs[0]!.id, "Je peux déposer le colis jeudi soir.");
    const c = await getConversation(traveler.id, convs[0]!.id);
    expect(c.messages.map((m) => m.body)).toContain("Je peux déposer le colis jeudi soir.");
    const intruder = await makeUser();
    await expect(getConversation(intruder.id, convs[0]!.id)).rejects.toThrow();
    await expect(sendMessage(intruder.id, convs[0]!.id, "spam")).rejects.toThrow();
  });

  it("les coordonnées du destinataire restent masquées au voyageur avant paiement", async () => {
    const d = await getBookingDetail(traveler.id, bookingId);
    expect(d.parcel.recipient).toBeNull();
    expect(d.sender.phone).toBeNull();
  });

  it("paiement (simulateur) confirmé par webhook → code de remise envoyé", async () => {
    const { url } = await startCheckout(sender.id, bookingId);
    expect(url).toMatch(/^\/dev\/paiement\/sbx_cs_/);
    const payment = await db.payment.findFirstOrThrow({ where: { bookingId } });
    expect(payment.status).toBe("REQUIRES_PAYMENT");
    expect((await db.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe("AWAITING_PAYMENT");
    const ev = { id: "evt_test_1", type: "checkout.completed" as const, sessionId: payment.providerSessionId!, providerPaymentId: "sbx_pi_1", amount: 3500, currency: "EUR", paymentId: payment.id };
    await handleProviderEvent("local_sandbox", ev, ev);
    const b = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(b.status).toBe("READY_FOR_PICKUP");
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("SUCCEEDED");
    const d = await getBookingDetail(traveler.id, bookingId);
    expect(d.parcel.recipient?.name).toBe("Yasmine B.");
  });

  it("remise confirmée par OTP saisi par le voyageur", async () => {
    const code = await lastCodeSentTo(sender.email);
    await verifyCode(traveler.id, bookingId, "PICKUP", { code });
    expect((await db.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe("PICKED_UP");
    // Aucun code en clair en base.
    const v = await db.deliveryVerification.findFirstOrThrow({ where: { bookingId, purpose: "PICKUP" } });
    expect(v.codeHash).not.toContain(code);
  });

  it("transport, arrivée puis livraison confirmée par le code du destinataire", async () => {
    await markInTransit(traveler.id, bookingId);
    await markArrived(traveler.id, bookingId);
    const code = await lastCodeSentTo("destinataire@test.local");
    await verifyCode(traveler.id, bookingId, "DELIVERY", { code });
    const b = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(b.status).toBe("DELIVERED");
    const events = await db.deliveryEvent.findMany({ where: { bookingId }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(["TRAVELER_SELECTED", "PAYMENT_CONFIRMED", "PICKED_UP", "IN_TRANSIT", "ARRIVED", "DELIVERED"]));
  });

  it("clôture par l'expéditeur → versement créé, puis bloqué tant que le compte n'est pas configuré", async () => {
    await completeBooking(sender.id, bookingId, "SENDER");
    await drainJobs();
    const payout = await db.payout.findUniqueOrThrow({ where: { bookingId } });
    expect(payout.amount).toBe(3150);
    expect(payout.status).toBe("BLOCKED");
    expect(payout.blockedReason).toMatch(/compte de versement/);
  });

  it("versement vers l'Algérie refusé ; vers la France effectué (simulateur), sans double versement", async () => {
    await expect(startPayoutOnboarding(traveler.id, "DZ")).rejects.toThrow(/pas encore disponibles/);
    await startPayoutOnboarding(traveler.id, "FR");
    await db.payoutAccount.updateMany({ where: { userId: traveler.id }, data: { payoutsEnabled: true } });
    expect(await releasePayout(bookingId)).toBe("PAID");
    expect(await releasePayout(bookingId)).toBe("PAID"); // second appel : aucun nouveau transfert
    const payout = await db.payout.findUniqueOrThrow({ where: { bookingId } });
    expect(payout.providerTransferId).toMatch(/^sbx_tr_/);
    expect((await db.commission.findUniqueOrThrow({ where: { bookingId } })).status).toBe("EARNED");
  });

  it("avis réciproques, un seul par personne, agrégats à jour", async () => {
    await createReview(sender.id, { bookingId, rating: 5, comment: "Très sérieux" });
    await createReview(traveler.id, { bookingId, rating: 4 });
    await expect(createReview(sender.id, { bookingId, rating: 1 })).rejects.toThrow(/déjà laissé/);
    const prof = await getPublicProfile(traveler.id);
    expect(prof?.profile).toMatchObject({ ratingSum: 5, ratingCount: 1, deliveriesCount: 1 });
    expect(JSON.stringify(prof)).not.toContain(traveler.email);
  });

  it("refuse une recherche de ville inconnue sans planter", async () => {
    const r = await searchTrips(searchParamsSchema.parse({ mode: "trajets", to: "Atlantide" }));
    expect(r.toCity).toBeNull();
    expect(await cityId("tizi-ouzou-dz")).toBeTruthy();
  });
});
