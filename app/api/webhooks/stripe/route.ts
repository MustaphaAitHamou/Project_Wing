import { NextResponse } from "next/server";
import { stripeProvider } from "@/server/payments/stripe";
import { handleProviderEvent } from "@/server/payments/service";
import { env } from "@/lib/env";
import { logger } from "@/server/logger";

export const runtime = "nodejs";

/**
 * Webhook Stripe (paiements, remboursements, comptes Connect).
 * Signature vérifiée sur le corps brut ; traitement idempotent (PaymentEvent unique).
 * Une erreur renvoie 500 : Stripe réessaie automatiquement.
 */
export async function POST(req: Request) {
  if (env.PAYMENT_PROVIDER !== "stripe" || !env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "stripe disabled" }, { status: 404 });
  const raw = await req.text();
  let ev;
  try {
    ev = await stripeProvider.parseWebhook(raw, req.headers);
  } catch {
    logger.warn("webhook.stripe.bad_signature", {});
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  try {
    const r = await handleProviderEvent("stripe", ev, JSON.parse(raw));
    return NextResponse.json({ received: true, duplicate: r.duplicate });
  } catch (e) {
    logger.error("webhook.stripe.processing_failed", { eventId: ev.id, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
