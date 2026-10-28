import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/domain/money";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Paiements" };
const S = { REQUIRES_PAYMENT: ["En attente", "warning"], PROCESSING: ["En cours", "primary"], SUCCEEDED: ["Payé", "success"], FAILED: ["Échoué", "danger"], CANCELLED: ["Abandonné", "neutral"], REFUNDED: ["Remboursé", "neutral"], PARTIALLY_REFUNDED: ["Remb. partiel", "accent"] } as const;

export default async function PaymentsPage() {
  const user = await requireUserPage("/tableau-de-bord/paiements");
  const payments = await db.payment.findMany({ where: { booking: { senderId: user.id }, status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, take: 100, include: { booking: { select: { id: true, reference: true, parcel: { select: { title: true } } } }, refunds: { where: { status: "SUCCEEDED" } } } });
  return (
    <div className="grid gap-6">
      <PageHeader title="Paiements" description="Historique de vos paiements et remboursements. Les données de carte sont traitées uniquement par le prestataire de paiement." />
      {payments.length === 0 ? <EmptyState icon={CreditCard} title="Aucun paiement" /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Réservation</th><th className="p-3 font-medium">Reçu</th><th className="p-3 text-right font-medium">Montant</th><th className="p-3 font-medium">Statut</th></tr></thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 tabular">{formatDateTime(p.createdAt)}</td>
                  <td className="p-3"><Link href={`/tableau-de-bord/reservations/${p.booking.id}`} className="font-medium hover:underline">{p.booking.parcel.title}</Link><span className="block text-xs text-muted-foreground">{p.booking.reference}</span></td>
                  <td className="p-3 font-mono text-xs">{p.receiptNumber ?? "-"}</td>
                  <td className="p-3 text-right tabular">{formatMoney(p.amount, p.currency)}{p.amountRefunded > 0 && <span className="block text-xs text-muted-foreground">−{formatMoney(p.amountRefunded, p.currency)} remboursés</span>}</td>
                  <td className="p-3"><Badge tone={S[p.status][1]}>{S[p.status][0]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
