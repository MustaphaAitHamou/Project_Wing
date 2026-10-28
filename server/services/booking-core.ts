import "server-only";
import type { BookingStatus, DeliveryEventType, Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db/client";
import { assertTransition, CAPACITY_HOLDING_STATES, type Actor } from "@/lib/domain/booking-state";
import { conflict, notFound } from "@/server/security/errors";

/**
 * Transition d'état contrôlée côté serveur :
 * 1. vérifie l'arête dans la machine à états pour l'acteur donné ;
 * 2. applique la mise à jour de manière conditionnelle (`WHERE status = from`),
 *    ce qui rend la transition atomique : deux requêtes simultanées ne peuvent pas
 *    toutes deux réussir (ex. double confirmation de remise) ;
 * 3. historise la transition.
 */
export async function transition(
  tx: Tx,
  bookingId: string,
  to: BookingStatus,
  ctx: { actor: Actor; actorId: string | null; reason?: string; metadata?: Prisma.InputJsonValue; data?: Prisma.BookingUpdateManyMutationInput; expectedFrom?: BookingStatus | BookingStatus[] },
) {
  const b = await tx.booking.findUnique({ where: { id: bookingId }, select: { status: true, version: true } });
  if (!b) throw notFound();
  if (ctx.expectedFrom) {
    const allowed = Array.isArray(ctx.expectedFrom) ? ctx.expectedFrom : [ctx.expectedFrom];
    if (!allowed.includes(b.status)) throw conflict("Cette action n'est plus possible : la réservation a changé d'état.");
  }
  assertTransition(b.status, to, ctx.actor);
  const res = await tx.booking.updateMany({
    where: { id: bookingId, status: b.status, version: b.version },
    data: { ...ctx.data, status: to, version: { increment: 1 } },
  });
  if (res.count !== 1) throw conflict("La réservation vient d'être modifiée. Rechargez la page.");
  await tx.bookingStatusHistory.create({ data: { bookingId, fromStatus: b.status, toStatus: to, actorId: ctx.actorId, reason: ctx.reason, metadata: ctx.metadata } });
  return { from: b.status, to };
}

export async function addDeliveryEvent(tx: Tx | typeof db, bookingId: string, type: DeliveryEventType, actorId: string | null, metadata?: Prisma.InputJsonValue) {
  await tx.deliveryEvent.create({ data: { bookingId, type, actorId, metadata } });
}

/** Libère la capacité réservée sur le trajet (annulation, remboursement). */
export async function releaseCapacity(tx: Tx, booking: { tripId: string; weightGrams: number; volumeCm3: number }) {
  const t = await tx.trip.findUniqueOrThrow({ where: { id: booking.tripId }, select: { capacityVolumeCm3: true } });
  await tx.$executeRaw`
    UPDATE "trip" SET "reservedGrams" = GREATEST(0, "reservedGrams" - ${booking.weightGrams}),
      "reservedVolumeCm3" = GREATEST(0, "reservedVolumeCm3" - ${t.capacityVolumeCm3 == null ? 0 : booking.volumeCm3}),
      status = CASE WHEN status = 'FULL' THEN 'PUBLISHED'::"TripStatus" ELSE status END,
      "updatedAt" = now()
    WHERE id = ${booking.tripId}`;
}

/**
 * Réserve de la capacité de manière atomique : l'UPDATE n'aboutit que si la
 * capacité restante est suffisante au moment de l'écriture (pas de survente
 * même en cas de réservations concurrentes). La contrainte CHECK SQL sert de
 * seconde barrière.
 */
export async function reserveCapacity(tx: Tx, tripId: string, grams: number, volumeCm3: number): Promise<boolean> {
  const n = await tx.$executeRaw`
    UPDATE "trip" SET
      "reservedGrams" = "reservedGrams" + ${grams},
      "reservedVolumeCm3" = "reservedVolumeCm3" + CASE WHEN "capacityVolumeCm3" IS NULL THEN 0 ELSE ${volumeCm3} END,
      status = CASE WHEN "reservedGrams" + ${grams} >= "capacityGrams" THEN 'FULL'::"TripStatus" ELSE status END,
      "updatedAt" = now()
    WHERE id = ${tripId} AND status = 'PUBLISHED'
      AND "reservedGrams" + ${grams} <= "capacityGrams"
      AND ("capacityVolumeCm3" IS NULL OR "reservedVolumeCm3" + ${volumeCm3} <= "capacityVolumeCm3")`;
  return n === 1;
}

export type Participation = "SENDER" | "TRAVELER";

/** Charge une réservation en vérifiant que l'utilisateur y participe (anti-IDOR). */
export async function loadBookingFor(userId: string, bookingId: string, tx: Tx | typeof db = db) {
  const b = await tx.booking.findUnique({ where: { id: bookingId } });
  if (!b || (b.senderId !== userId && b.travelerId !== userId)) throw notFound();
  return { booking: b, role: (b.senderId === userId ? "SENDER" : "TRAVELER") as Participation };
}

export const holdsCapacity = (s: BookingStatus) => (CAPACITY_HOLDING_STATES as readonly string[]).includes(s);
