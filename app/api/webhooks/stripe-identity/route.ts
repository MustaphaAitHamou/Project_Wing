import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { applyKycDecision } from "@/server/kyc";
import { logger } from "@/server/logger";

export const runtime = "nodejs";

/** Webhook Stripe Identity : seul le statut de la session est utilisé, aucune donnée de document. */
export async function POST(req: Request) {
  if (env.KYC_PROVIDER !== "stripe_identity") return NextResponse.json({ error: "disabled" }, { status: 404 });
  const raw = await req.text();
  let ev: Stripe.Event;
  try {
    ev = new Stripe(env.STRIPE_SECRET_KEY!).webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", env.STRIPE_IDENTITY_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  try {
    if (ev.type === "identity.verification_session.verified") await applyKycDecision(ev.data.object.id, "VERIFIED");
    else if (ev.type === "identity.verification_session.requires_input") await applyKycDecision(ev.data.object.id, "REJECTED", ev.data.object.last_error?.code ?? "requires_input");
    return NextResponse.json({ received: true });
  } catch (e) {
    logger.error("webhook.identity.failed", { eventId: ev.id, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
