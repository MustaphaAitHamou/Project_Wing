import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Info, Weight } from "lucide-react";
import { getPublicTrip } from "@/server/services/trips";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { PersonCard } from "@/components/marketplace/person-card";
import { MODE_ICONS, DemoBadge } from "@/components/marketplace/cards";
import { ProposeDialog } from "@/features/proposals/proposal-controls";
import { ReportButton } from "@/features/reports/report-dialog";
import { TRANSPORT_MODE_LABELS } from "@/features/shared/schemas";
import { estimateTripPrice, formatMoney } from "@/lib/domain/money";
import { gramsToKgLabel, litersLabel } from "@/lib/domain/units";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getPublicTrip((await params).id);
  if (!t) return { title: "Trajet introuvable" };
  const title = `${t.originCity.name} → ${t.destCity.name} le ${formatDate(t.departureDate, { day: "numeric", month: "long" })}`;
  return { title, description: `Voyageur ${TRANSPORT_MODE_LABELS[t.transportMode].toLowerCase()} avec ${gramsToKgLabel(t.capacityGrams - t.reservedGrams)} disponibles, ${formatMoney(t.pricePerKg, t.currency)}/kg.`, alternates: { canonical: `/trajets/${t.id}` }, openGraph: { title } };
}

export default async function PublicTripPage({ params }: Props) {
  const { id } = await params;
  const [t, user] = await Promise.all([getPublicTrip(id), getCurrentUser()]);
  if (!t) notFound();
  const Icon = MODE_ICONS[t.transportMode];
  const isOwner = user?.id === t.travelerId;
  const myParcels = user && !isOwner ? await db.parcel.findMany({ where: { senderId: user.id, status: "PUBLISHED", originCity: { countryCode: t.originCity.countryCode }, destCity: { countryCode: t.destCity.countryCode } }, select: { id: true, title: true, weightGrams: true, budget: true } }) : [];
  const free = t.capacityGrams - t.reservedGrams;

  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
      <div className="grid content-start gap-6">
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2"><Badge tone="outline"><Icon />{TRANSPORT_MODE_LABELS[t.transportMode]}</Badge>{t.status === "FULL" && <Badge tone="warning">Complet</Badge>}<DemoBadge show={t.isDemo} /></div>
          <h1 className="text-3xl font-bold sm:text-4xl">{t.originCity.name} → {t.destCity.name}</h1>
          <p className="text-muted-foreground">{t.originCity.country.name} → {t.destCity.country.name}</p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />Départ</dt><dd className="font-semibold">{formatDate(t.departureDate, { weekday: "long", day: "numeric", month: "long" })}</dd>{t.arrivalDate && <dd className="text-xs text-muted-foreground">Arrivée estimée le {formatDate(t.arrivalDate, { day: "numeric", month: "long" })}</dd>}</div>
          <div className="rounded-xl border bg-card p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Weight className="size-3.5" />Place disponible</dt><dd className="font-semibold">{gramsToKgLabel(free)}</dd>{t.capacityVolumeCm3 && <dd className="text-xs text-muted-foreground">{litersLabel(t.capacityVolumeCm3 - t.reservedVolumeCm3)} de volume</dd>}</div>
          <div className="rounded-xl border bg-card p-4"><dt className="text-xs text-muted-foreground">Tarif</dt><dd className="font-semibold">{formatMoney(t.pricePerKg, t.currency)} / kg</dd>{t.minPrice > 0 && <dd className="text-xs text-muted-foreground">minimum {formatMoney(t.minPrice, t.currency)}</dd>}</div>
        </dl>
        {t.description && <section className="grid gap-2"><h2 className="text-lg font-semibold">À propos de ce trajet</h2><p className="whitespace-pre-line text-muted-foreground">{t.description}</p></section>}
        {t.conditions && <section className="grid gap-2"><h2 className="text-lg font-semibold">Conditions du voyageur</h2><p className="whitespace-pre-line text-muted-foreground">{t.conditions}</p></section>}
        <p className="text-sm text-muted-foreground">{t.acceptsFragile ? "Accepte les colis fragiles." : "N'accepte pas les colis fragiles."}</p>
      </div>
      <aside className="grid content-start gap-4">
        <PersonCard person={t.traveler} role="Voyageur" />
        <div className="grid gap-3 rounded-2xl border bg-card p-5">
          {isOwner ? (
            <Button asChild><Link href={`/tableau-de-bord/trajets/${t.id}`}>Gérer mon trajet</Link></Button>
          ) : !user ? (
            <><p className="text-sm">Connectez-vous pour demander à ce voyageur de transporter votre colis.</p><Button asChild><Link href={`/connexion?next=/trajets/${t.id}`}>Se connecter</Link></Button></>
          ) : myParcels.length > 0 && t.status === "PUBLISHED" ? (
            <ProposeDialog mode="sender" fixedId={t.id} options={myParcels.map((p) => ({ id: p.id, label: p.title, suggested: Math.min(estimateTripPrice(t.pricePerKg, t.minPrice, p.weightGrams), p.budget) || p.budget }))} triggerLabel="Demander ce voyageur" />
          ) : (
            <><p className="text-sm">Publiez d&apos;abord votre colis (même pays de départ et d&apos;arrivée) pour solliciter ce voyageur.</p><Button asChild><Link href="/tableau-de-bord/colis/nouveau">Publier un colis</Link></Button></>
          )}
          <p className="flex gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />Le prix est fixé dans la proposition et figé à l&apos;acceptation. Le paiement passe par la plateforme.</p>
        </div>
        {user && !isOwner && <ReportButton targetType="TRIP" targetId={t.id} label="Signaler ce trajet" />}
        {!user && <Alert tone="info">Les coordonnées du voyageur ne sont jamais publiques.</Alert>}
      </aside>
    </div>
  );
}
