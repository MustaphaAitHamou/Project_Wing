import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { getOwnTrip } from "@/server/services/trips";
import { matchesForTrip } from "@/server/services/matching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge, TripStatusBadge } from "@/components/dashboard/status";
import { TripOwnerActions } from "@/features/trips/owner-controls";
import { ProposeDialog, RespondToProposal, WithdrawProposal } from "@/features/proposals/proposal-controls";
import { formatMoney } from "@/lib/domain/money";
import { gramsToKgLabel } from "@/lib/domain/units";
import { formatDate } from "@/lib/utils";
import { TRANSPORT_MODE_LABELS } from "@/features/shared/schemas";

export const metadata: Metadata = { title: "Mon trajet" };
const PROPOSAL_LABEL = { PENDING: "En attente", ACCEPTED: "Acceptée", REJECTED: "Refusée", WITHDRAWN: "Retirée", EXPIRED: "Expirée" } as const;

export default async function OwnTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/tableau-de-bord/trajets/${id}`);
  const t = await getOwnTrip(user.id, id);
  if (!t) notFound();
  const matches = t.status === "PUBLISHED" ? await matchesForTrip(t.id, { pageSize: 10 }) : { items: [], total: 0 };
  const asked = new Set(t.proposals.map((p) => p.parcelId));
  const free = t.capacityGrams - t.reservedGrams;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={<div className="flex gap-2"><TripStatusBadge status={t.status} />{t.isDemo && <Badge tone="accent">Démo</Badge>}</div>}
        title={`${t.originCity.name} → ${t.destCity.name}`}
        description={`${formatDate(t.departureDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${TRANSPORT_MODE_LABELS[t.transportMode]}`}
        actions={<TripOwnerActions id={t.id} status={t.status} />}
      />
      {user.kycStatus !== "VERIFIED" && <Alert tone="warning" title="Identité non vérifiée" action={<Button asChild size="sm"><Link href="/tableau-de-bord/parametres/verification">Vérifier mon identité</Link></Button>}>Vous ne pourrez pas proposer vos services ni accepter de demande tant que votre identité n&apos;est pas vérifiée.</Alert>}
      <div className="grid grid-cols-3 gap-3">
        {[["Capacité", gramsToKgLabel(t.capacityGrams)], ["Réservé", gramsToKgLabel(t.reservedGrams)], ["Disponible", gramsToKgLabel(free)]].map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-bold tabular">{v}</p></div>
        ))}
      </div>

      {t.bookings.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Colis réservés</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {t.bookings.map((b) => (
                <li key={b.id}><Link href={`/tableau-de-bord/reservations/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:opacity-80"><span className="font-medium">{b.parcel.title} <span className="text-sm text-muted-foreground">· {b.reference}</span></span><span className="flex items-center gap-2"><span className="text-sm font-semibold tabular">{formatMoney(b.travelerNet, b.currency)} net</span><BookingStatusBadge status={b.status} /></span></Link></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Demandes et propositions</CardTitle></CardHeader>
        <CardContent>
          {t.proposals.length === 0 ? <EmptyState icon={Package} title="Aucune demande pour le moment" /> : (
            <ul className="divide-y">
              {t.proposals.map((p) => (
                <li key={p.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="grid gap-0.5 text-sm">
                    <Link href={`/colis/${p.parcelId}`} className="font-semibold hover:underline">{p.parcel.title}</Link>
                    <span className="text-muted-foreground">{p.parcel.originCity.name} → {p.parcel.destCity.name} · {gramsToKgLabel(p.parcel.weightGrams)} · {p.parcel.category.name}</span>
                    {p.message && <span>« {p.message} »</span>}
                    <span className="text-xs text-muted-foreground">{p.initiatedBy === "TRAVELER" ? "Votre proposition" : "Demande de l'expéditeur"} · {PROPOSAL_LABEL[p.status]}</span>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="text-lg font-bold tabular">{formatMoney(p.price, p.currency)}</span>
                    {p.status === "PENDING" && (p.authorId === user.id ? <WithdrawProposal id={p.id} /> : <RespondToProposal id={p.id} />)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {t.status === "PUBLISHED" && (
        <Card>
          <CardHeader><CardTitle>Colis compatibles ({matches.total})</CardTitle></CardHeader>
          <CardContent>
            {matches.items.length === 0 ? <EmptyState icon={Package} title="Aucun colis compatible pour le moment" description="Vous serez notifié dès qu'un colis correspondant est publié." /> : (
              <ul className="grid gap-3">
                {matches.items.map(({ parcel, match }) => (
                  <li key={parcel.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="grid gap-1 text-sm">
                      <span className="flex flex-wrap items-center gap-2 font-semibold"><Link href={`/colis/${parcel.id}`} className="hover:underline">{parcel.title}</Link><Badge tone={match.score >= 80 ? "success" : "primary"}>{match.score}/100</Badge></span>
                      <span className="text-muted-foreground">{parcel.originCity.name} → {parcel.destCity.name} · {formatDate(parcel.desiredDate, { day: "numeric", month: "short" })} · {gramsToKgLabel(parcel.weightGrams)} · budget {formatMoney(parcel.budget, parcel.currency)}</span>
                    </div>
                    {asked.has(parcel.id) ? <Badge tone="outline">Déjà proposé</Badge> : <ProposeDialog mode="traveler" fixedId={parcel.id} options={[{ id: t.id, label: `${t.originCity.name} → ${t.destCity.name}, ${formatDate(t.departureDate, { day: "numeric", month: "short" })}`, suggested: match.estimatedPrice }]} triggerLabel="Proposer" />}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
