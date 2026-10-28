import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import { requireStaffPage } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { FilterTabs, SearchBox, Table, Td } from "@/features/admin/ui";
import { BookingStatusBadge } from "@/components/dashboard/status";
import { RunAction } from "@/features/admin/run-action";
import { adminCancelBookingAction } from "@/features/admin/actions";
import { CANCELLABLE_STATES } from "@/lib/domain/booking-state";
import { formatMoney } from "@/lib/domain/money";
import { formatDateTime } from "@/lib/utils";

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const staff = await requireStaffPage();
  const where: Prisma.BookingWhereInput = { ...(sp.status ? { status: sp.status as never } : {}), ...(sp.q ? { OR: [{ reference: { contains: sp.q.trim().toUpperCase() } }, { id: sp.q.trim() }] } : {}) };
  const items = await db.booking.findMany({ where, orderBy: { updatedAt: "desc" }, take: 50, include: { parcel: { select: { title: true } }, sender: { select: { id: true, email: true } }, traveler: { select: { id: true, email: true } }, statusHistory: { orderBy: { createdAt: "desc" }, take: 1 } } });
  return (
    <div className="grid gap-5">
      <PageHeader title="Réservations" />
      <FilterTabs items={[["", "Toutes"], ["AWAITING_PAYMENT", "Paiement attendu"], ["READY_FOR_PICKUP", "À remettre"], ["IN_TRANSIT", "En transport"], ["DELIVERED", "Livrées"], ["DISPUTED", "En litige"], ["COMPLETED", "Terminées"], ["CANCELLED", "Annulées"]]} current={sp.status ?? ""} param="status" base={{ q: sp.q }} />
      <SearchBox q={sp.q ?? ""} placeholder="Référence (TS-…)" hidden={{ status: sp.status }} />
      <Table head={["Référence", "Colis", "Expéditeur / voyageur", "Montant", "Statut", "Actions"]} minWidth="58rem">
        {items.map((b) => (
          <tr key={b.id}>
            <Td><span className="font-mono">{b.reference}</span><span className="block text-xs text-muted-foreground">MAJ {formatDateTime(b.updatedAt)}</span></Td>
            <Td>{b.parcel.title}</Td>
            <Td><Link href={`/admin/utilisateurs/${b.sender.id}`} className="block hover:underline">{b.sender.email}</Link><Link href={`/admin/utilisateurs/${b.traveler.id}`} className="block text-muted-foreground hover:underline">{b.traveler.email}</Link></Td>
            <Td className="tabular">{formatMoney(b.totalCharged, b.currency)}<span className="block text-xs text-muted-foreground">comm. {formatMoney(b.platformFee, b.currency)}</span></Td>
            <Td><BookingStatusBadge status={b.status} /></Td>
            <Td>{staff.role === "ADMIN" && (CANCELLABLE_STATES as readonly string[]).includes(b.status) && <RunAction fn={adminCancelBookingAction} payload={{ bookingId: b.id }} label="Annuler" confirm="Annuler la réservation (remboursement automatique si payée) ?" reason destructive success="Réservation annulée" />}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
