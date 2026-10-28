import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import { db } from "@/server/db/client";
import { getPaymentProvider } from "./index";
import type { NormalizedEvent, ProviderName } from "./types";
import { addDeliveryEvent, loadBookingFor, transition } from "@/server/services/booking-core";
import { enqueue } from "@/server/jobs/queue";
import { notify } from "@/server/services/notifications";
import { audit } from "@/server/audit";
import { getSetting } from "@/server/settings";
import { logger } from "@/server/logger";
import { conflict, forbidden, invalid, notFound, unavailable } from "@/server/security/errors";
import { formatMoney } from "@/lib/domain/money";

const providerFor = (name: string) => getPaymentProvider(name as ProviderName);

/** Démarre un paiement pour une réservation acceptée (expéditeur uniquement). */
export async function startCheckout(userId: string, bookingId: string) {
  const { booking, role } = await loadBookingFor(userId, bookingId);
  if (role !== "SENDER") throw forbidden("Seul l'expéditeur règle la réservation.");
  if (!["ACCEPTED", "AWAITING_PAYMENT"].includes(booking.status)) throw conflict("Cette réservation n'est pas en attente de paiement.");
  const enabled = await getSetting("payments.enabledProviders");
  if (!enabled.includes(env.PAYMENT_PROVIDER)) throw unavailable("Le paiement est temporairement indisponible.");
  const provider = getPaymentProvider();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  const parcel = await db.parcel.findUniqueOrThrow({ where: { id: booking.parcelId }, select: { title: true } });

  // Expire les sessions précédentes encore ouvertes (un seul paiement en cours à la fois).
  const open = await db.payment.findMany({ where: { bookingId, status: { in: ["REQUIRES_PAYMENT", "PROCESSING"] } } });
  for (const p of open) {
    if (p.providerSessionId) await providerFor(p.provider).expireCheckout(p.providerSessionId).catch(() => undefined);
    await db.payment.updateMany({ where: { id: p.id, status: "REQUIRES_PAYMENT" }, data: { status: "CANCELLED" } });
  }

  const payment = await db.payment.create({
    data: { bookingId, provider: provider.name, amount: booking.totalCharged, currency: booking.currency, idempotencyKey: `checkout:${bookingId}:${randomUUID()}` },
  });
  const base = env.APP_URL;
  const session = await provider.createCheckout({
    paymentId: payment.id, bookingId, reference: booking.reference, amount: booking.totalCharged, currency: booking.currency,
    description: parcel.title, customerEmail: user.email,
    successUrl: `${base}/tableau-de-bord/reservations/${bookingId}?paiement=retour`, cancelUrl: `${base}/tableau-de-bord/reservations/${bookingId}?paiement=annule`,
    idempotencyKey: payment.idempotencyKey,
  });
  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { providerSessionId: session.sessionId } });
    if (booking.status === "ACCEPTED") await transition(tx, bookingId, "AWAITING_PAYMENT", { actor: "SENDER", actorId: userId, reason: "Paiement initié" });
  });
  return { url: session.url };
}

/**
 * Traitement d'un webhook prestataire. Idempotent : l'événement est inséré avec une
 * contrainte d'unicité (provider, providerEventId) ; un doublon est ignoré.
 * Le statut « payé » n'est jamais posé ailleurs qu'ici, sur confirmation du prestataire.
 */
export async function handleProviderEvent(providerName: ProviderName, ev: NormalizedEvent, rawPayload: unknown) {
  try {
    await db.paymentEvent.create({ data: { provider: providerName, providerEventId: ev.id, type: ev.type, payload: rawPayload as Prisma.InputJsonValue } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await db.paymentEvent.findUnique({ where: { provider_providerEventId: { provider: providerName, providerEventId: ev.id } } });
      if (existing?.processedAt) return { duplicate: true };
    } else throw e;
  }
  try {
    await processEvent(providerName, ev);
    await db.paymentEvent.update({ where: { provider_providerEventId: { provider: providerName, providerEventId: ev.id } }, data: { processedAt: new Date(), error: null } });
    return { duplicate: false };
  } catch (e) {
    await db.paymentEvent.update({ where: { provider_providerEventId: { provider: providerName, providerEventId: ev.id } }, data: { error: e instanceof Error ? e.message : String(e) } });
    throw e;
  }
}

async function processEvent(providerName: ProviderName, ev: NormalizedEvent) {
  switch (ev.type) {
    case "checkout.completed":
      return onCheckoutCompleted(providerName, ev);
    case "checkout.expired": {
      const p = await db.payment.findUnique({ where: { providerSessionId: ev.sessionId } });
      if (!p || p.status !== "REQUIRES_PAYMENT") return;
      await db.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: p.id }, data: { status: "CANCELLED" } });
        const b = await tx.booking.findUniqueOrThrow({ where: { id: p.bookingId } });
        const stillOpen = await tx.payment.count({ where: { bookingId: p.bookingId, status: { in: ["REQUIRES_PAYMENT", "PROCESSING"] } } });
        if (b.status === "AWAITING_PAYMENT" && stillOpen === 0) await transition(tx, b.id, "ACCEPTED", { actor: "SYSTEM", actorId: null, reason: "Session de paiement expirée" });
      });
      return;
    }
    case "payment.failed": {
      const p = ev.paymentId ? await db.payment.findUnique({ where: { id: ev.paymentId } }) : await db.payment.findUnique({ where: { providerPaymentId: ev.providerPaymentId } });
      if (!p || !["REQUIRES_PAYMENT", "PROCESSING"].includes(p.status)) return;
      await db.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: p.id }, data: { status: "FAILED", failureReason: ev.reason, providerPaymentId: p.providerPaymentId ?? (ev.providerPaymentId || null) } });
        const b = await tx.booking.findUniqueOrThrow({ where: { id: p.bookingId } });
        if (b.status === "AWAITING_PAYMENT") await transition(tx, b.id, "ACCEPTED", { actor: "SYSTEM", actorId: null, reason: "Paiement échoué" });
        await notify(tx, { userId: b.senderId, type: "PAYMENT_FAILED", title: "Paiement non abouti", body: `Le paiement de la réservation ${b.reference} n'a pas abouti. Vous pouvez réessayer.`, link: `/tableau-de-bord/reservations/${b.id}` });
      });
      return;
    }
    case "refund.updated": {
      const r = await db.refund.findUnique({ where: { providerRefundId: ev.providerRefundId } });
      if (!r || r.status === ev.status || ev.status === "PENDING") return;
      await finalizeRefund(r.id, ev.status);
      return;
    }
    case "account.updated": {
      await db.payoutAccount.updateMany({ where: { providerAccountId: ev.providerAccountId }, data: { payoutsEnabled: ev.payoutsEnabled } });
      return;
    }
    case "ignored":
      return;
  }
}

async function onCheckoutCompleted(providerName: ProviderName, ev: Extract<NormalizedEvent, { type: "checkout.completed" }>) {
  const payment = await db.payment.findUnique({ where: { providerSessionId: ev.sessionId } });
  if (!payment) throw new Error(`Paiement inconnu pour la session ${ev.sessionId}`);
  if (payment.status === "SUCCEEDED") return;
  if (ev.amount !== payment.amount || ev.currency !== payment.currency) {
    logger.error("payment.amount_mismatch", { paymentId: payment.id, expected: payment.amount, got: ev.amount });
    throw new Error("Montant encaissé différent du montant attendu");
  }
  let refundDuplicate = false;
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "booking" WHERE id = ${payment.bookingId} FOR UPDATE`;
    const b = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId } });
    const alreadyPaid = await tx.payment.count({ where: { bookingId: b.id, status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] } } });
    const now = new Date();
    if (alreadyPaid > 0 || !["AWAITING_PAYMENT", "ACCEPTED"].includes(b.status)) {
      // Paiement en double (deux onglets) ou réservation annulée entre-temps : remboursement intégral automatique.
      await tx.payment.update({ where: { id: payment.id }, data: { status: "PROCESSING", providerPaymentId: ev.providerPaymentId } });
      refundDuplicate = true;
      return;
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", providerPaymentId: ev.providerPaymentId, succeededAt: now, receiptNumber: `R-${b.reference}-${now.getTime().toString(36).toUpperCase()}` } });
    if (b.status === "ACCEPTED") await transition(tx, b.id, "AWAITING_PAYMENT", { actor: "SYSTEM", actorId: null, reason: "Paiement reçu (rattrapage)" });
    await transition(tx, b.id, "PAID", { actor: "SYSTEM", actorId: null, reason: `Paiement confirmé par ${providerName}`, data: { paidAt: now } });
    await addDeliveryEvent(tx, b.id, "BOOKING_CONFIRMED", null);
    await addDeliveryEvent(tx, b.id, "PAYMENT_CONFIRMED", null, { provider: providerName });
    await transition(tx, b.id, "READY_FOR_PICKUP", { actor: "SYSTEM", actorId: null, reason: "Code de remise émis" });
    await enqueue(tx, "otp.issue", { bookingId: b.id, purpose: "PICKUP" }, { dedupeKey: `otp:PICKUP:${b.id}:1` });
    await notify(tx, { userId: b.senderId, type: "PAYMENT_RECEIVED", title: `Paiement confirmé — ${b.reference}`, body: "Vous allez recevoir le code à remettre au voyageur lors de la remise du colis.", link: `/tableau-de-bord/reservations/${b.id}` });
    await notify(tx, { userId: b.travelerId, type: "PAYMENT_RECEIVED", title: `Réservation confirmée — ${b.reference}`, body: `L'expéditeur a payé. Organisez la remise du colis. Rémunération nette estimée : ${formatMoney(b.travelerNet, b.currency)}.`, link: `/tableau-de-bord/reservations/${b.id}` });
  });
  if (refundDuplicate) {
    const refund = await createRefund(payment.id, payment.amount, "Paiement en double ou réservation annulée", null);
    logger.warn("payment.duplicate_refunded", { paymentId: payment.id, refundId: refund.id });
  }
}

/** Crée un remboursement exécuté par le prestataire (jamais un simple changement d'état local). */
export async function createRefund(paymentId: string, amount: number, reason: string, actorId: string | null) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw notFound();
  if (!payment.providerPaymentId) throw conflict("Paiement non encaissé : rien à rembourser.");
  if (amount <= 0 || amount > payment.amount - payment.amountRefunded) throw invalid("Montant de remboursement invalide.");
  const pending = await db.refund.aggregate({ where: { paymentId, status: "PENDING" }, _sum: { amount: true } });
  if ((pending._sum.amount ?? 0) + amount > payment.amount - payment.amountRefunded) throw conflict("Un remboursement est déjà en cours pour ce paiement.");

  const refund = await db.refund.create({ data: { paymentId, amount, currency: payment.currency, reason, initiatedById: actorId, idempotencyKey: `refund:${paymentId}:${randomUUID()}` } });
  try {
    const res = await providerFor(payment.provider).refund({ providerPaymentId: payment.providerPaymentId, amount, idempotencyKey: refund.idempotencyKey, reason });
    await db.refund.update({ where: { id: refund.id }, data: { providerRefundId: res.providerRefundId } });
    if (res.status !== "PENDING") await finalizeRefund(refund.id, res.status);
  } catch (e) {
    await db.refund.update({ where: { id: refund.id }, data: { status: "FAILED" } });
    logger.error("refund.failed", { refundId: refund.id, error: e instanceof Error ? e.message : String(e) });
    throw unavailable("Le remboursement n'a pas pu être initié auprès du prestataire. Réessayez ou contactez le support.");
  }
  if (actorId) await audit({ actorId, action: "payment.refund", targetType: "Payment", targetId: paymentId, metadata: { amount, reason, refundId: refund.id } });
  return db.refund.findUniqueOrThrow({ where: { id: refund.id } });
}

async function finalizeRefund(refundId: string, status: "SUCCEEDED" | "FAILED") {
  await db.$transaction(async (tx) => {
    const r = await tx.refund.findUniqueOrThrow({ where: { id: refundId }, include: { payment: true } });
    if (r.status !== "PENDING") return;
    await tx.refund.update({ where: { id: refundId }, data: { status } });
    if (status === "FAILED") return;
    const refunded = r.payment.amountRefunded + r.amount;
    const full = refunded >= r.payment.amount;
    await tx.payment.update({ where: { id: r.paymentId }, data: { amountRefunded: refunded, status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    const b = await tx.booking.findUniqueOrThrow({ where: { id: r.payment.bookingId } });
    // Paiement en double : la réservation n'est pas concernée.
    if (r.payment.succeededAt == null) return;
    if (full && (b.status === "CANCELLED" || b.status === "DISPUTED")) {
      await transition(tx, b.id, "REFUNDED", { actor: "SYSTEM", actorId: null, reason: "Remboursement confirmé par le prestataire" });
      await addDeliveryEvent(tx, b.id, "REFUNDED", null, { amount: r.amount });
      await tx.commission.updateMany({ where: { bookingId: b.id }, data: { status: "REVERSED" } });
      await tx.payout.updateMany({ where: { bookingId: b.id, status: { in: ["PENDING", "BLOCKED"] } }, data: { status: "CANCELLED" } });
    }
    await notify(tx, { userId: b.senderId, type: "BOOKING_UPDATED", title: `Remboursement effectué — ${b.reference}`, body: `${formatMoney(r.amount, r.currency)} remboursé(s) sur votre moyen de paiement. Le délai d'apparition dépend de votre banque.`, link: `/tableau-de-bord/reservations/${b.id}` });
  });
}

/** Paiements d'une réservation : visibles par l'expéditeur uniquement (le voyageur voit sa rémunération). */
export async function paymentSummary(userId: string, bookingId: string) {
  const { booking, role } = await loadBookingFor(userId, bookingId);
  if (role !== "SENDER") return null;
  return db.payment.findMany({ where: { bookingId: booking.id }, orderBy: { createdAt: "desc" }, include: { refunds: true } });
}

// ───────────────────────────── Versements transporteurs ─────────────────────────────

/** Crée le versement à la clôture d'une réservation (appelé dans la transaction de clôture). */
export async function createPayoutRecord(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], booking: { id: string; travelerId: string; travelerNet: number; currency: string }) {
  const provider = env.PAYMENT_PROVIDER;
  await tx.payout.upsert({
    where: { bookingId: booking.id },
    create: { bookingId: booking.id, travelerId: booking.travelerId, amount: booking.travelerNet, currency: booking.currency, provider, idempotencyKey: `payout:${booking.id}` },
    update: {},
  });
  await enqueue(tx, "payout.release", { bookingId: booking.id }, { dedupeKey: `payout:${booking.id}` });
}

/**
 * Déclenche le transfert vers le transporteur. Bloqué (BLOCKED, avec motif) si :
 * litige ouvert, compte de versement absent/non activé, pays non pris en charge.
 * Le verrou de statut (PENDING → PROCESSING conditionnel) empêche tout double versement.
 */
export async function releasePayout(bookingId: string) {
  const payout = await db.payout.findUnique({ where: { bookingId }, include: { booking: true } });
  if (!payout || !["PENDING", "BLOCKED"].includes(payout.status)) return payout?.status ?? null;
  const block = async (reason: string) => {
    await db.payout.update({ where: { id: payout.id }, data: { status: "BLOCKED", blockedReason: reason } });
    return "BLOCKED" as const;
  };
  if (payout.booking.status !== "COMPLETED") return block("Réservation non clôturée");
  const openDispute = await db.dispute.count({ where: { bookingId, status: { notIn: ["RESOLVED", "CLOSED"] } } });
  if (openDispute) return block("Litige en cours");
  const account = await db.payoutAccount.findUnique({ where: { userId_provider: { userId: payout.travelerId, provider: payout.provider } } });
  if (!account) return block("Le transporteur n'a pas encore configuré son compte de versement");
  const country = await db.country.findUnique({ where: { code: account.countryCode } });
  if (!country?.payoutsEnabled) return block(`Versements non disponibles pour le pays du compte (${account.countryCode})`);
  if (!account.payoutsEnabled) return block("Compte de versement non activé par le prestataire");
  const payment = await db.payment.findFirst({ where: { bookingId, status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] } } });
  if (!payment) return block("Aucun paiement encaissé");
  const amount = Math.min(payout.amount, payment.amount - payment.amountRefunded);
  if (amount <= 0) return block("Montant net nul après remboursement");

  const lock = await db.payout.updateMany({ where: { id: payout.id, status: { in: ["PENDING", "BLOCKED"] } }, data: { status: "PROCESSING", blockedReason: null } });
  if (lock.count !== 1) return null;
  try {
    const { transferId } = await providerFor(payout.provider).transfer({ amount, currency: payout.currency, destinationAccountId: account.providerAccountId, transferGroup: payout.booking.reference, sourcePaymentId: payment.providerPaymentId, idempotencyKey: payout.idempotencyKey });
    await db.$transaction(async (tx) => {
      await tx.payout.update({ where: { id: payout.id }, data: { status: "PAID", providerTransferId: transferId, paidAt: new Date(), amount } });
      await tx.commission.updateMany({ where: { bookingId }, data: { status: "EARNED" } });
      await notify(tx, { userId: payout.travelerId, type: "PAYMENT_RECEIVED", title: "Versement effectué", body: `${formatMoney(amount, payout.currency)} versé(s) pour la réservation ${payout.booking.reference}.`, link: "/tableau-de-bord/revenus" });
    });
    return "PAID" as const;
  } catch (e) {
    await db.payout.update({ where: { id: payout.id }, data: { status: "FAILED", blockedReason: e instanceof Error ? e.message.slice(0, 300) : "Erreur prestataire" } });
    logger.error("payout.failed", { payoutId: payout.id, error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

/** Compte de versement du transporteur (Stripe Connect Express ou simulateur). */
export async function startPayoutOnboarding(userId: string, countryCode: string) {
  const country = await db.country.findUnique({ where: { code: countryCode } });
  if (!country) throw invalid("Pays inconnu.");
  if (!country.payoutsEnabled) throw unavailable(`Les versements vers ${country.name} ne sont pas encore disponibles. Votre rémunération restera en attente jusqu'à l'ouverture de ce pays.`);
  const provider = getPaymentProvider();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  let account = await db.payoutAccount.findUnique({ where: { userId_provider: { userId, provider: provider.name } } });
  if (!account) {
    const { accountId } = await provider.createPayoutAccount({ userId, email: user.email, country: countryCode });
    account = await db.payoutAccount.create({ data: { userId, provider: provider.name, providerAccountId: accountId, countryCode, payoutsEnabled: false } });
  }
  const url = await provider.payoutOnboardingLink({ accountId: account.providerAccountId, returnUrl: `${env.APP_URL}/tableau-de-bord/revenus?onboarding=retour`, refreshUrl: `${env.APP_URL}/tableau-de-bord/revenus?onboarding=relancer` });
  return { url };
}

export async function earningsSummary(userId: string) {
  const [bookings, payouts, account] = await Promise.all([
    db.booking.findMany({ where: { travelerId: userId, status: { notIn: ["CANCELLED", "REFUNDED", "PENDING", "AWAITING_VERIFICATION", "ACCEPTED", "AWAITING_PAYMENT"] } }, orderBy: { createdAt: "desc" }, include: { parcel: { select: { title: true } }, payout: true } }),
    db.payout.groupBy({ by: ["status", "currency"], where: { travelerId: userId }, _sum: { amount: true } }),
    db.payoutAccount.findFirst({ where: { userId } }),
  ]);
  const inProgress = bookings.filter((b) => b.status !== "COMPLETED").reduce((s, b) => s + b.travelerNet, 0);
  return { bookings, payouts, account, inProgress };
}
