import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { listMyDisputes, DISPUTE_STATUS_LABELS, DISPUTE_TYPE_LABELS } from "@/server/services/disputes";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Litiges" };

export default async function DisputesPage() {
  const user = await requireUserPage("/tableau-de-bord/litiges");
  const disputes = await listMyDisputes(user.id);
  return (
    <div className="grid gap-6">
      <PageHeader title="Litiges" description="Un problème avec une expédition ? Ouvrez un litige depuis la page de la réservation." />
      {disputes.length === 0 ? <EmptyState icon={ShieldCheck} title="Aucun litige" description="Tant mieux !" /> : (
        <ul className="grid gap-3">
          {disputes.map((d) => (
            <li key={d.id}><Link href={`/tableau-de-bord/litiges/${d.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-4 hover:border-primary/40">
              <span className="grid"><span className="font-semibold">{DISPUTE_TYPE_LABELS[d.type]}</span><span className="text-sm text-muted-foreground">Réservation {d.booking.reference} · ouvert le {formatDate(d.createdAt)}</span></span>
              <Badge tone={["RESOLVED", "CLOSED"].includes(d.status) ? "success" : d.status === "WAITING_FOR_INFORMATION" ? "warning" : "danger"}>{DISPUTE_STATUS_LABELS[d.status]}</Badge>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
