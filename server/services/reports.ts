import "server-only";
import { z } from "zod";
import { db } from "@/server/db/client";
import { rateLimit } from "@/server/security/rate-limit";
import { audit } from "@/server/audit";
import { notFound } from "@/server/security/errors";

export const reportSchema = z.object({
  targetType: z.enum(["USER", "PARCEL", "TRIP", "MESSAGE", "REVIEW"]),
  targetId: z.string().min(1).max(64),
  reason: z.enum(["fraud", "prohibited_item", "harassment", "spam", "fake_profile", "inappropriate", "other"]),
  details: z.string().trim().max(2000).optional(),
});
export const REPORT_REASON_LABELS = { fraud: "Fraude ou arnaque", prohibited_item: "Objet interdit", harassment: "Harcèlement", spam: "Spam", fake_profile: "Faux profil", inappropriate: "Contenu inapproprié", other: "Autre" } as const;

export async function createReport(userId: string, input: z.output<typeof reportSchema>) {
  await rateLimit(`report:${userId}`, 10, 3600);
  const exists =
    input.targetType === "USER" ? await db.user.count({ where: { id: input.targetId } })
    : input.targetType === "PARCEL" ? await db.parcel.count({ where: { id: input.targetId } })
    : input.targetType === "TRIP" ? await db.trip.count({ where: { id: input.targetId } })
    : input.targetType === "REVIEW" ? await db.review.count({ where: { id: input.targetId } })
    : await db.message.count({ where: { id: input.targetId, conversation: { participants: { some: { userId } } } } });
  if (!exists) throw notFound();
  await db.report.create({ data: { reporterId: userId, targetType: input.targetType, targetId: input.targetId, reason: input.reason, details: input.details } });
}

export async function handleReport(staffId: string, reportId: string, status: "REVIEWED" | "DISMISSED") {
  await db.report.update({ where: { id: reportId }, data: { status, handledById: staffId, handledAt: new Date() } });
  await audit({ actorId: staffId, action: `report.${status.toLowerCase()}`, targetType: "Report", targetId: reportId });
}
