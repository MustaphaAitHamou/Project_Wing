import "server-only";
import { db } from "@/server/db/client";
import { addDeliveryEvent, loadBookingFor, releaseCapacity, transition } from "@/server/services/booking-core";
import { createPayoutRecord, createRefund } from "@/server/payments/service";
import { getPaymentProvider } from "@/server/payments";
import { enqueue } from "@/server/jobs/queue";
import { notify } from "@/server/services/notifications";
import { getSetting } from "@/server/settings";
import { verificationState } from "@/server/services/delivery";
import { audit } from "@/server/audit";
import { CANCELLABLE_STATES, type Actor } from "@/lib/domain/booking-state";
import { conflict, forbidden, notFound } from "@/server/security/errors";
import type { ProviderName } from "@/server/payments/types";

export async function listMyBookings(userId: string, as?: "SENDER" | "TRAVELER") {
  return db.booking.findMany({
    where: as === "SENDER" ? { senderId: userId } : as === "TRAVELER" ? { travelerId: userId } : { OR: [{ senderId: userId }, { travelerId: userId }] },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { parcel: { include: { originCity: true, destCity: true } }, trip: { select: { departureDate: true, transportMode: true } }, sender: { select: { firstName: true } }, traveler: { select: { firstName: true } } },
  });
}

/** Détail d'une réservation pour un participant. Les coordonnées du destinataire ne sont révélées au voyageur qu'après paiement. */
export async function getBookingDetail(userId: string, bookingId: string) {
  const { role } = await loadBookingFor(userId, bookingId);
  const b = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      parcel: { include: { originCity: { include: { country: true } }, destCity: { include: { country: true } }, category: true, recipient: true } },
      trip: { include: { originCity: true, destCity: true } },
      sender: { select: { id: true, firstName: true, lastName: true, image: true, phone: true, profile: { select: { kycStatus: true, ratingSum: true, ratingCount: true } } } },
      traveler: { select: { id: true, firstName: true, lastName: true, image: true, phone: true, profile: { select: { kycStatus: true, ratingSum: true, ratingCount: true, deliveriesCount: true } } } },
      events: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      reviews: true,
      disputes: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, type: true, createdAt: true } },
      conversation: { select: { id: true } },
      payout: role === "TRAVELER",
    },
  });
  const paid = ["PAID", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "DISPUTED"].includes(b.status);
  const recipient = role === "SENDER" || paid ? b.parcel.recipient : null;
  // Le téléphone de l'autre partie n'est partagé qu'une fois la réservation payée.
  const counterpartPhone = paid ? (role === "SENDER" ? b.traveler.phone : b.sender.phone) : null;
  const [pickup, delivery] = await Promise.all([verificationState(bookingId, "PICKUP"), verificationState(bookingId, "DELIVERY")]);
  return {
    ...b,
    role,
    parcel: { ...b.parcel, recipient },
    sender: { ...b.sender, phone: role === "SENDER" ? b.sender.phone : counterpartPhone },
    traveler: { ...b.traveler, phone: role === "TRAVELER" ? b.traveler.phone : counterpartPhone },
    otp: { pickup, delivery },
    myReview: b.reviews.find((r) => r.authorId === userId) ?? null,
    theirReview: b.reviews.find((r) => r.authorId !== userId && r.status === "VISIBLE") ?? null,
  };
}

/**
 * Annulation (avant remise du colis uniquement). Si un paiement a été encaissé, un
 * remboursement intégral est demandé au prestataire ; la réservation passe à
 * REFUNDED lorsque le prestataire le confirme.
 */
export async function cancelBooking(userId: string, bookingId: string, reason: string, opts: { asAdmin?: boolean } = {}) {
  const loaded = opts.asAdmin ? { booking: await db.booking.findUnique({ where: { id: bookingId } }), role: "ADMIN" as const } : await loadBookingFor(userId, bookingId);
  const booking = loaded.booking;
  if (!booking) throw notFound();
  if (!(CANCELLABLE_STATES as readonly string[]).includes(booking.status)) throw conflict("Cette réservation ne peut plus être annulée : le colis a déjà été remis. Ouvrez un litige si nécessaire.");
  const actor: Actor = loaded.role;

  const payment = await db.$transaction(async (tx) => {
    await transition(tx, bookingId, "CANCELLED", { actor, actorId: userId, reason, data: { cancelledAt: new Date(), cancelReason: reason.slice(0, 500) } });
    await releaseCapacity(tx, booking);
    const parcel = await tx.parcel.findUniqueOrThrow({ where: { id: booking.parcelId } });
    const stillValid = !parcel.expiresAt || parcel.expiresAt > new Date();
    await tx.parcel.update({ where: { id: booking.parcelId }, data: { status: stillValid ? "PUBLISHED" : "EXPIRED" } });
    await tx.proposal.update({ where: { id: booking.proposalId }, data: { status: "WITHDRAWN" } });
    await tx.deliveryVerification.updateMany({ where: { bookingId, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: new Date() } });
    await tx.commission.updateMany({ where: { bookingId }, data: { status: "REVERSED" } });
    await addDeliveryEvent(tx, bookingId, "CANCELLED", userId, { by: actor, reason });
    const other = actor === "SENDER" ? booking.travelerId : actor === "TRAVELER" ? booking.senderId : null;
    for (const uid of other ? [other] : [booking.senderId, booking.travelerId])
      await notify(tx, { userId: uid, type: "BOOKING_UPDATED", title: `Réservation annulée — ${booking.reference}`, body: `Motif : ${reason}`, link: `/tableau-de-bord/reservations/${bookingId}` });
    if (actor === "ADMIN") await (await import("@/server/audit")).audit({ actorId: userId, action: "booking.cancel", targetType: "Booking", targetId: bookingId, metadata: { reason } }, tx);
    const open = await tx.payment.findMany({ where: { bookingId, status: "REQUIRES_PAYMENT" } });
    await tx.payment.updateMany({ where: { bookingId, status: "REQUIRES_PAYMENT" }, data: { status: "CANCELLED" } });
    for (const p of open) if (p.providerSessionId) await getPaymentProvider(p.provider as ProviderName).expireCheckout(p.providerSessionId).catch(() => undefined);
    return tx.payment.findFirst({ where: { bookingId, status: "SUCCEEDED" } });
  });
  if (payment) await createRefund(payment.id, payment.amount - payment.amountRefunded, `Annulation : ${reason}`, opts.asAdmin ? userId : null);
}

/** Voyageur : le colis a quitté la ville de départ. */
export async function markInTransit(userId: string, bookingId: string) {
  const { booking, role } = await loadBookingFor(userId, bookingId);
  if (role !== "TRAVELER") throw forbidden();
  await db.$transaction(async (tx) => {
    await transition(tx, bookingId, "IN_TRANSIT", { actor: "TRAVELER", actorId: userId, expectedFrom: "PICKED_UP" });
    await addDeliveryEvent(tx, bookingId, "IN_TRANSIT", userId);
    await notify(tx, { userId: booking.senderId, type: "BOOKING_UPDATED", title: `Colis en transport — ${booking.reference}`, body: "Le voyageur a indiqué être en route.", link: `/tableau-de-bord/reservations/${bookingId}` });
  });
}

/** Voyageur : arrivé à destination, prêt à livrer → envoi du code de réception au destinataire. */
export async function markArrived(userId: string, bookingId: string) {
  const { booking, role } = await loadBookingFor(userId, bookingId);
  if (role !== "TRAVELER") throw forbidden();
  await db.$transaction(async (tx) => {
    await transition(tx, bookingId, "OUT_FOR_DELIVERY", { actor: "TRAVELER", actorId: userId, expectedFrom: "IN_TRANSIT" });
    await addDeliveryEvent(tx, bookingId, "ARRIVED", userId);
    await addDeliveryEvent(tx, bookingId, "OUT_FOR_DELIVERY", userId);
    await enqueue(tx, "otp.issue", { bookingId, purpose: "DELIVERY" }, { dedupeKey: `otp:DELIVERY:${bookingId}:1` });
    await notify(tx, { userId: booking.senderId, type: "BOOKING_UPDATED", title: `Colis arrivé — ${booking.reference}`, body: "Le voyageur est arrivé. Le destinataire reçoit le code de réception.", link: `/tableau-de-bord/reservations/${bookingId}` });
  });
}

/** Clôture : par l'expéditeur après livraison, ou automatiquement après le délai configuré. */
export async function completeBooking(actorId: string | null, bookingId: string, actor: "SENDER" | "SYSTEM" | "ADMIN") {
  if (actor === "SENDER") {
    const { role } = await loadBookingFor(actorId!, bookingId);
    if (role !== "SENDER") throw forbidden();
  }
  await db.$transaction(async (tx) => {
    const now = new Date();
    await transition(tx, bookingId, "COMPLETED", { actor, actorId, expectedFrom: actor === "ADMIN" ? ["DELIVERED", "DISPUTED"] : "DELIVERED", data: { completedAt: now }, reason: actor === "SYSTEM" ? "Clôture automatique" : undefined });
    const b = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    await addDeliveryEvent(tx, bookingId, "COMPLETED", actorId);
    await tx.userProfile.upsert({ where: { userId: b.travelerId }, create: { userId: b.travelerId, deliveriesCount: 1 }, update: { deliveriesCount: { increment: 1 } } });
    await tx.userProfile.upsert({ where: { userId: b.senderId }, create: { userId: b.senderId, shipmentsCount: 1 }, update: { shipmentsCount: { increment: 1 } } });
    await createPayoutRecord(tx, b);
    for (const uid of [b.senderId, b.travelerId])
      await notify(tx, { userId: uid, type: "BOOKING_UPDATED", title: `Transaction terminée — ${b.reference}`, body: "Merci ! Vous pouvez maintenant laisser un avis.", link: `/tableau-de-bord/reservations/${bookingId}` });
  });
}

/** Tâche planifiée : clôture des livraisons non contestées après N jours. */
export async function autoCompleteDelivered() {
  const days = await getSetting("booking.autoCompleteDays");
  const due = await db.booking.findMany({ where: { status: "DELIVERED", deliveredAt: { lt: new Date(Date.now() - days * 86_400_000) } }, select: { id: true } });
  let n = 0;
  for (const b of due) {
    try {
      await completeBooking(null, b.id, "SYSTEM");
      n++;
    } catch {
      // Conflit d'état (litige ouvert entre-temps) : ignoré.
    }
  }
  return n;
}

/** Après vérification d'identité : débloque les réservations en attente. */
export async function onUserVerified(userId: string) {
  const [travelerRequired, threshold] = await Promise.all([getSetting("kyc.travelerRequired"), getSetting("kyc.senderRequiredAboveValue")]);
  const pending = await db.booking.findMany({ where: { status: "AWAITING_VERIFICATION", OR: [{ senderId: userId }, { travelerId: userId }] }, include: { parcel: { select: { declaredValue: true } } } });
  for (const b of pending) {
    const profiles = await db.userProfile.findMany({ where: { userId: { in: [b.senderId, b.travelerId] } } });
    const k = new Map(profiles.map((p) => [p.userId, p.kycStatus]));
    const ok = (!travelerRequired || k.get(b.travelerId) === "VERIFIED") && (b.parcel.declaredValue <= threshold || k.get(b.senderId) === "VERIFIED");
    if (!ok) continue;
    await db.$transaction(async (tx) => {
      await transition(tx, b.id, "ACCEPTED", { actor: "SYSTEM", actorId: null, reason: "Vérifications d'identité complètes" });
      await notify(tx, { userId: b.senderId, type: "BOOKING_UPDATED", title: `Réservation prête pour le paiement — ${b.reference}`, body: "Les vérifications sont terminées. Vous pouvez payer la réservation.", link: `/tableau-de-bord/reservations/${b.id}` });
    });
  }
}

export async function adminForceTransition(adminId: string, bookingId: string, to: "COMPLETED" | "CANCELLED", reason: string) {
  if (to === "COMPLETED") await completeBooking(adminId, bookingId, "ADMIN");
  else await cancelBooking(adminId, bookingId, reason, { asAdmin: true });
  await audit({ actorId: adminId, action: `booking.force_${to.toLowerCase()}`, targetType: "Booking", targetId: bookingId, metadata: { reason } });
}
