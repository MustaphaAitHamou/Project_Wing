import Link from "next/link";
import { Download } from "lucide-react";
import { dashboardStats, periodSchema } from "@/server/services/admin";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/features/admin/ui";
import { formatMoney } from "@/lib/domain/money";
import { dateRange } from "@/lib/utils";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const period = periodSchema.parse((await searchParams).periode);
  const days = Number(period);
  const s = await dashboardStats(days);
  const { from, to } = dateRange(days);
  const tiles: [string, string | number, string?][] = [
    ["Utilisateurs", s.users, "/admin/utilisateurs"], ["Nouveaux utilisateurs", s.newUsers], ["Identités vérifiées", s.verified],
    ["Colis publiés", s.activeParcels, "/admin/annonces"], ["Trajets actifs", s.activeTrips, "/admin/annonces?type=trajets"], ["Annonces à valider", s.pendingReview, "/admin/annonces?status=PENDING_REVIEW"],
    ["Réservations", s.bookings, "/admin/reservations"], ["Livraisons terminées", s.completed], ["Paiements encaissés", s.payments, "/admin/paiements"],
    ["Volume net encaissé", formatMoney(s.volume, "EUR")], ["Commissions acquises", formatMoney(s.commissions, "EUR")], ["Versements en attente", `${s.pendingPayouts.count} · ${formatMoney(s.pendingPayouts.amount, "EUR")}`, "/admin/paiements"],
    ["Litiges ouverts", s.openDisputes, "/admin/litiges"], ["Signalements ouverts", s.openReports, "/admin/signalements"],
  ];
  const max = Math.max(1, ...s.series.map((d) => Math.max(d.users, d.bookings)));
  const W = 720, H = 180, bw = W / Math.max(1, s.series.length);
  return (
    <div className="grid gap-6">
      <PageHeader title="Tableau de bord" description="Données réelles de la base, sur la période choisie." actions={<Button asChild variant="outline"><a href={`/api/admin/export?from=${from}&to=${to}`}><Download />Export CSV des transactions</a></Button>} />
      <FilterTabs items={[["7", "7 jours"], ["30", "30 jours"], ["90", "90 jours"], ["365", "12 mois"]]} current={period} param="periode" base={{}} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {tiles.map(([label, value, href]) => {
          const inner = <><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold tabular">{value}</p></>;
          return href ? <Link key={label} href={href} className="rounded-xl border bg-card p-4 hover:border-primary/40">{inner}</Link> : <div key={label} className="rounded-xl border bg-card p-4">{inner}</div>;
        })}
      </div>
      <section className="grid gap-3 rounded-xl border bg-card p-5" aria-labelledby="chart-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="chart-title" className="font-semibold">Inscriptions et réservations par jour</h2>
          <div className="flex gap-4 text-xs"><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />Inscriptions</span><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-accent" />Réservations</span></div>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H + 20}`} className="h-52 w-full min-w-[32rem]" role="img" aria-label={`Sur ${days} jours : ${s.newUsers} inscriptions, ${s.bookings} réservations`}>
            <line x1="0" y1={H} x2={W} y2={H} stroke="var(--border)" />
            <text x="2" y="10" fontSize="10" fill="var(--muted-foreground)">{max}</text>
            {s.series.map((d, i) => {
              const hu = (d.users / max) * (H - 16), hb = (d.bookings / max) * (H - 16);
              const x = i * bw;
              return (
                <g key={d.day}>
                  <title>{`${d.day} : ${d.users} inscription(s), ${d.bookings} réservation(s)`}</title>
                  <rect x={x + bw * 0.1} y={H - hu} width={bw * 0.38} height={hu} fill="var(--primary)" rx="1.5" />
                  <rect x={x + bw * 0.52} y={H - hb} width={bw * 0.38} height={hb} fill="var(--accent)" rx="1.5" />
                </g>
              );
            })}
            <text x="0" y={H + 15} fontSize="10" fill="var(--muted-foreground)">{s.series[0]?.day}</text>
            <text x={W} y={H + 15} fontSize="10" fill="var(--muted-foreground)" textAnchor="end">{s.series.at(-1)?.day}</text>
          </svg>
        </div>
      </section>
    </div>
  );
}
