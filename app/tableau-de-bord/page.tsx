import Link from "next/link";
import { ArrowRight, BadgeCheck, Bell, Package, PackagePlus, Route, ShieldAlert, Truck } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { listMyBookings } from "@/server/services/bookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import { BookingStatusBadge } from "@/components/dashboard/status";
import { formatMoney } from "@/lib/domain/money";
import { formatDateTime } from "@/lib/utils";
import { ResendVerification } from "@/features/auth/resend-verification";

const ACTIVE = ["AWAITING_VERIFICATION", "ACCEPTED", "AWAITING_PAYMENT", "PAID", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "DISPUTED"];

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ bienvenue?: string; erreur?: string }> }) {
  const sp = await searchParams;
  const user = await requireUserPage("/tableau-de-bord");
  const [bookings, parcels, trips, pendingForMe, notifications] = await Promise.all([
    listMyBookings(user.id),
    db.parcel.count({ where: { senderId: user.id, status: { in: ["PUBLISHED", "PENDING_REVIEW", "RESERVED", "IN_TRANSIT"] } } }),
    db.trip.count({ where: { travelerId: user.id, status: { in: ["PUBLISHED", "FULL"] } } }),
    db.proposal.count({ where: { status: "PENDING", authorId: { not: user.id }, OR: [{ travelerId: user.id }, { parcel: { senderId: user.id } }] } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const active = bookings.filter((b) => ACTIVE.includes(b.status));

  return (
    <div className="grid gap-8">
      <PageHeader title={`Bonjour ${user.firstName}`} description="Retrouvez ici l'essentiel de vos envois et de vos trajets." actions={<><Button asChild><Link href="/tableau-de-bord/colis/nouveau"><PackagePlus />Publier un colis</Link></Button><Button asChild variant="outline"><Link href="/tableau-de-bord/trajets/nouveau"><Truck />Publier un trajet</Link></Button></>} />

      {sp.erreur === "acces-refuse" && <Alert tone="danger">Vous n&apos;avez pas accès à cette page.</Alert>}
      {!user.emailVerified && (
        <Alert tone="warning" title="Confirmez votre adresse email" action={<ResendVerification email={user.email} />}>
          Vous devez confirmer votre email avant de publier un colis ou un trajet.
        </Alert>
      )}
      {user.kycStatus !== "VERIFIED" && (
        <Alert tone="info" title="Vous souhaitez transporter des colis ?" action={<Button asChild size="sm" variant="secondary"><Link href="/tableau-de-bord/parametres/verification"><BadgeCheck />Vérifier mon identité</Link></Button>}>
          La vérification d&apos;identité est obligatoire pour proposer vos services de transport.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Colis en cours", value: parcels, href: "/tableau-de-bord/colis", icon: Package },
          { label: "Trajets publiés", value: trips, href: "/tableau-de-bord/trajets", icon: Truck },
          { label: "Réservations actives", value: active.length, href: "/tableau-de-bord/reservations", icon: Route },
          { label: "Propositions à traiter", value: pendingForMe, href: "/tableau-de-bord/propositions", icon: ShieldAlert },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="grid gap-1 rounded-xl border bg-card p-4 hover:border-primary/40">
            <s.icon className="size-5 text-primary" aria-hidden />
            <span className="text-2xl font-bold tabular">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Réservations en cours</CardTitle>
            <Button asChild variant="link" size="sm"><Link href="/tableau-de-bord/reservations">Tout voir<ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent>
            {active.length === 0 ? (
              <EmptyState icon={Route} title="Aucune réservation en cours" description="Publiez un colis ou un trajet pour commencer." />
            ) : (
              <ul className="divide-y">
                {active.slice(0, 6).map((b) => (
                  <li key={b.id}>
                    <Link href={`/tableau-de-bord/reservations/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:opacity-80">
                      <div className="grid min-w-0 gap-0.5">
                        <span className="truncate font-medium">{b.parcel.title}</span>
                        <span className="text-xs text-muted-foreground">{b.parcel.originCity.name} → {b.parcel.destCity.name} · {b.reference} · {b.senderId === user.id ? `voyageur : ${b.traveler.firstName}` : `expéditeur : ${b.sender.firstName}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular">{formatMoney(b.senderId === user.id ? b.totalCharged : b.travelerNet, b.currency)}</span>
                        <BookingStatusBadge status={b.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Dernières notifications</CardTitle>
            <Button asChild variant="link" size="sm"><Link href="/tableau-de-bord/notifications">Tout voir<ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="Rien de nouveau" />
            ) : (
              <ul className="grid gap-3">
                {notifications.map((n) => (
                  <li key={n.id} className="grid gap-0.5 text-sm">
                    <Link href={n.link ?? "/tableau-de-bord/notifications"} className={n.readAt ? "text-muted-foreground" : "font-semibold"}>{n.title}</Link>
                    <span className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
