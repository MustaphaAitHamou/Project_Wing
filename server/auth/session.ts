import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./index";
import { db } from "@/server/db/client";
import { forbidden, unauthenticated } from "@/server/security/errors";
import type { Role } from "@/generated/prisma/client";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  image: string | null;
  role: Role;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  kycStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  termsAccepted: boolean;
}

/** Utilisateur courant, relu en base à chaque requête (rôle et statut font foi côté serveur). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, firstName: true, lastName: true, image: true, role: true, status: true, emailVerified: true, twoFactorEnabled: true, termsAcceptedAt: true, profile: { select: { kycStatus: true } } },
  });
  if (!u || u.status === "SUSPENDED") return null;
  return {
    id: u.id, email: u.email, name: u.name, firstName: u.firstName, lastName: u.lastName, image: u.image, role: u.role,
    emailVerified: u.emailVerified, twoFactorEnabled: !!u.twoFactorEnabled, kycStatus: u.profile?.kycStatus ?? "UNVERIFIED", termsAccepted: !!u.termsAcceptedAt,
  };
});

/** Pour les Server Actions et Route Handlers : lève une erreur si non connecté. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw unauthenticated();
  if (!u.termsAccepted) throw forbidden("Acceptez les conditions générales pour continuer.");
  return u;
}

/** Pour les pages : redirige vers la connexion. */
export async function requireUserPage(next: string): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  if (!u.termsAccepted) redirect(`/bienvenue?next=${encodeURIComponent(next)}`);
  return u;
}

const adminRequires2fa = () => process.env.ADMIN_REQUIRE_2FA !== "false";

export function isStaff(u: Pick<CurrentUser, "role">) {
  return u.role === "ADMIN" || u.role === "MODERATOR";
}

/** Accès administration : rôle staff + double authentification activée (sauf désactivation explicite en dev). */
export async function requireStaff(minRole: "MODERATOR" | "ADMIN" = "MODERATOR"): Promise<CurrentUser> {
  const u = await requireUser();
  const ok = minRole === "ADMIN" ? u.role === "ADMIN" : isStaff(u);
  if (!ok) throw forbidden();
  if (adminRequires2fa() && !u.twoFactorEnabled) throw forbidden("La double authentification est obligatoire pour l'administration.");
  return u;
}

export async function requireStaffPage(minRole: "MODERATOR" | "ADMIN" = "MODERATOR"): Promise<CurrentUser> {
  const u = await requireUserPage("/admin");
  const ok = minRole === "ADMIN" ? u.role === "ADMIN" : isStaff(u);
  if (!ok) redirect("/tableau-de-bord?erreur=acces-refuse");
  if (adminRequires2fa() && !u.twoFactorEnabled) redirect("/tableau-de-bord/parametres/securite?admin2fa=1");
  return u;
}
