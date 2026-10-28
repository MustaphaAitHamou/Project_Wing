import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db/client";

export async function audit(
  entry: { actorId: string | null; action: string; targetType: string; targetId?: string | null; metadata?: Prisma.InputJsonValue; ip?: string | null },
  tx: Tx | typeof db = db,
) {
  await tx.auditLog.create({ data: { actorId: entry.actorId, action: entry.action, targetType: entry.targetType, targetId: entry.targetId ?? null, metadata: entry.metadata, ip: entry.ip ?? null } });
}
