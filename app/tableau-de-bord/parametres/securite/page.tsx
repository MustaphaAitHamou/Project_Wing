import type { Metadata } from "next";
import { requireUserPage } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { Alert, PageHeader } from "@/components/ui/misc";
import { ChangePasswordForm, SessionsList, TwoFactorSetup } from "@/features/account/security-forms";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Sécurité" };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ admin2fa?: string }> }) {
  const { admin2fa } = await searchParams;
  const user = await requireUserPage("/tableau-de-bord/parametres/securite");
  const [hasPassword, sessions] = await Promise.all([
    db.account.count({ where: { userId: user.id, providerId: "credential" } }),
    db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { updatedAt: "desc" }, select: { id: true, userAgent: true, ipAddress: true, updatedAt: true } }),
  ]);
  return (
    <div className="grid max-w-2xl gap-8">
      <PageHeader title="Sécurité" />
      {admin2fa && <Alert tone="warning" title="Double authentification requise">L&apos;accès à l&apos;administration exige l&apos;activation de la double authentification.</Alert>}
      <section className="grid gap-3"><h2 className="text-lg font-semibold">Double authentification</h2><TwoFactorSetup enabled={user.twoFactorEnabled} hasPassword={hasPassword > 0} /></section>
      {hasPassword > 0 && <section className="grid gap-3"><h2 className="text-lg font-semibold">Mot de passe</h2><ChangePasswordForm /></section>}
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Sessions actives</h2>
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {sessions.map((s) => <li key={s.id} className="grid p-3"><span className="truncate">{s.userAgent ?? "Appareil inconnu"}</span><span className="text-xs text-muted-foreground">Dernière activité : {formatDateTime(s.updatedAt)}{s.ipAddress ? ` · IP ${s.ipAddress}` : ""}</span></li>)}
        </ul>
        <SessionsList />
      </section>
    </div>
  );
}
