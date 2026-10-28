import "server-only";
import { z } from "zod";
import { Prisma, type Role } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import { audit } from "@/server/audit";
import { conflict, forbidden, notFound } from "@/server/security/errors";

export const periodSchema = z.enum(["7", "30", "90", "365"]).catch("30");

/** Indicateurs réels calculés en base pour la période. */
export async function dashboardStats(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [users, newUsers, verified, activeParcels, activeTrips, bookings, completed, volume, commissions, pendingPayouts, openDisputes, openReports, pendingReview] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.userProfile.count({ where: { kycStatus: "VERIFIED" } }),
    db.parcel.count({ where: { status: "PUBLISHED" } }),
    db.trip.count({ where: { status: { in: ["PUBLISHED", "FULL"] } } }),
    db.booking.count({ where: { createdAt: { gte: since } } }),
    db.booking.count({ where: { status: "COMPLETED", completedAt: { gte: since } } }),
    db.payment.aggregate({ where: { succeededAt: { gte: since } }, _sum: { amount: true, amountRefunded: true }, _count: true }),
    db.commission.aggregate({ where: { status: "EARNED", updatedAt: { gte: since } }, _sum: { amount: true } }),
    db.payout.aggregate({ where: { status: { in: ["PENDING", "BLOCKED", "PROCESSING", "FAILED"] } }, _sum: { amount: true }, _count: true }),
    db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_FOR_INFORMATION"] } } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.parcel.count({ where: { status: "PENDING_REVIEW" } }),
  ]);
  const series = await db.$queryRaw<{ day: Date; users: bigint; bookings: bigint }[]>`
    SELECT d::date AS day,
      (SELECT COUNT(*) FROM "user" u WHERE u."createdAt"::date = d::date)::bigint AS users,
      (SELECT COUNT(*) FROM "booking" b WHERE b."createdAt"::date = d::date)::bigint AS bookings
    FROM generate_series(${since}::date, CURRENT_DATE, interval '1 day') d ORDER BY d`;
  return {
    users, newUsers, verified, activeParcels, activeTrips, bookings, completed,
    volume: (volume._sum.amount ?? 0) - (volume._sum.amountRefunded ?? 0), payments: volume._count,
    commissions: commissions._sum.amount ?? 0, pendingPayouts: { amount: pendingPayouts._sum.amount ?? 0, count: pendingPayouts._count },
    openDisputes, openReports, pendingReview,
    series: series.map((s) => ({ day: s.day.toISOString().slice(0, 10), users: Number(s.users), bookings: Number(s.bookings) })),
  };
}

export async function searchUsers(q: string, page = 1) {
  const where: Prisma.UserWhereInput = q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { id: q }] } : {};
  const [items, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 25, skip: (page - 1) * 25, select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, emailVerified: true, createdAt: true, twoFactorEnabled: true, profile: { select: { kycStatus: true, ratingSum: true, ratingCount: true } } } }),
    db.user.count({ where }),
  ]);
  return { items, total };
}

export async function getUserAdmin(id: string) {
  const u = await db.user.findUnique({
    where: { id },
    include: {
      profile: true,
      identityChecks: { orderBy: { createdAt: "desc" }, take: 5 },
      parcels: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, title: true, status: true, createdAt: true } },
      trips: { orderBy: { createdAt: "desc" }, take: 10, include: { originCity: true, destCity: true } },
      payoutAccounts: true,
    },
  });
  if (!u) return null;
  const [bookings, logs, reports] = await Promise.all([
    db.booking.findMany({ where: { OR: [{ senderId: id }, { travelerId: id }] }, orderBy: { createdAt: "desc" }, take: 15, select: { id: true, reference: true, status: true, createdAt: true, senderId: true } }),
    db.auditLog.findMany({ where: { OR: [{ targetId: id }, { actorId: id }] }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.report.findMany({ where: { targetType: "USER", targetId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return { ...u, bookings, logs, reports };
}

export async function setUserStatus(actorId: string, userId: string, suspend: boolean, reason: string) {
  if (actorId === userId) throw forbidden("Vous ne pouvez pas modifier votre propre statut.");
  await db.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId } });
    if (!u) throw notFound();
    if (u.role === "ADMIN" && suspend) {
      const admins = await tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      if (admins <= 1) throw conflict("Impossible de suspendre le dernier administrateur.");
    }
    await tx.user.update({ where: { id: userId }, data: { status: suspend ? "SUSPENDED" : "ACTIVE", suspendedReason: suspend ? reason : null } });
    if (suspend) {
      await tx.session.deleteMany({ where: { userId } });
      await tx.parcel.updateMany({ where: { senderId: userId, status: { in: ["PUBLISHED", "PENDING_REVIEW"] } }, data: { status: "SUSPENDED", moderationNote: "Compte suspendu" } });
      await tx.trip.updateMany({ where: { travelerId: userId, status: { in: ["PUBLISHED", "FULL"] } }, data: { status: "SUSPENDED", moderationNote: "Compte suspendu" } });
      await tx.proposal.updateMany({ where: { status: "PENDING", OR: [{ authorId: userId }, { travelerId: userId }] }, data: { status: "EXPIRED" } });
    }
    await audit({ actorId, action: suspend ? "user.suspend" : "user.reactivate", targetType: "User", targetId: userId, metadata: { reason } }, tx);
  });
}

/** Changement de rôle : réservé aux administrateurs, jamais sur soi-même, toujours audité. */
export async function setUserRole(actorId: string, userId: string, role: Role, reason: string) {
  if (actorId === userId) throw forbidden("Vous ne pouvez pas modifier votre propre rôle.");
  await db.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId } });
    if (!u) throw notFound();
    if (u.role === "ADMIN" && role !== "ADMIN" && (await tx.user.count({ where: { role: "ADMIN" } })) <= 1) throw conflict("Il doit rester au moins un administrateur.");
    await tx.user.update({ where: { id: userId }, data: { role } });
    await tx.session.deleteMany({ where: { userId } });
    await audit({ actorId, action: "user.role_change", targetType: "User", targetId: userId, metadata: { from: u.role, to: role, reason } }, tx);
  });
}

export async function listListings(kind: "parcels" | "trips", status: string | undefined, q: string, page = 1) {
  if (kind === "parcels") {
    const where: Prisma.ParcelWhereInput = { ...(status ? { status: status as never } : {}), ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { id: q }, { sender: { email: { contains: q, mode: "insensitive" } } }] } : {}) };
    const [items, total] = await Promise.all([db.parcel.findMany({ where, orderBy: { createdAt: "desc" }, take: 25, skip: (page - 1) * 25, include: { originCity: true, destCity: true, category: true, sender: { select: { id: true, email: true, firstName: true } } } }), db.parcel.count({ where })]);
    return { kind, items, total } as const;
  }
  const where: Prisma.TripWhereInput = { ...(status ? { status: status as never } : {}), ...(q ? { OR: [{ id: q }, { traveler: { email: { contains: q, mode: "insensitive" } } }] } : {}) };
  const [items, total] = await Promise.all([db.trip.findMany({ where, orderBy: { createdAt: "desc" }, take: 25, skip: (page - 1) * 25, include: { originCity: true, destCity: true, traveler: { select: { id: true, email: true, firstName: true } } } }), db.trip.count({ where })]);
  return { kind, items, total } as const;
}

/** Suppression définitive encadrée : uniquement annonces sans réservation, motif obligatoire, auditée. */
export async function deleteListing(actorId: string, kind: "parcel" | "trip", id: string, reason: string) {
  await db.$transaction(async (tx) => {
    const bookings = await tx.booking.count({ where: kind === "parcel" ? { parcelId: id } : { tripId: id } });
    if (bookings > 0) throw conflict("Cette annonce est liée à des réservations : suspendez-la plutôt que de la supprimer (conservation des preuves).");
    if (kind === "parcel") await tx.parcel.delete({ where: { id } });
    else await tx.trip.delete({ where: { id } });
    await audit({ actorId, action: `${kind}.delete`, targetType: kind === "parcel" ? "Parcel" : "Trip", targetId: id, metadata: { reason } }, tx);
  });
}

export async function listPayments(status: string | undefined, page = 1) {
  const where: Prisma.PaymentWhereInput = status ? { status: status as never } : {};
  const [items, total] = await Promise.all([db.payment.findMany({ where, orderBy: { createdAt: "desc" }, take: 30, skip: (page - 1) * 30, include: { booking: { select: { id: true, reference: true, platformFee: true } }, refunds: true } }), db.payment.count({ where })]);
  return { items, total };
}

export async function listPayouts(status: string | undefined) {
  return db.payout.findMany({ where: status ? { status: status as never } : {}, orderBy: { createdAt: "desc" }, take: 50, include: { booking: { select: { id: true, reference: true } }, traveler: { select: { id: true, email: true } } } });
}

export async function transactionsCsv(from: Date, to: Date) {
  const rows = await db.booking.findMany({ where: { createdAt: { gte: from, lte: to } }, orderBy: { createdAt: "asc" }, include: { payments: { where: { succeededAt: { not: null } } }, payout: true, commission: true } });
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // Neutralise l'injection de formules dans les tableurs.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const header = ["reference", "date", "statut", "devise", "prix_transport", "commission", "net_voyageur", "total_debite", "paiement_statut", "rembourse", "versement_statut", "commission_statut"];
  const lines = rows.map((b) => [b.reference, b.createdAt.toISOString(), b.status, b.currency, b.transportPrice / 100, b.platformFee / 100, b.travelerNet / 100, b.totalCharged / 100, b.payments[0]?.status ?? "", (b.payments[0]?.amountRefunded ?? 0) / 100, b.payout?.status ?? "", b.commission?.status ?? ""].map(esc).join(";"));
  return "﻿" + [header.join(";"), ...lines].join("\n");
}

export async function listAudit(filter: { action?: string; actorId?: string; targetId?: string }, page = 1) {
  const where: Prisma.AuditLogWhereInput = { ...(filter.action ? { action: { contains: filter.action } } : {}), ...(filter.actorId ? { actorId: filter.actorId } : {}), ...(filter.targetId ? { targetId: filter.targetId } : {}) };
  const [items, total] = await Promise.all([db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50, include: { actor: { select: { email: true } } } }), db.auditLog.count({ where })]);
  return { items, total };
}
