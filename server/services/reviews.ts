import "server-only";
import { z } from "zod";
import { db } from "@/server/db/client";
import { loadBookingFor } from "@/server/services/booking-core";
import { notify } from "@/server/services/notifications";
import { audit } from "@/server/audit";
import { conflict, notFound } from "@/server/security/errors";
import { Prisma } from "@/generated/prisma/client";

export const reviewSchema = z.object({
  bookingId: z.string().min(1).max(64),
  rating: z.coerce.number().int().min(1, "Note entre 1 et 5").max(5, "Note entre 1 et 5"),
  comment: z.string().trim().max(1000).transform((s) => s || undefined).optional(),
});

/**
 * Avis réciproque. Conditions : réservation terminée (COMPLETED), auteur participant,
 * un seul avis par auteur et par réservation (contrainte unique), jamais sur soi-même
 * (contrainte CHECK). La note moyenne est mise à jour dans la même transaction.
 */
export async function createReview(userId: string, input: z.output<typeof reviewSchema>) {
  const { booking, role } = await loadBookingFor(userId, input.bookingId);
  if (booking.status !== "COMPLETED") throw conflict("Vous pourrez laisser un avis une fois la transaction terminée.");
  const subjectId = role === "SENDER" ? booking.travelerId : booking.senderId;
  try {
    await db.$transaction(async (tx) => {
      await tx.review.create({ data: { bookingId: booking.id, authorId: userId, subjectId, rating: input.rating, comment: input.comment } });
      await tx.userProfile.upsert({ where: { userId: subjectId }, create: { userId: subjectId, ratingSum: input.rating, ratingCount: 1 }, update: { ratingSum: { increment: input.rating }, ratingCount: { increment: 1 } } });
      await notify(tx, { userId: subjectId, type: "REVIEW_RECEIVED", title: "Vous avez reçu un avis", body: `${input.rating}/5${input.comment ? ` — « ${input.comment.slice(0, 100)} »` : ""}`, link: `/profil/${subjectId}` });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw conflict("Vous avez déjà laissé un avis pour cette transaction.");
    throw e;
  }
}

export async function listReviewsFor(userId: string, take = 20) {
  return db.review.findMany({ where: { subjectId: userId, status: "VISIBLE" }, orderBy: { createdAt: "desc" }, take, include: { author: { select: { firstName: true, image: true } } } });
}

/** Modération : masquer un avis abusif recalcule l'agrégat. */
export async function moderateReview(staffId: string, reviewId: string, status: "VISIBLE" | "HIDDEN") {
  await db.$transaction(async (tx) => {
    const r = await tx.review.findUnique({ where: { id: reviewId } });
    if (!r) throw notFound();
    if (r.status === status) return;
    await tx.review.update({ where: { id: reviewId }, data: { status } });
    const wasCounted = r.status !== "HIDDEN";
    const counted = status !== "HIDDEN";
    if (wasCounted !== counted)
      await tx.userProfile.update({ where: { userId: r.subjectId }, data: counted ? { ratingSum: { increment: r.rating }, ratingCount: { increment: 1 } } : { ratingSum: { decrement: r.rating }, ratingCount: { decrement: 1 } } });
    await audit({ actorId: staffId, action: `review.${status.toLowerCase()}`, targetType: "Review", targetId: reviewId }, tx);
  });
}

/** Profil public : aucune donnée privée (ni email, ni téléphone, ni nom de famille complet). */
export async function getPublicProfile(userId: string) {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, image: true, createdAt: true, status: true, profile: { select: { bio: true, city: true, kycStatus: true, ratingSum: true, ratingCount: true, deliveriesCount: true, shipmentsCount: true } } },
  });
  if (!u || u.status !== "ACTIVE") return null;
  const [reviews, trips] = await Promise.all([
    listReviewsFor(userId, 10),
    db.trip.findMany({ where: { travelerId: userId, status: "PUBLISHED" }, include: { originCity: true, destCity: true }, orderBy: { departureDate: "asc" }, take: 6 }),
  ]);
  return { id: u.id, displayName: `${u.firstName} ${u.lastName.slice(0, 1)}.`, firstName: u.firstName, image: u.image, memberSince: u.createdAt, profile: u.profile, reviews, trips };
}
