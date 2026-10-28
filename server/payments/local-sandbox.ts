import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import type { NormalizedEvent, PaymentProvider } from "./types";

/**
 * Simulateur de paiement pour le développement et les tests automatisés.
 * Aucun argent n'est manipulé. Les « webhooks » sont signés en HMAC et passent
 * par exactement le même traitement que ceux de Stripe. Interdit en production
 * (validation de configuration dans lib/env.ts).
 */
export const SANDBOX_SIGNATURE_HEADER = "x-sandbox-signature";

export function signSandboxPayload(body: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(`sandbox-webhook:${body}`).digest("hex");
}

export const localSandboxProvider: PaymentProvider = {
  name: "local_sandbox",
  label: "Simulateur de paiement (aucun débit réel)",
  isSandbox: true,
  async createCheckout(a) {
    const sessionId = `sbx_cs_${randomUUID()}`;
    return { sessionId, url: `/dev/paiement/${sessionId}` };
  },
  async expireCheckout() {},
  async refund() {
    return { providerRefundId: `sbx_re_${randomUUID()}`, status: "SUCCEEDED" };
  },
  async transfer() {
    return { transferId: `sbx_tr_${randomUUID()}` };
  },
  async createPayoutAccount() {
    return { accountId: `sbx_acct_${randomUUID()}` };
  },
  async payoutOnboardingLink(a) {
    return `/dev/compte-versement/${a.accountId}`;
  },
  async parseWebhook(rawBody, headers) {
    const sig = headers.get(SANDBOX_SIGNATURE_HEADER) ?? "";
    const expected = signSandboxPayload(rawBody);
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error("Signature invalide");
    return JSON.parse(rawBody) as NormalizedEvent;
  },
};
