import "server-only";
import { z } from "zod";
import { db } from "@/server/db/client";
import { addDeliveryEvent, loadBookingFor, releaseCapacity, transition } from "@/server/services/booking-core";
import { createRefund, releasePayout } from "@/server/payments/service";
import { completeBooking } from "@/server/services/bookings";
import { notify } from "@/server/services/notifications";
import { audit } from "@/server/audit";
import { putObject, signedUrl, validateUpload } from "@/server/storage";
import { DISPUTABLE_STATES } from "@/lib/domain/booking-state";
import { conflict, forbidden, invalid, notFound } from "@/server/security/errors";
import type { BookingStatus, DisputeStatus } from "@/generated/prisma/client";

export const DISPUTE_TYPE_LABELS = {
  LOST: "Colis perdu",
  DAMAGED: "Colis endommagé",
  NOT_AS_DESCRIBED: "Colis non conforme",
  TRAVELER_NO_SHOW: "Transporteur absent",
  SENDER_NO_SHOW: "Expéditeur absent",
  RECIPIENT_UNAVAILABLE: "Destinataire indisponible",
  DELAY: "Retard",
  PAYMENT_CONTESTED: "Paiement contesté",
  OTHER: "Autre",
} as const;
export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = { OPEN: "Ouvert", UNDER_REVIEW: "En cours d'examen", WAITING_FOR_INFORMATION: "Informations demandées", RESOLVED: "Résolu", CLOSED: "Clôturé" };

export const openDisputeSchema = z.object({
  bookingId: z.string().min(1).max(64),
  type: z.enum(Object.keys(DISPUTE_TYPE_LABELS) as [keyof typeof DISPUTE_TYPE_LABELS, ...(keyof typeof DISPUTE_TYPE_LABELS)[]]),
  description: z.string().trim().min(20, "Décrivez le problème (20 caractères minimum)").max(4000),
});

/**
 * Ouverture d'un litige : la réservation passe en DISPUTED, ce qui gèle toute
 * clôture et tout versement au transporteur jusqu'à décision.
 */
export async function openDispute(userId: string, input: z.output<typeof openDisputeSchema>) {
  const { booking } = await loadBookingFor(userId, input.bookingId);
  if (!(DISPUTABLE_STATES as readonly string[]).includes(booking.status)) throw conflict("Un litige ne peut pas être ouvert à ce stade de la réservation.");
  return db.$transaction(async (tx) => {
    const existing = await tx.dispute.count({ where: { bookingId: booking.id, status: { notIn: ["RESOLVED", "CLOSED"] } } });
    if (existing) throw conflict("Un litige est déjà en cours pour cette réservation.");
    const actor = booking.senderId === userId ? "SENDER" : "TRAVELER";
    await transition(tx, booking.id, "DISPUTED", { actor, actorId: userId, reason: DISPUTE_TYPE_LABELS[input.type] });
    const d = await tx.dispute.create({ data: { bookingId: booking.id, openedById: userId, type: input.type, description: input.description, previousBookingStatus: booking.status } });
    await tx.disputeEvent.create({ data: { disputeId: d.id, actorId: userId, type: "opened", note: input.description } });
    await addDeliveryEvent(tx, booking.id, "INCIDENT_REPORTED", userId, { disputeId: d.id, type: input.type });
    const other = actor === "SENDER" ? booking.travelerId : booking.senderId;
    await notify(tx, { userId: other, type: "DISPUTE_OPENED", title: `Litige ouvert — ${booking.reference}`, body: `${DISPUTE_TYPE_LABELS[input.type]}. L'équipe Tamurt Sending va examiner la situation.`, link: `/tableau-de-bord/litiges/${d.id}` });
    return d;
  });
}

async function loadDisputeFor(userId: string, disputeId: string, isStaff: boolean) {
  const d = await db.dispute.findUnique({ where: { id: disputeId }, include: { booking: true } });
  if (!d) throw notFound();
  if (!isStaff && d.booking.senderId !== userId && d.booking.travelerId !== userId) throw notFound();
  return d;
}

export async function getDispute(userId: string, disputeId: string, isStaff = false) {
  await loadDisputeFor(userId, disputeId, isStaff);
  const d = await db.dispute.findUniqueOrThrow({
    where: { id: disputeId },
    include: {
      booking: { include: { parcel: { select: { title: true, declaredValue: true, currency: true } }, sender: { select: { id: true, firstName: true, lastName: true } }, traveler: { select: { id: true, firstName: true, lastName: true } }, payments: true, conversation: { select: { id: true } } } },
      openedBy: { select: { firstName: true } },
      assignedTo: { select: { id: true, firstName: true } },
      evidence: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" }, where: isStaff ? {} : { isPublic: true } },
    },
  });
  return { ...d, evidence: await Promise.all(d.evidence.map(async (e) => ({ ...e, url: await signedUrl(e.storageKey, 900) }))) };
}

export async function listMyDisputes(userId: string) {
  return db.dispute.findMany({ where: { booking: { OR: [{ senderId: userId }, { travelerId: userId }] } }, orderBy: { updatedAt: "desc" }, include: { booking: { select: { reference: true, id: true } } } });
}

export async function addDisputeMessage(userId: string, disputeId: string, note: string, opts: { isStaff?: boolean; internal?: boolean } = {}) {
  const d = await loadDisputeFor(userId, disputeId, !!opts.isStaff);
  if (["RESOLVED", "CLOSED"].includes(d.status)) throw conflict("Ce litige est clôturé.");
  if (note.trim().length < 2) throw invalid("Message vide.");
  await db.$transaction(async (tx) => {
    await tx.disputeEvent.create({ data: { disputeId, actorId: userId, type: opts.isStaff ? "staff_message" : "message", note: note.trim().slice(0, 4000), isPublic: !opts.internal } });
    // Réponse d'une partie à une demande d'informations : retour en examen.
    if (!opts.isStaff && d.status === "WAITING_FOR_INFORMATION") await tx.dispute.update({ where: { id: disputeId }, data: { status: "UNDER_REVIEW" } });
    if (opts.isStaff && !opts.internal)
      for (const uid of [d.booking.senderId, d.booking.travelerId])
        await notify(tx, { userId: uid, type: "DISPUTE_UPDATED", title: `Litige ${d.booking.reference} : nouveau message`, body: note.slice(0, 140), link: `/tableau-de-bord/litiges/${disputeId}` });
  });
}

export async function addDisputeEvidence(userId: string, disputeId: string, file: File) {
  const d = await loadDisputeFor(userId, disputeId, false);
  if (["RESOLVED", "CLOSED"].includes(d.status)) throw conflict("Ce litige est clôturé.");
  const count = await db.disputeEvidence.count({ where: { disputeId } });
  if (count >= 15) throw invalid("15 pièces maximum.");
  const { bytes, mime } = await validateUpload(file, "document");
  const key = await putObject("disputes", bytes, mime);
  await db.$transaction([
    db.disputeEvidence.create({ data: { disputeId, uploaderId: userId, storageKey: key, mimeType: mime, sizeBytes: bytes.byteLength, fileName: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 100) || "piece" } }),
    db.disputeEvent.create({ data: { disputeId, actorId: userId, type: "evidence_added" } }),
  ]);
}

// ───────────────────────────── Traitement administrateur ─────────────────────────────

export const resolveDisputeSchema = z.object({
  disputeId: z.string().min(1).max(64),
  resolution: z.enum(["FULL_REFUND", "PARTIAL_REFUND", "RELEASE_PAYOUT", "NO_ACTION"]),
  refundAmount: z.number().int().positive().optional(),
  note: z.string().trim().min(5, "Motivez la décision").max(4000),
});

export async function assignDispute(staffId: string, disputeId: string) {
  await db.$transaction(async (tx) => {
    const d = await tx.dispute.findUnique({ where: { id: disputeId } });
    if (!d) throw notFound();
    await tx.dispute.update({ where: { id: disputeId }, data: { assignedToId: staffId, status: d.status === "OPEN" ? "UNDER_REVIEW" : d.status } });
    await tx.disputeEvent.create({ data: { disputeId, actorId: staffId, type: "assigned", isPublic: false } });
    await audit({ actorId: staffId, action: "dispute.assign", targetType: "Dispute", targetId: disputeId }, tx);
  });
}

export async function requestInformation(staffId: string, disputeId: string, note: string) {
  await addDisputeMessage(staffId, disputeId, note, { isStaff: true });
  await db.dispute.update({ where: { id: disputeId }, data: { status: "WAITING_FOR_INFORMATION" } });
  await audit({ actorId: staffId, action: "dispute.request_info", targetType: "Dispute", targetId: disputeId });
}

/**
 * Décision. Les remboursements sont exécutés par le prestataire de paiement ;
 * la libération du versement repasse par les mêmes contrôles que d'ordinaire.
 */
export async function resolveDispute(staffId: string, input: z.output<typeof resolveDisputeSchema>) {
  const d = await db.dispute.findUnique({ where: { id: input.disputeId }, include: { booking: { include: { payments: true } } } });
  if (!d) throw notFound();
  if (["RESOLVED", "CLOSED"].includes(d.status)) throw conflict("Litige déjà traité.");
  const b = d.booking;
  const payment = b.payments.find((p) => ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(p.status));
  const refundable = payment ? payment.amount - payment.amountRefunded : 0;

  if (input.resolution === "FULL_REFUND" || input.resolution === "PARTIAL_REFUND") {
    if (!payment) throw conflict("Aucun paiement encaissé à rembourser.");
    const amount = input.resolution === "FULL_REFUND" ? refundable : input.refundAmount;
    if (!amount || amount > refundable) throw invalid(`Montant de remboursement invalide (maximum ${refundable / 100} €).`);
    if (input.resolution === "FULL_REFUND") {
      await db.$transaction(async (tx) => {
        if (b.status === "DISPUTED" && !["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(d.previousBookingStatus)) {
          await releaseCapacity(tx, b);
        }
      });
    }
    await createRefund(payment.id, amount, `Litige ${b.reference} : ${input.note.slice(0, 200)}`, staffId);
    if (input.resolution === "PARTIAL_REFUND") {
      // Remboursement partiel : la transaction est clôturée, le versement est recalculé au prorata disponible.
      await db.payout.updateMany({ where: { bookingId: b.id }, data: { amount: Math.max(0, b.travelerNet - amount) } });
    }
  }

  await db.$transaction(async (tx) => {
    await tx.dispute.update({ where: { id: d.id }, data: { status: "RESOLVED", resolution: input.resolution, refundAmount: input.resolution === "PARTIAL_REFUND" ? input.refundAmount : input.resolution === "FULL_REFUND" ? refundable : null, resolvedAt: new Date(), assignedToId: d.assignedToId ?? staffId } });
    await tx.disputeEvent.create({ data: { disputeId: d.id, actorId: staffId, type: `resolved:${input.resolution}`, note: input.note } });
    await audit({ actorId: staffId, action: "dispute.resolve", targetType: "Dispute", targetId: d.id, metadata: { resolution: input.resolution, refundAmount: input.refundAmount ?? null } }, tx);
    for (const uid of [b.senderId, b.travelerId])
      await notify(tx, { userId: uid, type: "DISPUTE_UPDATED", title: `Litige ${b.reference} résolu`, body: input.note.slice(0, 200), link: `/tableau-de-bord/litiges/${d.id}` });
  });

  // Effets sur la réservation.
  const fresh = await db.booking.findUniqueOrThrow({ where: { id: b.id } });
  if (fresh.status !== "DISPUTED") return; // déjà passée à REFUNDED par la confirmation du remboursement
  if (input.resolution === "RELEASE_PAYOUT" || input.resolution === "PARTIAL_REFUND") {
    await completeBooking(staffId, b.id, "ADMIN");
    await releasePayout(b.id).catch(() => undefined);
  } else if (input.resolution === "NO_ACTION") {
    await db.$transaction(async (tx) => {
      await transition(tx, b.id, d.previousBookingStatus as BookingStatus, { actor: "ADMIN", actorId: staffId, reason: "Litige clos sans suite : reprise du parcours" });
    });
  }
}

export async function closeDispute(staffId: string, disputeId: string, note: string) {
  const d = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!d) throw notFound();
  if (d.status !== "RESOLVED") throw conflict("Résolvez le litige avant de le clôturer.");
  await db.$transaction(async (tx) => {
    await tx.dispute.update({ where: { id: disputeId }, data: { status: "CLOSED" } });
    await tx.disputeEvent.create({ data: { disputeId, actorId: staffId, type: "closed", note } });
    await audit({ actorId: staffId, action: "dispute.close", targetType: "Dispute", targetId: disputeId }, tx);
  });
}

export const assertNotSelf = (a: string, b: string) => {
  if (a === b) throw forbidden();
};
