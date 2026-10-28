import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger";
import { templates, type TemplateName } from "@/emails/templates";

let resend: Resend | null = null;

/**
 * Envoie un email. En mode `outbox` (développement/test), aucun email ne quitte
 * le serveur : il est seulement enregistré dans EmailLog et visible sur /dev/mailbox.
 * En mode `resend`, le contenu n'est PAS conservé en base (il peut contenir des codes).
 */
export async function sendEmail<T extends TemplateName>(to: string, template: T, data: Parameters<(typeof templates)[T]>[0]) {
  const rendered = (templates[template] as (d: typeof data) => { subject: string; html: string; text: string })(data);
  if (env.EMAIL_PROVIDER === "resend") {
    resend ??= new Resend(env.RESEND_API_KEY);
    const { data: res, error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject: rendered.subject, html: rendered.html, text: rendered.text });
    if (error) throw new Error(`Resend: ${error.name}`);
    await db.emailLog.create({ data: { to, subject: rendered.subject, html: "", text: "", provider: "resend", providerId: res?.id ?? null, template } });
    logger.info("email.sent", { template, provider: "resend" });
    return;
  }
  await db.emailLog.create({ data: { to, subject: rendered.subject, html: rendered.html, text: rendered.text, provider: "outbox", template } });
  logger.info("email.outbox", { template });
}
