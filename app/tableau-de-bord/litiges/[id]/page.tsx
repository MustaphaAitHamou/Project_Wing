import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserPage } from "@/server/auth/session";
import { getDispute, DISPUTE_STATUS_LABELS, DISPUTE_TYPE_LABELS } from "@/server/services/disputes";
import { AppError } from "@/server/security/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { DisputeComposer } from "@/features/disputes/dispute-composer";
import { formatDateTime } from "@/lib/utils";
import { formatMoney } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Litige" };
const RES = { FULL_REFUND: "Remboursement intégral", PARTIAL_REFUND: "Remboursement partiel", RELEASE_PAYOUT: "Paiement du voyageur", NO_ACTION: "Sans suite, reprise du parcours" } as const;

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/tableau-de-bord/litiges/${id}`);
  let d;
  try { d = await getDispute(user.id, id); } catch (e) { if (e instanceof AppError && e.code === "NOT_FOUND") notFound(); throw e; }
  const open = !["RESOLVED", "CLOSED"].includes(d.status);
  const names = new Map([[d.booking.sender.id, `${d.booking.sender.firstName} (expéditeur)`], [d.booking.traveler.id, `${d.booking.traveler.firstName} (voyageur)`]]);
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={<Badge tone={open ? "danger" : "success"}>{DISPUTE_STATUS_LABELS[d.status]}</Badge>} title={DISPUTE_TYPE_LABELS[d.type]} description={`Réservation ${d.booking.reference} · ${d.booking.parcel.title}`} actions={<Link href={`/tableau-de-bord/reservations/${d.bookingId}`} className="text-sm font-semibold text-primary">Voir la réservation →</Link>} />
      {d.status === "WAITING_FOR_INFORMATION" && <Alert tone="warning">L&apos;équipe attend des informations complémentaires de votre part.</Alert>}
      {d.resolution && <Alert tone="success" title={`Décision : ${RES[d.resolution]}`}>{d.refundAmount ? `Montant remboursé : ${formatMoney(d.refundAmount, d.booking.currency)}.` : null}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader><CardTitle>Échanges</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <ol className="grid gap-3">
              {d.events.map((e) => (
                <li key={e.id} className="rounded-xl border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{e.actorId ? names.get(e.actorId) ?? "Équipe Tamurt Sending" : "Système"} · {formatDateTime(e.createdAt)}{e.type === "evidence_added" ? " · pièce ajoutée" : ""}</p>
                  {e.note && <p className="mt-1 whitespace-pre-wrap">{e.note}</p>}
                </li>
              ))}
            </ol>
            {open && <DisputeComposer disputeId={d.id} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pièces justificatives</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {d.evidence.length === 0 ? <p className="text-muted-foreground">Aucune pièce.</p> : d.evidence.map((e) => <a key={e.id} href={e.url} target="_blank" rel="noreferrer" className="truncate text-primary underline">{e.fileName}</a>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
