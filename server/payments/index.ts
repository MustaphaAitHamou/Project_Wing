import "server-only";
import { env } from "@/lib/env";
import { localSandboxProvider } from "./local-sandbox";
import { stripeProvider } from "./stripe";
import type { PaymentProvider, ProviderName } from "./types";

export function getPaymentProvider(name: ProviderName = env.PAYMENT_PROVIDER): PaymentProvider {
  if (name === "stripe") {
    if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe non configuré");
    return stripeProvider;
  }
  if (env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_SANDBOX_IN_PRODUCTION !== "true") throw new Error("Simulateur interdit en production");
  return localSandboxProvider;
}
