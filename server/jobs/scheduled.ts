import "server-only";
import { expireParcels } from "@/server/services/parcels";
import { expireTrips } from "@/server/services/trips";
import { autoCompleteDelivered } from "@/server/services/bookings";
import { expireOldVerifications } from "@/server/kyc";
import { purgeRateLimitBuckets } from "@/server/security/rate-limit";
import { db } from "@/server/db/client";
import { releasePayout } from "@/server/payments/service";

/** Tâches périodiques (appelées par /api/cron/maintenance, toutes les heures conseillé). */
export async function runMaintenance() {
  const [parcels, trips, completed, kyc] = await Promise.all([expireParcels(), expireTrips(), autoCompleteDelivered(), expireOldVerifications()]);
  await purgeRateLimitBuckets();
  // Nouvel essai des versements bloqués (ex. compte de versement configuré depuis).
  const blocked = await db.payout.findMany({ where: { status: "BLOCKED" }, select: { bookingId: true }, take: 100 });
  for (const p of blocked) await releasePayout(p.bookingId).catch(() => undefined);
  // Rétention : tâches terminées > 30 j, emails de dev > 30 j.
  await db.job.deleteMany({ where: { status: "DONE", updatedAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } });
  await db.emailLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } });
  return { parcels, trips, completed, kyc, payoutsRetried: blocked.length };
}
