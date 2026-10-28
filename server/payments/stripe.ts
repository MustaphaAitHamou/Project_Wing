import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
import type { NormalizedEvent, PaymentProvider } from "./types";

let client: Stripe | null = null;
const stripe = () => (client ??= new Stripe(env.STRIPE_SECRET_KEY!, { appInfo: { name: "Tamurt Sending" } }));

/**
 * Stripe Connect, modèle « charges et transferts séparés » :
 * - l'expéditeur paie via Stripe Checkout sur le compte plateforme ;
 * - après livraison confirmée, un Transfer est émis vers le compte connecté (Express)
 *   du transporteur, lié à la charge d'origine (source_transaction).
 * Les fonds restent chez Stripe : Tamurt Sending ne détient jamais l'argent elle-même.
 * La disponibilité des transferts dépend du pays du compte connecté (voir docs/PAYMENTS.md).
 */
export const stripeProvider: PaymentProvider = {
  name: "stripe",
  label: "Stripe",
  isSandbox: env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? true,
  async createCheckout(a) {
    const s = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        customer_email: a.customerEmail,
        line_items: [{ quantity: 1, price_data: { currency: a.currency.toLowerCase(), unit_amount: a.amount, product_data: { name: `Transport de colis — ${a.reference}`, description: a.description } } }],
        payment_intent_data: { transfer_group: a.reference, metadata: { paymentId: a.paymentId, bookingId: a.bookingId } },
        metadata: { paymentId: a.paymentId, bookingId: a.bookingId },
        success_url: a.successUrl,
        cancel_url: a.cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
      { idempotencyKey: a.idempotencyKey },
    );
    return { sessionId: s.id, url: s.url! };
  },
  async expireCheckout(sessionId) {
    try {
      await stripe().checkout.sessions.expire(sessionId);
    } catch {
      // Déjà expirée ou complétée : sans effet.
    }
  },
  async refund(a) {
    const r = await stripe().refunds.create({ payment_intent: a.providerPaymentId, amount: a.amount, metadata: { reason: a.reason ?? "" } }, { idempotencyKey: a.idempotencyKey });
    return { providerRefundId: r.id, status: r.status === "succeeded" ? "SUCCEEDED" : r.status === "failed" || r.status === "canceled" ? "FAILED" : "PENDING" };
  },
  async transfer(a) {
    let sourceCharge: string | undefined;
    if (a.sourcePaymentId) {
      const pi = await stripe().paymentIntents.retrieve(a.sourcePaymentId);
      sourceCharge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
    }
    const t = await stripe().transfers.create(
      { amount: a.amount, currency: a.currency.toLowerCase(), destination: a.destinationAccountId, transfer_group: a.transferGroup, source_transaction: sourceCharge },
      { idempotencyKey: a.idempotencyKey },
    );
    return { transferId: t.id };
  },
  async createPayoutAccount(a) {
    const acct = await stripe().accounts.create({ type: "express", country: a.country, email: a.email, capabilities: { transfers: { requested: true } }, business_type: "individual", metadata: { userId: a.userId } });
    return { accountId: acct.id };
  },
  async payoutOnboardingLink(a) {
    const l = await stripe().accountLinks.create({ account: a.accountId, return_url: a.returnUrl, refresh_url: a.refreshUrl, type: "account_onboarding" });
    return l.url;
  },
  async parseWebhook(rawBody, headers) {
    const sig = headers.get("stripe-signature");
    if (!sig) throw new Error("Signature manquante");
    const ev = stripe().webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET!);
    switch (ev.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = ev.data.object;
        if (s.payment_status !== "paid") return { id: ev.id, type: "ignored", rawType: `${ev.type}:${s.payment_status}` };
        return { id: ev.id, type: "checkout.completed", sessionId: s.id, providerPaymentId: typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null), amount: s.amount_total ?? 0, currency: (s.currency ?? "").toUpperCase(), paymentId: s.metadata?.paymentId ?? null };
      }
      case "checkout.session.expired":
        return { id: ev.id, type: "checkout.expired", sessionId: ev.data.object.id, paymentId: ev.data.object.metadata?.paymentId ?? null };
      case "checkout.session.async_payment_failed":
        return { id: ev.id, type: "payment.failed", providerPaymentId: String(ev.data.object.payment_intent ?? ""), paymentId: ev.data.object.metadata?.paymentId ?? null, reason: "async_payment_failed" };
      case "payment_intent.payment_failed": {
        const pi = ev.data.object;
        return { id: ev.id, type: "payment.failed", providerPaymentId: pi.id, paymentId: pi.metadata?.paymentId ?? null, reason: pi.last_payment_error?.code ?? "payment_failed" };
      }
      case "refund.updated":
      case "refund.created": {
        const r = ev.data.object;
        return { id: ev.id, type: "refund.updated", providerRefundId: r.id, status: r.status === "succeeded" ? "SUCCEEDED" : r.status === "failed" || r.status === "canceled" ? "FAILED" : "PENDING" };
      }
      case "account.updated": {
        const a = ev.data.object;
        return { id: ev.id, type: "account.updated", providerAccountId: a.id, payoutsEnabled: !!a.payouts_enabled && a.capabilities?.transfers === "active" };
      }
      default:
        return { id: ev.id, type: "ignored", rawType: ev.type };
    }
  },
};
