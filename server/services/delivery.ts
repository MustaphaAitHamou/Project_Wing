import "server-only";
import { env } from "@/lib/env";
import { db } from "@/server/db/client";
import { generateOtp, generateQrToken, hashSecret, safeEqualHex, OTP_MAX_ATTEMPTS, OTP_MAX_SENDS, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_MINUTES } from "@/lib/domain/otp";
import { addDeliveryEvent, loadBookingFor, transition } from "@/server/services/booking-core";
import { sendEmail } from "@/server/email/send";
import { sendSms, smsAvailable } from "@/server/sms/send";
import { enqueue } from "@/server/jobs/queue";
import { notify } from "@/server/services/notifications";
import { rateLimit } from "@/server/security/rate-limit";
import { audit } from "@/server/audit";
import { conflict, forbidden, invalid, notFound } from "@/server/security/errors";
import type { VerificationPurpose } from "@/generated/prisma/client";

/**
 * Double confirmation par code à usage unique.
 * - PICKUP   : code envoyé à l'expéditeur, saisi par le voyageur lors de la remise.
 * - DELIVERY : code envoyé au destinataire, saisi par le voyageur lors de la livraison.
 * Les codes ne sont jamais stockés en clair (HMAC lié à la réservation et à l'étape),
 * expirent, ont un nombre d'essais limité et ne sont consommables qu'une fois.
 */
const fmt = (d: Date) => d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
const REQUIRED_STATUS: Record<VerificationPurpose, "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY"> = { PICKUP: "READY_FOR_PICKUP", DELIVERY: "OUT_FOR_DELIVERY" };

/** Job `otp.issue` : génère, enregistre (hash) et transmet un nouveau code. */
export async function issueCode(bookingId: string, purpose: VerificationPurpose) {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    include: { sender: { select: { email: true, firstName: true, phone: true } }, traveler: { select: { firstName: true } }, parcel: { include: { recipient: true } } },
  });
  if (!b || b.status !== REQUIRED_STATUS[purpose]) return { skipped: true };
  const code = generateOtp();
  const qrToken = generateQrToken();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES[purpose] * 60_000);
  const sendCount = (await db.deliveryVerification.count({ where: { bookingId, purpose } })) + 1;

  await db.$transaction(async (tx) => {
    await tx.deliveryVerification.updateMany({ where: { bookingId, purpose, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: new Date() } });
    await tx.deliveryVerification.create({
      data: { bookingId, purpose, codeHash: hashSecret(env.OTP_PEPPER, bookingId, purpose, code), qrTokenHash: hashSecret(env.OTP_PEPPER, bookingId, `${purpose}:qr`, qrToken), expiresAt, maxAttempts: OTP_MAX_ATTEMPTS, sendCount },
    });
    await addDeliveryEvent(tx, bookingId, purpose === "PICKUP" ? "PICKUP_CODE_SENT" : "DELIVERY_CODE_SENT", null, { channel: purpose === "PICKUP" ? "email_sender" : b.parcel.recipient?.email ? "email_recipient" : "email_sender_relay" });
  });

  if (purpose === "PICKUP") {
    await sendEmail(b.sender.email, "pickupCode", { name: b.sender.firstName, reference: b.reference, code, travelerName: b.traveler.firstName, expiresAt: fmt(expiresAt) });
    return { sent: true };
  }
  const r = b.parcel.recipient;
  if (r?.email) await sendEmail(r.email, "deliveryCode", { name: r.name, reference: b.reference, code, expiresAt: fmt(expiresAt) });
  if (r?.phone && smsAvailable()) await sendSms(r.phone, `Tamurt Sending : code de réception ${code} (colis ${b.reference}). A donner au voyageur uniquement a la remise du colis.`);
  if (!r?.email && !(r?.phone && smsAvailable())) {
    // Aucun canal direct vers le destinataire : l'expéditeur relaie le code au destinataire.
    await sendEmail(b.sender.email, "deliveryCode", { name: `${b.sender.firstName} (à transmettre à ${r?.name ?? "votre destinataire"})`, reference: b.reference, code, expiresAt: fmt(expiresAt) });
  }
  return { sent: true };
}

/** Vérification d'un code saisi ou d'un jeton QR scanné par le voyageur. */
export async function verifyCode(userId: string, bookingId: string, purpose: VerificationPurpose, input: { code?: string; qrToken?: string }) {
  const { booking, role } = await loadBookingFor(userId, bookingId);
  if (role !== "TRAVELER") throw forbidden("Seul le voyageur saisit ce code.");
  await rateLimit(`otp:${userId}:${bookingId}`, 10, 600);
  if (booking.status !== REQUIRED_STATUS[purpose])
    throw conflict(purpose === "PICKUP" ? "La remise n'est pas attendue à ce stade (déjà confirmée ou réservation non payée)." : "La livraison n'est pas attendue à ce stade.");
  if (input.code && !/^\d{6}$/.test(input.code)) throw invalid("Le code comporte 6 chiffres.");
  if (!input.code && !input.qrToken) throw invalid("Code manquant.");

  // Incrément atomique du compteur d'essais : refuse si expiré, consommé ou essais épuisés.
  const rows = await db.$queryRaw<{ id: string; codeHash: string; qrTokenHash: string; attempts: number; maxAttempts: number }[]>`
    UPDATE "delivery_verification" SET attempts = attempts + 1
    WHERE "bookingId" = ${bookingId} AND purpose = ${purpose}::"VerificationPurpose" AND "consumedAt" IS NULL AND "invalidatedAt" IS NULL
      AND "expiresAt" > now() AND attempts < "maxAttempts"
    RETURNING id, "codeHash", "qrTokenHash", attempts, "maxAttempts"`;
  const v = rows[0];
  if (!v) {
    const last = await db.deliveryVerification.findFirst({ where: { bookingId, purpose }, orderBy: { createdAt: "desc" } });
    if (last?.consumedAt) throw conflict("Ce code a déjà été utilisé.");
    if (last && last.attempts >= last.maxAttempts) throw forbidden("Nombre d'essais dépassé. Demandez un nouveau code.");
    if (last && last.expiresAt <= new Date()) throw forbidden("Ce code a expiré. Demandez un nouveau code.");
    throw notFound("Aucun code actif. Demandez l'envoi d'un code.");
  }
  const ok = input.qrToken
    ? safeEqualHex(v.qrTokenHash, hashSecret(env.OTP_PEPPER, bookingId, `${purpose}:qr`, input.qrToken))
    : safeEqualHex(v.codeHash, hashSecret(env.OTP_PEPPER, bookingId, purpose, input.code!));
  if (!ok) {
    await audit({ actorId: userId, action: `otp.${purpose.toLowerCase()}.failed`, targetType: "Booking", targetId: bookingId, metadata: { attempts: v.attempts } });
    const left = v.maxAttempts - v.attempts;
    throw invalid(left > 0 ? `Code incorrect. ${left} essai(s) restant(s).` : "Code incorrect. Nombre d'essais dépassé : demandez un nouveau code.");
  }

  await db.$transaction(async (tx) => {
    const consumed = await tx.deliveryVerification.updateMany({ where: { id: v.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (consumed.count !== 1) throw conflict("Ce code a déjà été utilisé.");
    const now = new Date();
    if (purpose === "PICKUP") {
      await transition(tx, bookingId, "PICKED_UP", { actor: "TRAVELER", actorId: userId, reason: input.qrToken ? "QR code" : "Code OTP", data: { pickedUpAt: now }, expectedFrom: "READY_FOR_PICKUP" });
      await tx.parcel.update({ where: { id: booking.parcelId }, data: { status: "IN_TRANSIT" } });
      await addDeliveryEvent(tx, bookingId, "PICKED_UP", userId, { method: input.qrToken ? "qr" : "otp" });
      await notify(tx, { userId: booking.senderId, type: "PARCEL_PICKED_UP", title: `Colis remis au voyageur — ${booking.reference}`, body: "La remise a été confirmée par code. Suivez le transport depuis votre tableau de bord.", link: `/tableau-de-bord/reservations/${bookingId}` });
    } else {
      await transition(tx, bookingId, "DELIVERED", { actor: "TRAVELER", actorId: userId, reason: input.qrToken ? "QR code" : "Code OTP", data: { deliveredAt: now }, expectedFrom: "OUT_FOR_DELIVERY" });
      await tx.parcel.update({ where: { id: booking.parcelId }, data: { status: "DELIVERED" } });
      await addDeliveryEvent(tx, bookingId, "DELIVERED", userId, { method: input.qrToken ? "qr" : "otp" });
      await notify(tx, { userId: booking.senderId, type: "PARCEL_DELIVERED", title: `Colis livré — ${booking.reference}`, body: "Le destinataire a confirmé la réception par code. Confirmez la bonne livraison ou signalez un problème.", link: `/tableau-de-bord/reservations/${bookingId}` });
    }
    await audit({ actorId: userId, action: `otp.${purpose.toLowerCase()}.confirmed`, targetType: "Booking", targetId: bookingId }, tx);
  });
}

/** Renvoi d'un nouveau code (l'ancien est invalidé). Limité en nombre et en fréquence. */
export async function resendCode(userId: string, bookingId: string, purpose: VerificationPurpose) {
  const { booking } = await loadBookingFor(userId, bookingId);
  if (booking.status !== REQUIRED_STATUS[purpose]) throw conflict("Aucun code n'est attendu à ce stade.");
  const last = await db.deliveryVerification.findFirst({ where: { bookingId, purpose }, orderBy: { createdAt: "desc" } });
  const count = await db.deliveryVerification.count({ where: { bookingId, purpose } });
  if (count >= OTP_MAX_SENDS) throw forbidden("Nombre maximal d'envois atteint. Ouvrez un signalement pour que le support vous aide.");
  if (last && Date.now() - last.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) throw conflict("Patientez une minute avant de redemander un code.");
  await enqueue(db, "otp.issue", { bookingId, purpose }, { dedupeKey: `otp:${purpose}:${bookingId}:${count + 1}` });
  await audit({ actorId: userId, action: `otp.${purpose.toLowerCase()}.resend`, targetType: "Booking", targetId: bookingId });
}

/**
 * QR code de remise affiché par l'expéditeur : génère un nouveau jeton pour le code actif.
 * Le jeton n'est retourné qu'à l'expéditeur authentifié et n'est stocké que haché.
 */
export async function rotatePickupQr(userId: string, bookingId: string) {
  const { booking, role } = await loadBookingFor(userId, bookingId);
  if (role !== "SENDER") throw forbidden();
  if (booking.status !== "READY_FOR_PICKUP") throw conflict("Le QR code de remise n'est disponible qu'avant la remise du colis.");
  const v = await db.deliveryVerification.findFirst({ where: { bookingId, purpose: "PICKUP", consumedAt: null, invalidatedAt: null, expiresAt: { gt: new Date() } } });
  if (!v) throw notFound("Aucun code actif : demandez un nouveau code.");
  const token = generateQrToken();
  await db.deliveryVerification.update({ where: { id: v.id }, data: { qrTokenHash: hashSecret(env.OTP_PEPPER, bookingId, "PICKUP:qr", token) } });
  return { url: `${env.APP_URL}/scan?b=${bookingId}&p=PICKUP#${token}`, expiresAt: v.expiresAt };
}

export async function verificationState(bookingId: string, purpose: VerificationPurpose) {
  const v = await db.deliveryVerification.findFirst({ where: { bookingId, purpose }, orderBy: { createdAt: "desc" } });
  const sends = await db.deliveryVerification.count({ where: { bookingId, purpose } });
  if (!v) return null;
  return { expiresAt: v.expiresAt, attemptsLeft: Math.max(0, v.maxAttempts - v.attempts), consumed: !!v.consumedAt, active: !v.consumedAt && !v.invalidatedAt && v.expiresAt > new Date(), sendsLeft: Math.max(0, OTP_MAX_SENDS - sends) };
}
