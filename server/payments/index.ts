import "server-only";
import { env } from "@/lib/env";
import { isTestMode } from "@/lib/test-mode";
import { localSandboxProvider } from "./local-sandbox";
import { stripeProvider } from "./stripe";
import type { PaymentProvider, ProviderName } from "./types";

export function getPaymentProvider(name: ProviderName = env.PAYMENT_PROVIDER): PaymentProvider {
  if (name === "stripe") {
    if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe non configuré");
    return stripeProvider;
  }
  if (!isTestMode()) throw new Error("Simulateur interdit en production");
  return localSandboxProvider;
}
