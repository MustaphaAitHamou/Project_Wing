import "server-only";
import { db } from "@/server/db/client";
import { AppError } from "./errors";

/**
 * Limiteur à fenêtre fixe stocké dans PostgreSQL : cohérent entre plusieurs
 * instances, sans dépendance supplémentaire. Upsert atomique.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit_bucket" ("key", "windowStart", "count") VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "rate_limit_bucket"."count" + 1
    RETURNING "count"`;
  if ((rows[0]?.count ?? 0) > limit) throw new AppError("RATE_LIMITED", "Trop de tentatives. Patientez quelques instants avant de réessayer.");
}

export async function purgeRateLimitBuckets(olderThanHours = 24) {
  await db.rateLimitBucket.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - olderThanHours * 3600_000) } } });
}
