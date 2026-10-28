import type { Metadata } from "next";
import Link from "next/link";
import { Truck } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { listMyTrips } from "@/server/services/trips";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { TripStatusBadge } from "@/components/dashboard/status";
import { formatMoney } from "@/lib/domain/money";
import { gramsToKgLabel } from "@/lib/domain/units";
import { formatDate } from "@/lib/utils";
import { TRANSPORT_MODE_LABELS } from "@/features/shared/schemas";

export const metadata: Metadata = { title: "Mes trajets" };

export default async function MyTripsPage() {
  const user = await requireUserPage("/tableau-de-bord/trajets");
  const trips = await listMyTrips(user.id);
  return (
    <div className="grid gap-6">
      <PageHeader title="Mes trajets" description="Vos trajets publiés, leur capacité et les demandes reçues." actions={<Button asChild><Link href="/tableau-de-bord/trajets/nouveau"><Truck />Publier un trajet</Link></Button>} />
      {trips.length === 0 ? (
        <EmptyState icon={Truck} title="Aucun trajet publié" description="Vous voyagez entre la France et l'Algérie ? Rentabilisez la place libre dans vos bagages." action={<Button asChild><Link href="/tableau-de-bord/trajets/nouveau">Publier mon premier trajet</Link></Button>} />
      ) : (
        <ul className="grid gap-3">
          {trips.map((t) => (
            <li key={t.id}>
              <Link href={`/tableau-de-bord/trajets/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:border-primary/40">
                <div className="grid gap-1">
                  <span className="font-semibold">{t.originCity.name} → {t.destCity.name}</span>
                  <span className="text-sm text-muted-foreground">{formatDate(t.departureDate, { weekday: "short", day: "numeric", month: "long" })} · {TRANSPORT_MODE_LABELS[t.transportMode]} · {gramsToKgLabel(t.capacityGrams - t.reservedGrams)} libres sur {gramsToKgLabel(t.capacityGrams)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {t._count.proposals > 0 && <Badge tone="accent">{t._count.proposals} demande{t._count.proposals > 1 ? "s" : ""}</Badge>}
                  <span className="text-sm font-semibold tabular">{formatMoney(t.pricePerKg, t.currency)}/kg</span>
                  <TripStatusBadge status={t.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
