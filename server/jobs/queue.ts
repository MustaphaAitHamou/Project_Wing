import "server-only";
import { after } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db/client";

export type JobType = "email.send" | "otp.issue" | "match.parcel" | "match.trip" | "payout.release" | "notification.email";

/**
 * Demande le traitement de la file juste après l'envoi de la réponse HTTP (transaction
 * déjà validée). Hors requête (tests, scripts), sans effet : le worker ou le cron prend le relais.
 */
function kick() {
  try {
    // Plusieurs appels dans une même requête sont sans risque : SKIP LOCKED évite les doublons.
    after(async () => {
      const { drainJobs } = await import("./runner");
      await drainJobs(50).catch(() => undefined);
    });
  } catch {
    // Pas de contexte de requête.
  }
}

/** Ajoute une tâche dans la même transaction que l'opération métier (pattern outbox). */
export async function enqueue(tx: Tx | typeof db, type: JobType, payload: Prisma.InputJsonValue, opts: { dedupeKey?: string; runAt?: Date } = {}) {
  if (opts.dedupeKey) await tx.job.upsert({ where: { dedupeKey: opts.dedupeKey }, create: { type, payload, dedupeKey: opts.dedupeKey, runAt: opts.runAt }, update: {} });
  else await tx.job.create({ data: { type, payload, runAt: opts.runAt } });
  kick();
}
