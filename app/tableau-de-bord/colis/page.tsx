import type { Metadata } from "next";
import Link from "next/link";
import { Package, PackagePlus } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { listMyParcels } from "@/server/services/parcels";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { ParcelStatusBadge } from "@/components/dashboard/status";
import { formatMoney } from "@/lib/domain/money";
import { gramsToKgLabel } from "@/lib/domain/units";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Mes colis" };

export default async function MyParcelsPage() {
  const user = await requireUserPage("/tableau-de-bord/colis");
  const parcels = await listMyParcels(user.id);
  return (
    <div className="grid gap-6">
      <PageHeader title="Mes colis" description="Vos annonces d'expédition et leurs propositions." actions={<Button asChild><Link href="/tableau-de-bord/colis/nouveau"><PackagePlus />Publier un colis</Link></Button>} />
      {parcels.length === 0 ? (
        <EmptyState icon={Package} title="Vous n'avez pas encore publié de colis" description="Publiez une annonce : les voyageurs compatibles seront prévenus automatiquement." action={<Button asChild><Link href="/tableau-de-bord/colis/nouveau">Publier mon premier colis</Link></Button>} />
      ) : (
        <ul className="grid gap-3">
          {parcels.map((p) => (
            <li key={p.id}>
              <Link href={`/tableau-de-bord/colis/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:border-primary/40">
                <div className="grid min-w-0 gap-1">
                  <span className="truncate font-semibold">{p.title}</span>
                  <span className="text-sm text-muted-foreground">{p.originCity.name} → {p.destCity.name} · {formatDate(p.desiredDate, { day: "numeric", month: "short" })} · {gramsToKgLabel(p.weightGrams)} · {p.category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {p._count.proposals > 0 && <Badge tone="accent">{p._count.proposals} proposition{p._count.proposals > 1 ? "s" : ""}</Badge>}
                  <span className="text-sm font-semibold tabular">{formatMoney(p.budget, p.currency)}</span>
                  <ParcelStatusBadge status={p.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
