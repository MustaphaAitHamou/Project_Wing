import { createHmac, randomInt, randomBytes, timingSafeEqual } from "node:crypto";

/** OTP à 6 chiffres tiré d'un CSPRNG. */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Jeton QR opaque (256 bits). */
export function generateQrToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Hash HMAC-SHA256 lié à la réservation et à l'étape : un code ne peut pas être rejoué ailleurs. */
export function hashSecret(pepper: string, bookingId: string, purpose: string, secret: string): string {
  return createHmac("sha256", pepper).update(`${bookingId}:${purpose}:${secret}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const OTP_TTL_MINUTES = { PICKUP: 72 * 60, DELIVERY: 24 * 60 } as const;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 3;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
