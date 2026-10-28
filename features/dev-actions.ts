"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { requireUser } from "@/server/auth/session";
import { handleProviderEvent } from "@/server/payments/service";
import { applyKycDecision } from "@/server/kyc";
import { forbidden, notFound } from "@/server/security/errors";
import { action } from "@/server/security/action";
import { isTestMode } from "@/lib/test-mode";

function assertSandbox() {
  if (!isTestMode()) throw forbidden("Simulateur désactivé.");
}

/** Simule la page de paiement hébergée : produit l'événement que le prestataire enverrait par webhook. */
export const simulateCheckoutAction = action(z.object({ sessionId: z.string().startsWith("sbx_cs_"), outcome: z.enum(["success", "failure", "cancel"]) }), async ({ sessionId, outcome }) => {
  assertSandbox();
  const user = await requireUser();
  const payment = await db.payment.findUnique({ where: { providerSessionId: sessionId }, include: { booking: true } });
  if (!payment || payment.booking.senderId !== user.id) throw notFound();
  if (outcome === "cancel") redirect(`/tableau-de-bord/reservations/${payment.bookingId}?paiement=annule`);
  const ev = outcome === "success"
    ? { id: `sbx_evt_${randomUUID()}`, type: "checkout.completed" as const, sessionId, providerPaymentId: `sbx_pi_${randomUUID()}`, amount: payment.amount, currency: payment.currency, paymentId: payment.id }
    : { id: `sbx_evt_${randomUUID()}`, type: "payment.failed" as const, providerPaymentId: `sbx_pi_${randomUUID()}`, paymentId: payment.id, reason: "card_declined" };
  await handleProviderEvent("local_sandbox", ev, ev);
  redirect(`/tableau-de-bord/reservations/${payment.bookingId}?paiement=retour`);
});

export const simulateKycAction = action(z.object({ ref: z.string().startsWith("sbx_"), outcome: z.enum(["VERIFIED", "REJECTED"]) }), async ({ ref, outcome }) => {
  assertSandbox();
  const user = await requireUser();
  const v = await db.identityVerification.findUnique({ where: { providerRef: ref } });
  if (!v || v.userId !== user.id) throw notFound();
  await applyKycDecision(ref, outcome, outcome === "REJECTED" ? "Document illisible (simulation)" : undefined);
  redirect("/tableau-de-bord/parametres/verification");
});

export const simulatePayoutAccountAction = action(z.object({ accountId: z.string().startsWith("sbx_acct_") }), async ({ accountId }) => {
  assertSandbox();
  const user = await requireUser();
  const acc = await db.payoutAccount.findUnique({ where: { providerAccountId: accountId } });
  if (!acc || acc.userId !== user.id) throw notFound();
  await db.payoutAccount.update({ where: { id: acc.id }, data: { payoutsEnabled: true } });
  redirect("/tableau-de-bord/revenus?onboarding=retour");
});
