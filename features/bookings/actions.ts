"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action } from "@/server/security/action";
import { requireUser } from "@/server/auth/session";
import { cancelBooking, completeBooking, markArrived, markInTransit } from "@/server/services/bookings";
import { resendCode, rotatePickupQr, verifyCode } from "@/server/services/delivery";
import { startCheckout } from "@/server/payments/service";
import { rateLimit } from "@/server/security/rate-limit";
import { idSchema } from "@/features/shared/schemas";

const id = z.object({ bookingId: idSchema });
const refresh = (bookingId: string) => revalidatePath(`/tableau-de-bord/reservations/${bookingId}`);

export const payBookingAction = action(id, async ({ bookingId }) => {
  const user = await requireUser();
  await rateLimit(`checkout:${user.id}`, 10, 600);
  return startCheckout(user.id, bookingId);
});

export const cancelBookingAction = action(id.extend({ reason: z.string().trim().min(5, "Indiquez un motif (5 caractères minimum)").max(500) }), async ({ bookingId, reason }) => {
  const user = await requireUser();
  await cancelBooking(user.id, bookingId, reason);
  refresh(bookingId);
});

export const verifyCodeAction = action(id.extend({ purpose: z.enum(["PICKUP", "DELIVERY"]), code: z.string().trim().regex(/^\d{6}$/, "Le code comporte 6 chiffres").optional(), qrToken: z.string().max(100).optional() }), async ({ bookingId, purpose, code, qrToken }) => {
  const user = await requireUser();
  await verifyCode(user.id, bookingId, purpose, { code, qrToken });
  refresh(bookingId);
});

export const resendCodeAction = action(id.extend({ purpose: z.enum(["PICKUP", "DELIVERY"]) }), async ({ bookingId, purpose }) => {
  const user = await requireUser();
  await resendCode(user.id, bookingId, purpose);
  refresh(bookingId);
});

export const pickupQrAction = action(id, async ({ bookingId }) => {
  const user = await requireUser();
  const { url, expiresAt } = await rotatePickupQr(user.id, bookingId);
  const QRCode = (await import("qrcode")).default;
  return { svg: await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }), expiresAt: expiresAt.toISOString() };
});

export const markInTransitAction = action(id, async ({ bookingId }) => {
  const user = await requireUser();
  await markInTransit(user.id, bookingId);
  refresh(bookingId);
});

export const markArrivedAction = action(id, async ({ bookingId }) => {
  const user = await requireUser();
  await markArrived(user.id, bookingId);
  refresh(bookingId);
});

export const confirmReceiptAction = action(id, async ({ bookingId }) => {
  const user = await requireUser();
  await completeBooking(user.id, bookingId, "SENDER");
  refresh(bookingId);
});
