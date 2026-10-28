import "server-only";
import { z } from "zod";
import type { NotificationType, Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db/client";
import { enqueue } from "@/server/jobs/queue";

/** Types pour lesquels l'utilisateur peut désactiver l'email. Les emails de sécurité ne sont pas désactivables. */
export const NOTIFICATION_PREF_TYPES = [
  { type: "NEW_MESSAGE", label: "Nouveaux messages" },
  { type: "NEW_PROPOSAL", label: "Nouvelles propositions" },
  { type: "PROPOSAL_ACCEPTED", label: "Propositions acceptées" },
  { type: "PROPOSAL_REJECTED", label: "Propositions refusées" },
  { type: "MATCHING_TRIP", label: "Nouveaux trajets compatibles" },
  { type: "MATCHING_PARCEL", label: "Nouveaux colis compatibles" },
  { type: "PAYMENT_RECEIVED", label: "Paiements" },
  { type: "PARCEL_PICKED_UP", label: "Colis récupéré" },
  { type: "PARCEL_DELIVERED", label: "Colis livré" },
  { type: "DISPUTE_OPENED", label: "Litiges" },
  { type: "REVIEW_RECEIVED", label: "Avis reçus" },
  { type: "BOOKING_UPDATED", label: "Mises à jour de réservation" },
] as const satisfies readonly { type: NotificationType; label: string }[];

export const notificationPrefsSchema = z.record(z.string(), z.object({ inApp: z.boolean(), email: z.boolean() }));
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export function resolvePref(prefs: unknown, type: NotificationType) {
  const parsed = notificationPrefsSchema.safeParse(prefs);
  const p = parsed.success ? parsed.data[type] : undefined;
  // Par défaut : tout activé, sauf l'email pour les messages (évite le spam, notification in-app conservée).
  return { inApp: p?.inApp ?? true, email: p?.email ?? type !== "NEW_MESSAGE" };
}

/**
 * Crée une notification interne et programme l'email correspondant si
 * l'utilisateur ne l'a pas désactivé. Appelée dans la transaction métier.
 */
export async function notify(tx: Tx | typeof db, n: { userId: string; type: NotificationType; title: string; body: string; link?: string; data?: Prisma.InputJsonValue }) {
  const profile = await tx.userProfile.findUnique({ where: { userId: n.userId }, select: { notificationPrefs: true } });
  const pref = resolvePref(profile?.notificationPrefs, n.type);
  if (pref.inApp || n.type === "SYSTEM") {
    await tx.notification.create({ data: { userId: n.userId, type: n.type, title: n.title, body: n.body, link: n.link, data: n.data } });
  }
  if (pref.email) await enqueue(tx, "notification.email", { userId: n.userId, title: n.title, body: n.body, link: n.link ?? null });
}

export async function listNotifications(userId: string, cursor?: string) {
  const items = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  return { items: items.slice(0, 20), nextCursor: items.length > 20 ? items[19]!.id : null };
}

export const unreadCount = (userId: string) => db.notification.count({ where: { userId, readAt: null } });

export async function markRead(userId: string, ids: string[] | "all") {
  await db.notification.updateMany({ where: { userId, readAt: null, ...(ids === "all" ? {} : { id: { in: ids } }) }, data: { readAt: new Date() } });
}

export async function updatePrefs(userId: string, prefs: NotificationPrefs) {
  await db.userProfile.upsert({ where: { userId }, create: { userId, notificationPrefs: prefs }, update: { notificationPrefs: prefs } });
}
