import type { Metadata } from "next";
import Link from "next/link";
import { Route } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { listMyBookings } from "@/server/services/bookings";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { BookingStatusBadge } from "@/components/dashboard/status";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Expéditions et livraisons" };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const user = await requireUserPage("/tableau-de-bord/reservations");
  const as = role === "expediteur" ? "SENDER" : role === "voyageur" ? "TRAVELER" : undefined;
  const bookings = await listMyBookings(user.id, as);
  const tabs = [["", "Toutes"], ["expediteur", "Mes expéditions"], ["voyageur", "Mes livraisons"]] as const;
  return (
    <div className="grid gap-6">
      <PageHeader title="Expéditions et livraisons" description="Toutes vos réservations, en tant qu'expéditeur ou voyageur." />
      <nav className="flex gap-1 rounded-xl bg-muted p-1 text-sm font-semibold sm:w-fit" aria-label="Filtrer">
        {tabs.map(([k, label]) => (
          <Link key={k} href={k ? `?role=${k}` : "?"} aria-current={(role ?? "") === k ? "page" : undefined} className={(role ?? "") === k ? "rounded-lg bg-card px-3 py-2 shadow-sm" : "rounded-lg px-3 py-2 text-muted-foreground"}>{label}</Link>
        ))}
      </nav>
      {bookings.length === 0 ? (
        <EmptyState icon={Route} title="Aucune réservation" description="Les réservations apparaissent ici dès qu'une proposition est acceptée." />
      ) : (
        <ul className="grid gap-3">
          {bookings.map((b) => {
            const mine = b.senderId === user.id;
            return (
              <li key={b.id}>
                <Link href={`/tableau-de-bord/reservations/${b.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:border-primary/40">
                  <div className="grid min-w-0 gap-1">
                    <span className="flex items-center gap-2 font-semibold"><span className="truncate">{b.parcel.title}</span><Badge tone="outline">{mine ? "Expédition" : "Livraison"}</Badge></span>
                    <span className="text-sm text-muted-foreground">{b.parcel.originCity.name} → {b.parcel.destCity.name} · {formatDate(b.trip.departureDate, { day: "numeric", month: "short" })} · {b.reference}</span>
                  </div>
                  <div className="flex items-center gap-2"><span className="text-sm font-semibold tabular">{formatMoney(mine ? b.totalCharged : b.travelerNet, b.currency)}</span><BookingStatusBadge status={b.status} /></div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
