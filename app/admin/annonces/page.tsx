import Link from "next/link";
import { listListings } from "@/server/services/admin";
import { requireStaffPage } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { FilterTabs, SearchBox, Table, Td } from "@/features/admin/ui";
import { ParcelStatusBadge, TripStatusBadge } from "@/components/dashboard/status";
import { RunAction } from "@/features/admin/run-action";
import { deleteListingAction, moderateListingAction } from "@/features/admin/actions";
import { Pagination } from "@/components/marketplace/pagination";
import { formatDate } from "@/lib/utils";
import { formatMoney } from "@/lib/domain/money";

export default async function AdminListings({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const staff = await requireStaffPage();
  const kind = sp.type === "trajets" ? "trips" : "parcels";
  const page = Math.max(1, Number(sp.page) || 1);
  const res = await listListings(kind, sp.status, sp.q?.trim() ?? "", page);
  const statuses: [string, string][] = kind === "parcels"
    ? [["", "Tous"], ["PENDING_REVIEW", "À valider"], ["PUBLISHED", "Publiés"], ["RESERVED", "Réservés"], ["SUSPENDED", "Suspendus"], ["DRAFT", "Brouillons"]]
    : [["", "Tous"], ["PUBLISHED", "Publiés"], ["FULL", "Complets"], ["SUSPENDED", "Suspendus"], ["EXPIRED", "Expirés"]];
  return (
    <div className="grid gap-5">
      <PageHeader title="Annonces" description={`${res.total} résultat(s)`} />
      <FilterTabs items={[["", "Colis"], ["trajets", "Trajets"]]} current={sp.type === "trajets" ? "trajets" : ""} param="type" base={{}} />
      <FilterTabs items={statuses} current={sp.status ?? ""} param="status" base={{ type: sp.type }} />
      <SearchBox q={sp.q ?? ""} placeholder={kind === "parcels" ? "Titre, identifiant ou email" : "Identifiant ou email du voyageur"} hidden={{ type: sp.type, status: sp.status }} />
      {res.kind === "parcels" ? (
        <Table head={["Annonce", "Trajet", "Expéditeur", "Budget", "Statut", "Actions"]} minWidth="56rem">
          {res.items.map((p) => (
            <tr key={p.id}>
              <Td><Link href={`/colis/${p.id}`} className="font-medium hover:underline">{p.title}</Link><span className="block text-xs text-muted-foreground">{p.category.name}{p.isDemo ? " · démo" : ""}</span>{p.moderationNote && <span className="block text-xs text-warning">{p.moderationNote}</span>}</Td>
              <Td>{p.originCity.name} → {p.destCity.name}<span className="block text-xs text-muted-foreground">{formatDate(p.desiredDate, { day: "numeric", month: "short" })}</span></Td>
              <Td><Link href={`/admin/utilisateurs/${p.sender.id}`} className="hover:underline">{p.sender.email}</Link></Td>
              <Td className="tabular">{formatMoney(p.budget, p.currency)}</Td>
              <Td><ParcelStatusBadge status={p.status} /></Td>
              <Td><div className="flex flex-wrap gap-1">
                {p.status === "PENDING_REVIEW" && <RunAction fn={moderateListingAction} payload={{ kind: "parcel", id: p.id, op: "approve" }} label="Valider" variant="default" success="Annonce publiée" />}
                {["PUBLISHED", "PENDING_REVIEW", "EXPIRED"].includes(p.status) && <RunAction fn={moderateListingAction} payload={{ kind: "parcel", id: p.id, op: "suspend", note: "Suspendue par la modération" }} label="Suspendre" confirm="Suspendre cette annonce ?" success="Annonce suspendue" />}
                {p.status === "SUSPENDED" && <RunAction fn={moderateListingAction} payload={{ kind: "parcel", id: p.id, op: "restore" }} label="Rétablir" success="Annonce rétablie" />}
                {staff.role === "ADMIN" && <RunAction fn={deleteListingAction} payload={{ kind: "parcel", id: p.id }} label="Supprimer" confirm="Suppression définitive (impossible si réservation)" reason destructive variant="ghost" success="Annonce supprimée" />}
              </div></Td>
            </tr>
          ))}
        </Table>
      ) : (
        <Table head={["Trajet", "Voyageur", "Capacité", "Tarif", "Statut", "Actions"]} minWidth="52rem">
          {res.items.map((t) => (
            <tr key={t.id}>
              <Td><Link href={`/trajets/${t.id}`} className="font-medium hover:underline">{t.originCity.name} → {t.destCity.name}</Link><span className="block text-xs text-muted-foreground">{formatDate(t.departureDate, { day: "numeric", month: "short", year: "numeric" })}{t.isDemo ? " · démo" : ""}</span></Td>
              <Td><Link href={`/admin/utilisateurs/${t.traveler.id}`} className="hover:underline">{t.traveler.email}</Link></Td>
              <Td className="tabular">{t.reservedGrams / 1000} / {t.capacityGrams / 1000} kg</Td>
              <Td className="tabular">{formatMoney(t.pricePerKg, t.currency)}/kg</Td>
              <Td><TripStatusBadge status={t.status} /></Td>
              <Td><div className="flex flex-wrap gap-1">
                {["PUBLISHED", "FULL"].includes(t.status) && <RunAction fn={moderateListingAction} payload={{ kind: "trip", id: t.id, op: "suspend", note: "Suspendu par la modération" }} label="Suspendre" confirm="Suspendre ce trajet ?" success="Trajet suspendu" />}
                {t.status === "SUSPENDED" && <RunAction fn={moderateListingAction} payload={{ kind: "trip", id: t.id, op: "restore" }} label="Rétablir" success="Trajet rétabli" />}
                {staff.role === "ADMIN" && <RunAction fn={deleteListingAction} payload={{ kind: "trip", id: t.id }} label="Supprimer" confirm="Suppression définitive (impossible si réservation)" reason destructive variant="ghost" success="Trajet supprimé" />}
              </div></Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} total={res.total} pageSize={25} params={{ type: sp.type, status: sp.status, q: sp.q }} />
    </div>
  );
}
