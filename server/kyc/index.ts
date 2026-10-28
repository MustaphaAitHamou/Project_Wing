import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { db } from "@/server/db/client";
import { notify } from "@/server/services/notifications";
import { audit } from "@/server/audit";
import { conflict, notFound } from "@/server/security/errors";
import type { KycStatus } from "@/generated/prisma/client";

/**
 * Vérification d'identité déléguée à un prestataire. Tamurt Sending ne reçoit
 * ni ne stocke aucun scan de document : seulement le statut et la référence de session.
 *
 * - stripe_identity : Stripe Identity (session hébergée par Stripe).
 * - local_sandbox   : simulateur de développement (page /dev/kyc), interdit en production.
 */
const KYC_VALIDITY_DAYS = 365 * 2;

export async function startIdentityVerification(userId: string): Promise<{ url: string }> {
  const current = await db.userProfile.findUnique({ where: { userId } });
  if (current?.kycStatus === "VERIFIED") throw conflict("Votre identité est déjà vérifiée.");
  const returnUrl = `${env.APP_URL}/tableau-de-bord/parametres/verification`;

  if (env.KYC_PROVIDER === "stripe_identity") {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY!);
    const session = await stripe.identity.verificationSessions.create({ type: "document", metadata: { userId }, return_url: returnUrl, options: { document: { require_matching_selfie: true } } });
    await db.$transaction([
      db.identityVerification.create({ data: { userId, provider: "stripe_identity", providerRef: session.id, status: "PENDING" } }),
      db.userProfile.upsert({ where: { userId }, create: { userId, kycStatus: "PENDING" }, update: { kycStatus: "PENDING" } }),
    ]);
    return { url: session.url! };
  }

  const ref = `sbx_${crypto.randomUUID()}`;
  await db.$transaction([
    db.identityVerification.create({ data: { userId, provider: "local_sandbox", providerRef: ref, status: "PENDING" } }),
    db.userProfile.upsert({ where: { userId }, create: { userId, kycStatus: "PENDING" }, update: { kycStatus: "PENDING" } }),
  ]);
  return { url: `/dev/kyc/${ref}` };
}

/** Applique une décision du prestataire (webhook Stripe ou simulateur). Idempotent. */
export async function applyKycDecision(providerRef: string, status: Extract<KycStatus, "VERIFIED" | "REJECTED">, reason?: string) {
  await db.$transaction(async (tx) => {
    const v = await tx.identityVerification.findUnique({ where: { providerRef } });
    if (!v) throw notFound();
    if (v.status === status) return;
    const now = new Date();
    await tx.identityVerification.update({ where: { id: v.id }, data: { status, decidedAt: now, failureReason: reason ?? null, expiresAt: status === "VERIFIED" ? new Date(now.getTime() + KYC_VALIDITY_DAYS * 86_400_000) : null } });
    await tx.userProfile.upsert({ where: { userId: v.userId }, create: { userId: v.userId, kycStatus: status }, update: { kycStatus: status } });
    await audit({ actorId: null, action: `kyc.${status.toLowerCase()}`, targetType: "User", targetId: v.userId, metadata: { provider: v.provider } }, tx);
    await notify(tx, status === "VERIFIED"
      ? { userId: v.userId, type: "VERIFICATION_APPROVED", title: "Identité vérifiée", body: "Votre identité a été vérifiée. Vous pouvez désormais transporter des colis.", link: "/tableau-de-bord/parametres/verification" }
      : { userId: v.userId, type: "VERIFICATION_REJECTED", title: "Vérification non aboutie", body: "La vérification de votre identité n'a pas abouti. Vous pouvez recommencer.", link: "/tableau-de-bord/parametres/verification" });
  });
  if (status === "VERIFIED") {
    const v = await db.identityVerification.findUnique({ where: { providerRef }, select: { userId: true } });
    if (v) {
      const { onUserVerified } = await import("@/server/services/bookings");
      await onUserVerified(v.userId);
    }
  }
}

/** Expiration des vérifications (tâche planifiée). */
export async function expireOldVerifications() {
  const expired = await db.identityVerification.findMany({ where: { status: "VERIFIED", expiresAt: { lt: new Date() } }, select: { id: true, userId: true } });
  for (const v of expired) {
    await db.$transaction([
      db.identityVerification.update({ where: { id: v.id }, data: { status: "EXPIRED" } }),
      db.userProfile.update({ where: { userId: v.userId }, data: { kycStatus: "EXPIRED" } }),
    ]);
  }
  return expired.length;
}

export async function getKycState(userId: string) {
  const [profile, last] = await Promise.all([
    db.userProfile.findUnique({ where: { userId }, select: { kycStatus: true } }),
    db.identityVerification.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);
  return { status: profile?.kycStatus ?? "UNVERIFIED", last, provider: env.KYC_PROVIDER };
}
