import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** Les routes cron exigent `Authorization: Bearer <CRON_SECRET>`. */
export function isCronAuthorized(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const given = Buffer.from(h);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
