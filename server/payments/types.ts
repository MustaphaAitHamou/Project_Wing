export type ProviderName = "local_sandbox" | "stripe";

export interface CheckoutArgs {
  paymentId: string;
  bookingId: string;
  reference: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

/** Événement prestataire normalisé : la logique métier ne dépend pas du format Stripe. */
export type NormalizedEvent =
  | { id: string; type: "checkout.completed"; sessionId: string; providerPaymentId: string | null; amount: number; currency: string; paymentId: string | null }
  | { id: string; type: "checkout.expired"; sessionId: string; paymentId: string | null }
  | { id: string; type: "payment.failed"; providerPaymentId: string; paymentId: string | null; reason: string }
  | { id: string; type: "refund.updated"; providerRefundId: string; status: "SUCCEEDED" | "FAILED" | "PENDING" }
  | { id: string; type: "account.updated"; providerAccountId: string; payoutsEnabled: boolean }
  | { id: string; type: "ignored"; rawType: string };

export interface PaymentProvider {
  name: ProviderName;
  /** Libellé affiché à l'utilisateur. */
  label: string;
  isSandbox: boolean;
  createCheckout(a: CheckoutArgs): Promise<{ sessionId: string; url: string }>;
  expireCheckout(sessionId: string): Promise<void>;
  refund(a: { providerPaymentId: string; amount: number; idempotencyKey: string; reason?: string }): Promise<{ providerRefundId: string; status: "SUCCEEDED" | "PENDING" | "FAILED" }>;
  transfer(a: { amount: number; currency: string; destinationAccountId: string; transferGroup: string; sourcePaymentId: string | null; idempotencyKey: string }): Promise<{ transferId: string }>;
  createPayoutAccount(a: { userId: string; email: string; country: string }): Promise<{ accountId: string }>;
  payoutOnboardingLink(a: { accountId: string; returnUrl: string; refreshUrl: string }): Promise<string>;
  parseWebhook(rawBody: string, headers: Headers): Promise<NormalizedEvent>;
}
