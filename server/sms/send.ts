import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/server/logger";

export const smsAvailable = () => env.SMS_PROVIDER === "twilio";

/** Envoi SMS via l'API REST Twilio. Désactivé tant que SMS_PROVIDER=none. */
export async function sendSms(to: string, body: string): Promise<void> {
  if (env.SMS_PROVIDER !== "twilio") throw new Error("Aucun prestataire SMS configuré");
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: env.TWILIO_FROM!, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio HTTP ${res.status}`);
  logger.info("sms.sent", {});
}
