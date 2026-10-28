import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { earningsSummary } from "@/server/payments/service";
import { db } from "@/server/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { BookingStatusBadge } from "@/components/dashboard/status";
import { PayoutOnboarding } from "@/features/payments/payout-onboarding";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Revenus" };
const PAYOUT = { PENDING: ["En attente", "warning"], BLOCKED: ["Bloqué", "danger"], PROCESSING: ["En cours", "primary"], PAID: ["Versé", "success"], FAILED: ["Échec", "danger"], CANCELLED: ["Annulé", "neutral"] } as const;

export default async function EarningsPage() {
  const user = await requireUserPage("/tableau-de-bord/revenus");
  const [{ bookings, payouts, account, inProgress }, countries] = await Promise.all([earningsSummary(user.id), db.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })]);
  const sum = (s: string) => payouts.filter((p) => p.status === s).reduce((a, p) => a + (p._sum.amount ?? 0), 0);
  return (
    <div className="grid gap-6">
      <PageHeader title="Revenus" description="Vos rémunérations de transport, nettes de la commission de la plateforme." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["En cours de livraison", inProgress], ["En attente de versement", sum("PENDING") + sum("PROCESSING")], ["Bloqués", sum("BLOCKED")], ["Déjà versés", sum("PAID")]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-bold tabular">{formatMoney(v as number, "EUR")}</p></div>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Compte de versement</CardTitle></CardHeader>
        <CardContent className="grid gap-4 text-sm">
          {account ? (
            <p>Compte {account.provider === "stripe" ? "Stripe" : "simulé"} · pays {account.countryCode} · {account.payoutsEnabled ? <Badge tone="success">Actif</Badge> : <Badge tone="warning">Configuration à terminer</Badge>}</p>
          ) : <p>Configurez votre compte de versement pour recevoir vos rémunérations après chaque livraison.</p>}
          <Alert tone="info" title="Pays pris en charge">
            Versements disponibles : {countries.filter((c) => c.payoutsEnabled).map((c) => c.name).join(", ") || "aucun pour le moment"}. Non disponibles pour l&apos;instant : {countries.filter((c) => !c.payoutsEnabled).map((c) => c.name).join(", ")}. Vos gains restent alors en attente, sans être perdus.
          </Alert>
          {!account?.payoutsEnabled && <PayoutOnboarding countries={countries.map((c) => ({ code: c.code, name: c.name, enabled: c.payoutsEnabled }))} />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
        <CardContent>
          {bookings.length === 0 ? <EmptyState icon={HandCoins} title="Pas encore de revenus" description="Proposez vos services sur des colis compatibles avec vos trajets." /> : (
            <ul className="divide-y">
              {bookings.map((b) => (
                <li key={b.id}><Link href={`/tableau-de-bord/reservations/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm hover:opacity-80">
                  <span className="grid"><span className="font-medium">{b.parcel.title}</span><span className="text-xs text-muted-foreground">{b.reference} · {formatDate(b.createdAt, { day: "numeric", month: "short", year: "numeric" })}{b.payout?.blockedReason ? ` · ${b.payout.blockedReason}` : ""}</span></span>
                  <span className="flex items-center gap-2"><span className="font-semibold tabular">{formatMoney(b.travelerNet, b.currency)}</span>{b.payout ? <Badge tone={PAYOUT[b.payout.status][1]}>{PAYOUT[b.payout.status][0]}</Badge> : <BookingStatusBadge status={b.status} />}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
