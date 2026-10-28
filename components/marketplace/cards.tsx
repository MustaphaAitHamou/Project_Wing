import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, Package, Plane, Car, Ship, TrainFront, Bus, Route, Weight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, Stars } from "@/components/ui/misc";
import { formatMoney } from "@/lib/domain/money";
import { gramsToKgLabel } from "@/lib/domain/units";
import { formatDate } from "@/lib/utils";
import { TRANSPORT_MODE_LABELS } from "@/features/shared/schemas";

export const MODE_ICONS = { PLANE: Plane, CAR: Car, FERRY: Ship, TRAIN: TrainFront, BUS: Bus, OTHER: Route } as const;

type City = { name: string; country?: { name: string } };
type Person = { firstName: string; image: string | null; profile: { kycStatus: string; ratingSum: number; ratingCount: number; deliveriesCount?: number } | null };

export function DemoBadge({ show }: { show: boolean }) {
  return show ? <Badge tone="accent" title="Annonce de démonstration (environnement de développement)">Démo</Badge> : null;
}

function RouteLine({ from, to }: { from: City; to: City }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-base font-semibold">
      <span className="truncate">{from.name}</span>
      <ArrowRight className="size-4 shrink-0 text-primary" aria-label="vers" />
      <span className="truncate">{to.name}</span>
    </div>
  );
}

export function TripCard({ trip }: { trip: { id: string; originCity: City; destCity: City; departureDate: Date; transportMode: keyof typeof MODE_ICONS; capacityGrams: number; reservedGrams: number; pricePerKg: number; currency: string; isDemo: boolean; traveler: Person } }) {
  const Icon = MODE_ICONS[trip.transportMode];
  const p = trip.traveler.profile;
  const rating = p?.ratingCount ? p.ratingSum / p.ratingCount : null;
  return (
    <Link href={`/trajets/${trip.id}`} className="group grid gap-4 rounded-xl border bg-card p-4 transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <RouteLine from={trip.originCity} to={trip.destCity} />
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-4" aria-hidden />{formatDate(trip.departureDate, { weekday: "short", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-lg font-bold tabular">{formatMoney(trip.pricePerKg, trip.currency)}<span className="text-xs font-medium text-muted-foreground">/kg</span></span>
          <DemoBadge show={trip.isDemo} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="outline"><Icon aria-hidden />{TRANSPORT_MODE_LABELS[trip.transportMode]}</Badge>
        <Badge tone="primary"><Weight aria-hidden />{gramsToKgLabel(trip.capacityGrams - trip.reservedGrams)} disponibles</Badge>
      </div>
      <div className="flex items-center gap-2.5 border-t pt-3">
        <Avatar name={trip.traveler.firstName} src={trip.traveler.image} size={32} />
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{trip.traveler.firstName}</span>
          {p?.kycStatus === "VERIFIED" && <BadgeCheck className="size-4 text-primary" aria-label="Identité vérifiée" />}
        </div>
        <Stars value={rating} count={p?.ratingCount} />
      </div>
    </Link>
  );
}

export function ParcelCard({ parcel }: { parcel: { id: string; title: string; originCity: City; destCity: City; desiredDate: Date; dateFlexDays: number; weightGrams: number; budget: number; currency: string; isDemo: boolean; isFragile: boolean; category: { name: string }; sender: Person } }) {
  const p = parcel.sender.profile;
  return (
    <Link href={`/colis/${parcel.id}`} className="group grid gap-4 rounded-xl border bg-card p-4 transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{parcel.title}</p>
          <RouteLine from={parcel.originCity} to={parcel.destCity} />
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-4" aria-hidden />Vers le {formatDate(parcel.desiredDate, { day: "numeric", month: "long" })}{parcel.dateFlexDays > 0 && ` (±${parcel.dateFlexDays} j)`}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-lg font-bold tabular">{formatMoney(parcel.budget, parcel.currency)}</span>
          <span className="text-xs text-muted-foreground">budget</span>
          <DemoBadge show={parcel.isDemo} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="outline"><Package aria-hidden />{parcel.category.name}</Badge>
        <Badge tone="primary"><Weight aria-hidden />{gramsToKgLabel(parcel.weightGrams)}</Badge>
        {parcel.isFragile && <Badge tone="warning">Fragile</Badge>}
      </div>
      <div className="flex items-center gap-2.5 border-t pt-3">
        <Avatar name={parcel.sender.firstName} src={parcel.sender.image} size={32} />
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{parcel.sender.firstName}</span>
          {p?.kycStatus === "VERIFIED" && <BadgeCheck className="size-4 text-primary" aria-label="Identité vérifiée" />}
        </div>
        <Stars value={p?.ratingCount ? p.ratingSum / p.ratingCount : null} count={p?.ratingCount} />
      </div>
    </Link>
  );
}

export function CardGridSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="grid gap-4 rounded-xl border bg-card p-4">
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="flex gap-2"><div className="h-5 w-20 animate-pulse rounded-full bg-muted" /><div className="h-5 w-28 animate-pulse rounded-full bg-muted" /></div>
          <div className="h-8 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
