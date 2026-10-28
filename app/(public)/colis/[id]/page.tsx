import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Info, Package, Weight } from "lucide-react";
import { getPublicParcel } from "@/server/services/parcels";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { PersonCard } from "@/components/marketplace/person-card";
import { DemoBadge } from "@/components/marketplace/cards";
import { ProposeDialog } from "@/features/proposals/proposal-controls";
import { ReportButton } from "@/features/reports/report-dialog";
import { estimateTripPrice, formatMoney } from "@/lib/domain/money";
import { gramsToKgLabel } from "@/lib/domain/units";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPublicParcel((await params).id);
  if (!p) return { title: "Colis introuvable" };
  return { title: `${p.title} : ${p.originCity.name} → ${p.destCity.name}`, description: `Colis de ${gramsToKgLabel(p.weightGrams)} à transporter vers le ${formatDate(p.desiredDate, { day: "numeric", month: "long" })}, budget ${formatMoney(p.budget, p.currency)}.`, alternates: { canonical: `/colis/${p.id}` } };
}

export default async function PublicParcelPage({ params }: Props) {
  const { id } = await params;
  const [p, user] = await Promise.all([getPublicParcel(id), getCurrentUser()]);
  if (!p) notFound();
  const isOwner = user?.id === p.senderId;
  const myTrips = user && !isOwner ? await db.trip.findMany({ where: { travelerId: user.id, status: "PUBLISHED", originCity: { countryCode: p.originCity.countryCode }, destCity: { countryCode: p.destCity.countryCode } }, include: { originCity: true, destCity: true }, orderBy: { departureDate: "asc" } }) : [];
  const available = p.status === "PUBLISHED";

  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
      <div className="grid content-start gap-6">
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2"><Badge tone="outline"><Package />{p.category.name}</Badge>{p.isFragile && <Badge tone="warning">Fragile</Badge>}{!available && <Badge tone="neutral">Déjà réservé</Badge>}<DemoBadge show={p.isDemo} /></div>
          <h1 className="text-3xl font-bold sm:text-4xl">{p.title}</h1>
          <p className="text-lg font-medium">{p.originCity.name} ({p.originCity.country.name}) → {p.destCity.name} ({p.destCity.country.name})</p>
        </div>
        {p.photos.length > 0 && <div className="flex gap-2 overflow-x-auto">{p.photos.map((ph, i) => <img key={ph.id} src={ph.url} alt={`Photo ${i + 1} : ${p.title}`} className="h-40 rounded-xl border object-cover" loading="lazy" />)}</div>}
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />Date souhaitée</dt><dd className="font-semibold">{formatDate(p.desiredDate, { day: "numeric", month: "long" })}</dd>{p.dateFlexDays > 0 && <dd className="text-xs text-muted-foreground">± {p.dateFlexDays} jours</dd>}</div>
          <div className="rounded-xl border bg-card p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Weight className="size-3.5" />Poids et dimensions</dt><dd className="font-semibold">{gramsToKgLabel(p.weightGrams)}</dd><dd className="text-xs text-muted-foreground">{p.lengthCm}×{p.widthCm}×{p.heightCm} cm{p.quantity > 1 ? `, ${p.quantity} colis` : ""}</dd></div>
          <div className="rounded-xl border bg-card p-4"><dt className="text-xs text-muted-foreground">Budget de l&apos;expéditeur</dt><dd className="font-semibold">{formatMoney(p.budget, p.currency)}</dd><dd className="text-xs text-muted-foreground">Valeur déclarée {formatMoney(p.declaredValue, p.currency)}</dd></div>
        </dl>
        <section className="grid gap-2"><h2 className="text-lg font-semibold">Contenu déclaré</h2><p className="whitespace-pre-line text-muted-foreground">{p.description}</p>{p.specialConditions && <p className="text-sm text-muted-foreground">Conditions : {p.specialConditions}</p>}</section>
        <Alert tone="info">À la remise, vérifiez le contenu avec l&apos;expéditeur. Vous pouvez refuser tout objet non conforme ou interdit.</Alert>
      </div>
      <aside className="grid content-start gap-4">
        <PersonCard person={p.sender} role="Expéditeur" />
        <div className="grid gap-3 rounded-2xl border bg-card p-5">
          {isOwner ? <Button asChild><Link href={`/tableau-de-bord/colis/${p.id}`}>Gérer mon annonce</Link></Button>
          : !available ? <p className="text-sm">Ce colis a déjà trouvé son voyageur.</p>
          : !user ? <><p className="text-sm">Vous faites ce trajet ? Connectez-vous pour proposer de transporter ce colis.</p><Button asChild><Link href={`/connexion?next=/colis/${p.id}`}>Se connecter</Link></Button></>
          : myTrips.length > 0 ? <ProposeDialog mode="traveler" fixedId={p.id} options={myTrips.map((t) => ({ id: t.id, label: `${t.originCity.name} → ${t.destCity.name}, ${formatDate(t.departureDate, { day: "numeric", month: "short" })}`, suggested: estimateTripPrice(t.pricePerKg, t.minPrice, p.weightGrams) }))} triggerLabel="Proposer mes services" />
          : <><p className="text-sm">Publiez votre trajet (mêmes pays) pour proposer de transporter ce colis.</p><Button asChild><Link href="/tableau-de-bord/trajets/nouveau">Publier un trajet</Link></Button></>}
          <p className="flex gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />Les coordonnées du destinataire ne sont communiquées qu&apos;après paiement de la réservation.</p>
        </div>
        {user && !isOwner && <ReportButton targetType="PARCEL" targetId={p.id} label="Signaler cette annonce" />}
      </aside>
    </div>
  );
}
