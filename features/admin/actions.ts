"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action } from "@/server/security/action";
import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { audit } from "@/server/audit";
import { deleteListing, setUserRole, setUserStatus } from "@/server/services/admin";
import { moderateParcel } from "@/server/services/parcels";
import { moderateTrip } from "@/server/services/trips";
import { cancelBooking } from "@/server/services/bookings";
import { createRefund, releasePayout } from "@/server/payments/service";
import { addDisputeMessage, assignDispute, closeDispute, requestInformation, resolveDispute, resolveDisputeSchema } from "@/server/services/disputes";
import { handleReport } from "@/server/services/reports";
import { moderateReview } from "@/server/services/reviews";
import { hideMessage } from "@/server/services/messaging";
import { SETTINGS, updateSetting, type SettingKey } from "@/server/settings";
import { idSchema, moneyInput } from "@/features/shared/schemas";
import { TRANSPORT_MODES } from "@/features/shared/schemas";
import { slugify } from "@/lib/domain/text";

const reason = z.string().trim().min(5, "Motif requis (5 caractères minimum)").max(500);
const done = (p = "/admin") => revalidatePath(p, "layout");

export const setUserStatusAction = action(z.object({ userId: idSchema, suspend: z.boolean(), reason }), async (d) => {
  const s = await requireStaff();
  await setUserStatus(s.id, d.userId, d.suspend, d.reason);
  done();
});

export const setUserRoleAction = action(z.object({ userId: idSchema, role: z.enum(["USER", "MODERATOR", "ADMIN"]), reason }), async (d) => {
  const s = await requireStaff("ADMIN");
  await setUserRole(s.id, d.userId, d.role, d.reason);
  done();
});

export const moderateListingAction = action(z.object({ kind: z.enum(["parcel", "trip"]), id: idSchema, op: z.enum(["approve", "suspend", "restore"]), note: z.string().max(500).optional() }), async (d) => {
  const s = await requireStaff();
  if (d.kind === "parcel") await moderateParcel(s.id, d.id, d.op, d.note);
  else if (d.op !== "approve") await moderateTrip(s.id, d.id, d.op, d.note);
  done();
});

export const deleteListingAction = action(z.object({ kind: z.enum(["parcel", "trip"]), id: idSchema, reason }), async (d) => {
  const s = await requireStaff("ADMIN");
  await deleteListing(s.id, d.kind, d.id, d.reason);
  done();
});

export const adminCancelBookingAction = action(z.object({ bookingId: idSchema, reason }), async (d) => {
  const s = await requireStaff("ADMIN");
  await cancelBooking(s.id, d.bookingId, d.reason, { asAdmin: true });
  done();
});

export const adminRefundAction = action(z.object({ paymentId: idSchema, amount: moneyInput("Montant", { min: 1 }), reason }), async (d) => {
  const s = await requireStaff("ADMIN");
  await createRefund(d.paymentId, d.amount, d.reason, s.id);
  done();
});

export const retryPayoutAction = action(z.object({ bookingId: idSchema }), async (d) => {
  const s = await requireStaff("ADMIN");
  const r = await releasePayout(d.bookingId);
  await audit({ actorId: s.id, action: "payout.retry", targetType: "Booking", targetId: d.bookingId, metadata: { result: r } });
  done();
  return { status: r };
});

export const assignDisputeAction = action(z.object({ disputeId: idSchema }), async (d) => {
  const s = await requireStaff();
  await assignDispute(s.id, d.disputeId);
  done();
});

export const disputeStaffMessageAction = action(z.object({ disputeId: idSchema, note: z.string().trim().min(2).max(4000), internal: z.boolean(), requestInfo: z.boolean() }), async (d) => {
  const s = await requireStaff();
  if (d.requestInfo) await requestInformation(s.id, d.disputeId, d.note);
  else await addDisputeMessage(s.id, d.disputeId, d.note, { isStaff: true, internal: d.internal });
  done();
});

export const resolveDisputeAction = action(resolveDisputeSchema.extend({ refundAmount: moneyInput("Montant").optional() }), async (d) => {
  const s = await requireStaff("ADMIN");
  await resolveDispute(s.id, d);
  done();
});

export const closeDisputeAction = action(z.object({ disputeId: idSchema, note: z.string().trim().max(1000) }), async (d) => {
  const s = await requireStaff();
  await closeDispute(s.id, d.disputeId, d.note);
  done();
});

export const handleReportAction = action(z.object({ reportId: idSchema, status: z.enum(["REVIEWED", "DISMISSED"]) }), async (d) => {
  const s = await requireStaff();
  await handleReport(s.id, d.reportId, d.status);
  done();
});

export const moderateReviewAction = action(z.object({ reviewId: idSchema, status: z.enum(["VISIBLE", "HIDDEN"]) }), async (d) => {
  const s = await requireStaff();
  await moderateReview(s.id, d.reviewId, d.status);
  done();
});

export const hideMessageAction = action(z.object({ messageId: idSchema, hidden: z.boolean() }), async (d) => {
  const s = await requireStaff();
  await hideMessage(s.id, d.messageId, d.hidden);
  done();
});

export const updateSettingAction = action(z.object({ key: z.string().refine((k) => k in SETTINGS, "Paramètre inconnu"), value: z.unknown() }), async (d) => {
  const s = await requireStaff("ADMIN");
  await updateSetting(d.key as SettingKey, d.value, s.id);
  done("/");
});

export const updateCorridorAction = action(z.object({ id: idSchema, status: z.enum(["DISABLED", "TEST_ONLY", "LIVE"]), allowedModes: z.array(z.enum(TRANSPORT_MODES)), maxWeightKg: z.coerce.number().min(0.5).max(100), notes: z.string().max(1000).optional(), confirmLegal: z.boolean() }), async (d) => {
  const s = await requireStaff("ADMIN");
  // Passage en LIVE : confirmation explicite que la validation juridique et opérationnelle est faite.
  if (d.status === "LIVE" && !d.confirmLegal) throw new (await import("@/server/security/errors")).AppError("VALIDATION", "Confirmez que la validation juridique et opérationnelle de ce corridor a été réalisée.");
  const before = await db.corridor.findUniqueOrThrow({ where: { id: d.id } });
  await db.corridor.update({ where: { id: d.id }, data: { status: d.status, allowedModes: d.allowedModes, maxWeightGrams: Math.round(d.maxWeightKg * 1000), notes: d.notes } });
  await audit({ actorId: s.id, action: "corridor.update", targetType: "Corridor", targetId: d.id, metadata: { before: { status: before.status, modes: before.allowedModes, max: before.maxWeightGrams }, after: { status: d.status, modes: d.allowedModes, max: d.maxWeightKg } } });
  done("/");
});

export const createCorridorAction = action(z.object({ originCountry: z.string().length(2), destCountry: z.string().length(2) }), async (d) => {
  const s = await requireStaff("ADMIN");
  const c = await db.corridor.create({ data: { originCountry: d.originCountry, destCountry: d.destCountry, status: "DISABLED", allowedModes: ["PLANE"] } });
  await audit({ actorId: s.id, action: "corridor.create", targetType: "Corridor", targetId: c.id, metadata: d });
  done();
});

export const updateCountryAction = action(z.object({ code: z.string().length(2), isActive: z.boolean(), payoutsEnabled: z.boolean(), confirmProvider: z.boolean() }), async (d) => {
  const s = await requireStaff("ADMIN");
  const before = await db.country.findUniqueOrThrow({ where: { code: d.code } });
  if (d.payoutsEnabled && !before.payoutsEnabled && !d.confirmProvider) throw new (await import("@/server/security/errors")).AppError("VALIDATION", "Confirmez que le prestataire de paiement prend effectivement en charge les versements vers ce pays.");
  await db.country.update({ where: { code: d.code }, data: { isActive: d.isActive, payoutsEnabled: d.payoutsEnabled } });
  await audit({ actorId: s.id, action: "country.update", targetType: "Country", targetId: d.code, metadata: { before: { isActive: before.isActive, payoutsEnabled: before.payoutsEnabled }, after: d } });
  done("/");
});

export const upsertCategoryAction = action(z.object({ id: idSchema.optional(), name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).optional(), isActive: z.boolean(), isProhibited: z.boolean(), requiresReview: z.boolean(), allowedModes: z.array(z.enum(TRANSPORT_MODES)), sortOrder: z.coerce.number().int().min(0).max(999) }), async (d) => {
  const s = await requireStaff("ADMIN");
  const data = { name: d.name, description: d.description || null, isActive: d.isActive, isProhibited: d.isProhibited, requiresReview: d.requiresReview, allowedModes: d.allowedModes, sortOrder: d.sortOrder };
  const c = d.id ? await db.parcelCategory.update({ where: { id: d.id }, data }) : await db.parcelCategory.create({ data: { ...data, slug: slugify(d.name) } });
  await audit({ actorId: s.id, action: d.id ? "category.update" : "category.create", targetType: "ParcelCategory", targetId: c.id, metadata: data });
  done("/");
});

export const upsertFaqAction = action(z.object({ id: idSchema.optional(), question: z.string().trim().min(5).max(300), answer: z.string().trim().min(5).max(4000), category: z.enum(["general", "expediteur", "voyageur", "securite"]), sortOrder: z.coerce.number().int().min(0).max(999), isPublished: z.boolean() }), async (d) => {
  const s = await requireStaff();
  const { id, ...data } = d;
  const f = id ? await db.faqItem.update({ where: { id }, data }) : await db.faqItem.create({ data });
  await audit({ actorId: s.id, action: id ? "faq.update" : "faq.create", targetType: "FaqItem", targetId: f.id });
  done("/");
});

export const deleteFaqAction = action(z.object({ id: idSchema }), async (d) => {
  const s = await requireStaff();
  await db.faqItem.delete({ where: { id: d.id } });
  await audit({ actorId: s.id, action: "faq.delete", targetType: "FaqItem", targetId: d.id });
  done("/");
});
