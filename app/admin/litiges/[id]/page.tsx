import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/session";
import { getDispute, DISPUTE_STATUS_LABELS, DISPUTE_TYPE_LABELS } from "@/server/services/disputes";
import { AppError } from "@/server/security/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { RunAction } from "@/features/admin/run-action";
import { DisputeAdminPanel } from "@/features/admin/dispute-panel";
import { assignDisputeAction, closeDisputeAction } from "@/features/admin/actions";
import { formatMoney } from "@/lib/domain/money";
import { formatDateTime } from "@/lib/utils";

export default async function AdminDispute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requireStaffPage();
  let d;
  try { d = await getDispute(staff.id, id, true); } catch (e) { if (e instanceof AppError && e.code === "NOT_FOUND") notFound(); throw e; }
  const paid = d.booking.payments.find((p) => p.succeededAt);
  const names = new Map([[d.booking.sender.id, `${d.booking.sender.firstName} ${d.booking.sender.lastName} (expéditeur)`], [d.booking.traveler.id, `${d.booking.traveler.firstName} ${d.booking.traveler.lastName} (voyageur)`]]);
  const open = !["RESOLVED", "CLOSED"].includes(d.status);
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={<Badge tone={open ? "danger" : "success"}>{DISPUTE_STATUS_LABELS[d.status]}</Badge>} title={DISPUTE_TYPE_LABELS[d.type]} description={`Réservation ${d.booking.reference} · ${d.booking.parcel.title} · statut avant litige : ${d.previousBookingStatus}`}
        actions={<>{open && d.assignedToId !== staff.id && <RunAction fn={assignDisputeAction} payload={{ disputeId: d.id }} label="Me l'assigner" success="Litige assigné" />}{d.status === "RESOLVED" && <RunAction fn={closeDisputeAction} payload={{ disputeId: d.id, note: "Clôture" }} label="Clôturer" confirm="Clôturer définitivement ce litige ?" success="Litige clôturé" />}</>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader><CardTitle>Historique et échanges</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {d.events.map((e) => (
              <div key={e.id} className={`rounded-xl border p-3 text-sm ${e.isPublic ? "" : "border-dashed bg-muted/50"}`}>
                <p className="text-xs text-muted-foreground">{e.actorId ? names.get(e.actorId) ?? "Équipe" : "Système"} · {e.type}{e.isPublic ? "" : " · note interne"} · {formatDateTime(e.createdAt)}</p>
                {e.note && <p className="mt-1 whitespace-pre-wrap">{e.note}</p>}
              </div>
            ))}
            {open && <DisputeAdminPanel disputeId={d.id} isAdmin={staff.role === "ADMIN"} refundable={paid ? paid.amount - paid.amountRefunded : 0} />}
          </CardContent>
        </Card>
        <div className="grid content-start gap-6">
          <Card><CardHeader><CardTitle>Transaction</CardTitle></CardHeader><CardContent className="grid gap-1 text-sm">
            <p>Prix {formatMoney(d.booking.transportPrice, d.booking.currency)} · commission {formatMoney(d.booking.platformFee, d.booking.currency)}</p>
            <p>Valeur déclarée : {formatMoney(d.booking.parcel.declaredValue, d.booking.parcel.currency)}</p>
            <p>Paiement : {paid ? `${formatMoney(paid.amount, paid.currency)} encaissé${paid.amountRefunded ? `, ${formatMoney(paid.amountRefunded, paid.currency)} remboursé` : ""}` : "aucun"}</p>
            <p><Link href={`/admin/utilisateurs/${d.booking.sender.id}`} className="text-primary hover:underline">Expéditeur</Link> · <Link href={`/admin/utilisateurs/${d.booking.traveler.id}`} className="text-primary hover:underline">Voyageur</Link></p>
            {d.booking.conversation && <p className="text-xs text-muted-foreground">Conversation : consultable via le journal de modération (accès journalisé).</p>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Preuves</CardTitle></CardHeader><CardContent className="grid gap-1 text-sm">
            {d.evidence.length === 0 ? <p className="text-muted-foreground">Aucune pièce.</p> : d.evidence.map((e) => <a key={e.id} href={e.url} target="_blank" rel="noreferrer" className="truncate text-primary underline">{e.fileName} ({names.get(e.uploaderId) ?? "?"})</a>)}
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
