import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { listMyProposals } from "@/server/services/proposals";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { RespondToProposal, WithdrawProposal } from "@/features/proposals/proposal-controls";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Propositions" };
const LABEL = { PENDING: ["En attente", "warning"], ACCEPTED: ["Acceptée", "success"], REJECTED: ["Refusée", "neutral"], WITHDRAWN: ["Retirée", "neutral"], EXPIRED: ["Expirée", "neutral"] } as const;

export default async function ProposalsPage() {
  const user = await requireUserPage("/tableau-de-bord/propositions");
  const proposals = await listMyProposals(user.id);
  return (
    <div className="grid gap-6">
      <PageHeader title="Propositions" description="Propositions de transport envoyées et reçues, en tant que voyageur ou expéditeur." />
      {proposals.length === 0 ? <EmptyState icon={Inbox} title="Aucune proposition" description="Consultez les colis disponibles pour proposer vos services." action={<Link href="/rechercher?mode=colis" className="font-semibold text-primary">Voir les colis à transporter →</Link>} /> : (
        <ul className="grid gap-3">
          {proposals.map((p) => {
            const mine = p.authorId === user.id;
            const [label, tone] = LABEL[p.status];
            return (
              <li key={p.id} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="grid gap-1 text-sm">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">{p.parcel.title}<Badge tone={tone}>{label}</Badge><Badge tone="outline">{mine ? "Envoyée" : "Reçue"}</Badge></span>
                  <span className="text-muted-foreground">{p.trip.originCity.name} → {p.trip.destCity.name} · départ le {formatDate(p.trip.departureDate, { day: "numeric", month: "short" })} · {p.travelerId === user.id ? "vous transportez" : "vous expédiez"}</span>
                  {p.booking && <Link href={`/tableau-de-bord/reservations/${p.booking.id}`} className="font-medium text-primary">Réservation {p.booking.reference} →</Link>}
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <span className="text-lg font-bold tabular">{formatMoney(p.price, p.currency)}</span>
                  {p.status === "PENDING" && (mine ? <WithdrawProposal id={p.id} /> : <RespondToProposal id={p.id} />)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
