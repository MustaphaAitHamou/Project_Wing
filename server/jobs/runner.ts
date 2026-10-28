import "server-only";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger";
import { sendEmail } from "@/server/email/send";
import { issueCode } from "@/server/services/delivery";
import { notifyMatchesForParcel, notifyMatchesForTrip } from "@/server/services/matching";
import { releasePayout } from "@/server/payments/service";
import { getSetting } from "@/server/settings";
import { env } from "@/lib/env";
import type { TemplateName } from "@/emails/templates";

type Job = { id: string; type: string; payload: unknown; attempts: number; maxAttempts: number };

const handlers: Record<string, (p: Record<string, unknown>) => Promise<unknown>> = {
  "email.send": async (p) => {
    if (!(await getSetting("notifications.emailEnabled")) && p.template === "notification") return;
    await sendEmail(String(p.to), p.template as TemplateName, p.data as never);
  },
  "notification.email": async (p) => {
    if (!(await getSetting("notifications.emailEnabled"))) return;
    const u = await db.user.findUnique({ where: { id: String(p.userId) }, select: { email: true, firstName: true, emailVerified: true, status: true } });
    if (!u || !u.emailVerified || u.status !== "ACTIVE") return;
    await sendEmail(u.email, "notification", { name: u.firstName, title: String(p.title), body: String(p.body), url: p.link ? `${env.APP_URL}${p.link}` : undefined });
  },
  "otp.issue": async (p) => issueCode(String(p.bookingId), p.purpose as "PICKUP" | "DELIVERY"),
  "match.parcel": async (p) => notifyMatchesForParcel(String(p.parcelId)),
  "match.trip": async (p) => notifyMatchesForTrip(String(p.tripId)),
  "payout.release": async (p) => releasePayout(String(p.bookingId)),
};

/** Les payloads pouvant contenir des liens à jeton sont effacés après traitement. */
const REDACT_AFTER_DONE = new Set(["email.send"]);

/**
 * Traite les tâches dues. `FOR UPDATE SKIP LOCKED` permet à plusieurs workers de
 * tourner en parallèle sans traiter deux fois la même tâche. Échecs : nouvelle
 * tentative avec backoff exponentiel, puis statut FAILED après maxAttempts.
 */
export async function runDueJobs(limit = 20): Promise<{ processed: number; failed: number }> {
  // Récupère les tâches bloquées (worker interrompu) depuis plus de 10 minutes.
  await db.$executeRaw`UPDATE "job" SET status = 'PENDING', "lockedAt" = NULL WHERE status = 'PROCESSING' AND "lockedAt" < now() - interval '10 minutes'`;
  const jobs = await db.$queryRaw<Job[]>`
    UPDATE "job" SET status = 'PROCESSING', "lockedAt" = now(), attempts = attempts + 1, "updatedAt" = now()
    WHERE id IN (SELECT id FROM "job" WHERE status = 'PENDING' AND "runAt" <= now() ORDER BY "runAt" LIMIT ${limit} FOR UPDATE SKIP LOCKED)
    RETURNING id, type, payload, attempts, "maxAttempts"`;
  let failed = 0;
  for (const job of jobs) {
    const handler = handlers[job.type];
    try {
      if (!handler) throw new Error(`Type de tâche inconnu : ${job.type}`);
      await handler((job.payload ?? {}) as Record<string, unknown>);
      await db.job.update({ where: { id: job.id }, data: { status: "DONE", lockedAt: null, lastError: null, ...(REDACT_AFTER_DONE.has(job.type) ? { payload: { redacted: true } } : {}) } });
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      const final = job.attempts >= job.maxAttempts;
      await db.job.update({ where: { id: job.id }, data: { status: final ? "FAILED" : "PENDING", lockedAt: null, lastError: msg.slice(0, 1000), runAt: new Date(Date.now() + 2 ** job.attempts * 30_000) } });
      logger.error("job.failed", { jobId: job.id, type: job.type, attempt: job.attempts, final, error: msg });
    }
  }
  return { processed: jobs.length, failed };
}

/** Boucle jusqu'à épuisement (utile en test et après une action utilisateur). */
export async function drainJobs(max = 200) {
  let total = 0;
  for (let i = 0; i < 20 && total < max; i++) {
    const { processed } = await runDueJobs(20);
    total += processed;
    if (processed === 0) break;
  }
  return total;
}
