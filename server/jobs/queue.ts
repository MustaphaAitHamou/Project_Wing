import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db/client";

export type JobType = "email.send" | "otp.issue" | "match.parcel" | "match.trip" | "payout.release" | "notification.email";

/** Ajoute une tâche dans la même transaction que l'opération métier (pattern outbox). */
export async function enqueue(tx: Tx | typeof db, type: JobType, payload: Prisma.InputJsonValue, opts: { dedupeKey?: string; runAt?: Date } = {}) {
  if (opts.dedupeKey) {
    await tx.job.upsert({ where: { dedupeKey: opts.dedupeKey }, create: { type, payload, dedupeKey: opts.dedupeKey, runAt: opts.runAt }, update: {} });
    return;
  }
  await tx.job.create({ data: { type, payload, runAt: opts.runAt } });
}
