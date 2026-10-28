import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, CalendarDays, MapPin, Truck, User } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { getOwnParcel } from "@/server/services/parcels";
import { matchesForParcel } from "@/server/services/matching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Avatar, EmptyState, PageHeader, Stars } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ParcelStatusBadge, BookingStatusBadge } from "@/components/dashboard/status";
import { ParcelOwnerActions, ParcelPhotosManager } from "@/features/parcels/owner-controls";
import { ProposeDialog, RespondToProposal, WithdrawProposal } from "@/features/proposals/proposal-controls";
import { formatMoney } from "@/lib/domain/money";
import { gramsToKgLabel } from "@/lib/domain/units";
import { formatDate } from "@/lib/utils";
import { TRANSPORT_MODE_LABELS } from "@/features/shared/schemas";
import { MODE_ICONS } from "@/components/marketplace/cards";

export const metadata: Metadata = { title: "Mon colis" };

const PROPOSAL_LABEL = { PENDING: "En attente", ACCEPTED: "Acceptée", REJECTED: "Refusée", WITHDRAWN: "Retirée", EXPIRED: "Expirée" } as const;

export default async function OwnParcelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/tableau-de-bord/colis/${id}`);
  const p = await getOwnParcel(user.id, id);
  if (!p) notFound();
  const matches = p.status === "PUBLISHED" ? await matchesForParcel(p.id, { pageSize: 8 }) : { items: [], total: 0 };
  const alreadyAsked = new Set(p.proposals.map((x) => x.tripId));
  const editable = ["DRAFT", "PUBLISHED", "PENDING_REVIEW"].includes(p.status);
  const activeBooking = p.bookings.find((b) => !["CANCELLED", "REFUNDED"].includes(b.status));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={<div className="flex flex-wrap items-center gap-2"><ParcelStatusBadge status={p.status} />{p.isDemo && <Badge tone="accent">Démo</Badge>}</div>}
        title={p.title}
        description={`${p.originCity.name} (${p.originCity.country.name}) → ${p.destCity.name} (${p.destCity.country.name})`}
        actions={<ParcelOwnerActions id={p.id} status={p.status} />}
      />
      {p.status === "PENDING_REVIEW" && <Alert tone="warning" title="En attente de validation">Cette catégorie est réglementée. Notre équipe vérifie l&apos;annonce avant sa publication.</Alert>}
      {p.status === "SUSPENDED" && <Alert tone="danger" title="Annonce suspendue par la modération">{p.moderationNote ?? "Contactez le support pour plus d'informations."}</Alert>}
      {activeBooking && (
        <Alert tone="success" title={`Réservation ${activeBooking.reference}`} action={<Button asChild size="sm"><Link href={`/tableau-de-bord/reservations/${activeBooking.id}`}>Suivre l&apos;expédition<ArrowRight /></Link></Button>}>
          <BookingStatusBadge status={activeBooking.status} />
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader><CardTitle>Propositions reçues et envoyées</CardTitle></CardHeader>
            <CardContent>
              {p.proposals.length === 0 ? (
                <EmptyState icon={Truck} title="Aucune proposition pour l'instant" description={p.status === "PUBLISHED" ? "Les voyageurs compatibles ont été prévenus. Vous pouvez aussi les solliciter ci-dessous." : undefined} />
              ) : (
                <ul className="divide-y">
                  {p.proposals.map((pr) => {
                    const rating = pr.traveler.profile?.ratingCount ? pr.traveler.profile.ratingSum / pr.traveler.profile.ratingCount : null;
                    return (
                      <li key={pr.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div className="flex min-w-0 gap-3">
                          <Avatar name={pr.traveler.firstName} src={pr.traveler.image} />
                          <div className="grid min-w-0 gap-0.5 text-sm">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <Link href={`/profil/${pr.traveler.id}`} className="hover:underline">{pr.traveler.firstName}</Link>
                              {pr.traveler.profile?.kycStatus === "VERIFIED" && <BadgeCheck className="size-4 text-primary" aria-label="Identité vérifiée" />}
                              <Stars value={rating} count={pr.traveler.profile?.ratingCount} />
                            </span>
                            <span className="text-muted-foreground">Départ le {formatDate(pr.trip.departureDate, { day: "numeric", month: "long" })} · {pr.trip.originCity.name} → {pr.trip.destCity.name} · {TRANSPORT_MODE_LABELS[pr.trip.transportMode]}</span>
                            {pr.message && <span className="line-clamp-2">« {pr.message} »</span>}
                            <span className="text-xs text-muted-foreground">{pr.initiatedBy === "SENDER" ? "Demande envoyée par vous" : "Proposition du voyageur"} · {PROPOSAL_LABEL[pr.status]}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:justify-end">
                          <span className="text-lg font-bold tabular">{formatMoney(pr.price, pr.currency)}</span>
                          {pr.status === "PENDING" && (pr.authorId === user.id ? <WithdrawProposal id={pr.id} /> : <RespondToProposal id={pr.id} />)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {p.status === "PUBLISHED" && (
            <Card>
              <CardHeader>
                <CardTitle>Trajets compatibles ({matches.total})</CardTitle>
                <p className="text-sm text-muted-foreground">Classés par score de compatibilité : itinéraire, dates, capacité, prix et vérification du voyageur.</p>
              </CardHeader>
              <CardContent>
                {matches.items.length === 0 ? (
                  <EmptyState icon={Truck} title="Aucun trajet compatible pour le moment" description="Vous serez notifié dès qu'un voyageur publie un trajet correspondant." />
                ) : (
                  <ul className="grid gap-3">
                    {matches.items.map(({ trip, match }) => {
                      const Icon = MODE_ICONS[trip.transportMode];
                      return (
                        <li key={trip.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div className="grid gap-1 text-sm">
                            <span className="flex flex-wrap items-center gap-2 font-semibold">
                              <Link href={`/trajets/${trip.id}`} className="hover:underline">{trip.originCity.name} → {trip.destCity.name}</Link>
                              <Badge tone={match.score >= 80 ? "success" : match.score >= 60 ? "primary" : "neutral"}>{match.score}/100</Badge>
                            </span>
                            <span className="flex items-center gap-1.5 text-muted-foreground"><Icon className="size-4" aria-hidden />{formatDate(trip.departureDate, { day: "numeric", month: "long" })} · {trip.traveler.firstName} · prix estimé {formatMoney(match.estimatedPrice, trip.currency)}</span>
                            <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Détail du score</summary>
                              <ul className="mt-1 grid gap-0.5">{match.reasons.map((r) => <li key={r.label}>{r.ok ? "✓" : "•"} {r.label} ({r.points} pts)</li>)}</ul>
                            </details>
                          </div>
                          {alreadyAsked.has(trip.id) ? <Badge tone="outline">Déjà contacté</Badge> : <ProposeDialog mode="sender" fixedId={trip.id} options={[{ id: p.id, label: p.title }]} suggestedPrice={Math.min(match.estimatedPrice, p.budget) || p.budget} triggerLabel="Demander" />}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" />{formatDate(p.desiredDate)} {p.dateFlexDays > 0 && `(± ${p.dateFlexDays} j)`}</p>
              <p>{p.category.name} · {gramsToKgLabel(p.weightGrams)} · {p.lengthCm}×{p.widthCm}×{p.heightCm} cm{p.quantity > 1 ? ` · ${p.quantity} colis` : ""}{p.isFragile ? " · fragile" : ""}</p>
              <p>Valeur déclarée : {formatMoney(p.declaredValue, p.currency)} · Budget : <strong>{formatMoney(p.budget, p.currency)}</strong></p>
              <p className="whitespace-pre-line text-muted-foreground">{p.description}</p>
              {p.specialConditions && <p className="text-muted-foreground">Conditions : {p.specialConditions}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Destinataire (privé)</CardTitle></CardHeader>
            <CardContent className="grid gap-1.5 text-sm">
              <p className="flex items-center gap-2"><User className="size-4 text-muted-foreground" />{p.recipient?.name}</p>
              <p className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{p.recipient?.city}</p>
              <p className="text-muted-foreground">{p.recipient?.phone}{p.recipient?.email ? ` · ${p.recipient.email}` : ""}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
            <CardContent><ParcelPhotosManager parcelId={p.id} photos={p.photos} editable={editable} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
