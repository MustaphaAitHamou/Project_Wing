import Link from "next/link";
import { listPayments, listPayouts } from "@/server/services/admin";
import { requireStaffPage } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { FilterTabs, Table, Td } from "@/features/admin/ui";
import { RefundForm } from "@/features/admin/refund-form";
import { RunAction } from "@/features/admin/run-action";
import { retryPayoutAction } from "@/features/admin/actions";
import { formatMoney } from "@/lib/domain/money";
import { formatDateTime } from "@/lib/utils";
import { env } from "@/lib/env";

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ status?: string; vue?: string }> }) {
  const sp = await searchParams;
  const staff = await requireStaffPage();
  const view = sp.vue === "versements" ? "payouts" : "payments";
  return (
    <div className="grid gap-5">
      <PageHeader title="Paiements" description={`Prestataire actif : ${env.PAYMENT_PROVIDER === "stripe" ? "Stripe" : "simulateur local (aucun argent réel)"}. Les statuts proviennent des confirmations du prestataire.`} />
      <FilterTabs items={[["", "Paiements"], ["versements", "Versements"]]} current={sp.vue ?? ""} param="vue" base={{}} />
      {view === "payments" ? <Payments status={sp.status} isAdmin={staff.role === "ADMIN"} /> : <Payouts status={sp.status} isAdmin={staff.role === "ADMIN"} />}
    </div>
  );
}

async function Payments({ status, isAdmin }: { status?: string; isAdmin: boolean }) {
  const { items } = await listPayments(status);
  return (
    <>
      <FilterTabs items={[["", "Tous"], ["SUCCEEDED", "Encaissés"], ["FAILED", "Échoués"], ["REQUIRES_PAYMENT", "En attente"], ["REFUNDED", "Remboursés"], ["PARTIALLY_REFUNDED", "Remb. partiels"]]} current={status ?? ""} param="status" base={{}} />
      <Table head={["Date", "Réservation", "Prestataire", "Montant", "Remboursé", "Statut", "Actions"]} minWidth="60rem">
        {items.map((p) => (
          <tr key={p.id}>
            <Td className="tabular">{formatDateTime(p.createdAt)}</Td>
            <Td><Link href={`/admin/reservations?q=${p.booking.reference}`} className="font-mono hover:underline">{p.booking.reference}</Link>{p.receiptNumber && <span className="block text-xs text-muted-foreground">{p.receiptNumber}</span>}</Td>
            <Td>{p.provider}<span className="block max-w-40 truncate font-mono text-xs text-muted-foreground">{p.providerPaymentId ?? p.providerSessionId}</span></Td>
            <Td className="tabular">{formatMoney(p.amount, p.currency)}</Td>
            <Td className="tabular">{p.amountRefunded ? formatMoney(p.amountRefunded, p.currency) : "-"}{p.refunds.filter((r) => r.status !== "SUCCEEDED").map((r) => <span key={r.id} className="block text-xs text-warning">{r.status} {formatMoney(r.amount, r.currency)}</span>)}</Td>
            <Td><Badge tone={p.status === "SUCCEEDED" ? "success" : p.status === "FAILED" ? "danger" : "neutral"}>{p.status}</Badge>{p.failureReason && <span className="block text-xs text-destructive">{p.failureReason}</span>}</Td>
            <Td>{isAdmin && ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(p.status) && <RefundForm paymentId={p.id} max={p.amount - p.amountRefunded} />}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}

async function Payouts({ status, isAdmin }: { status?: string; isAdmin: boolean }) {
  const items = await listPayouts(status);
  return (
    <>
      <FilterTabs items={[["", "Tous"], ["BLOCKED", "Bloqués"], ["PENDING", "En attente"], ["FAILED", "Échoués"], ["PAID", "Versés"]]} current={status ?? ""} param="status" base={{ vue: "versements" }} />
      <Table head={["Créé le", "Réservation", "Voyageur", "Montant", "Statut", "Actions"]} minWidth="52rem">
        {items.map((p) => (
          <tr key={p.id}>
            <Td className="tabular">{formatDateTime(p.createdAt)}</Td>
            <Td className="font-mono">{p.booking.reference}</Td>
            <Td><Link href={`/admin/utilisateurs/${p.traveler.id}`} className="hover:underline">{p.traveler.email}</Link></Td>
            <Td className="tabular">{formatMoney(p.amount, p.currency)}</Td>
            <Td><Badge tone={p.status === "PAID" ? "success" : p.status === "BLOCKED" || p.status === "FAILED" ? "danger" : "warning"}>{p.status}</Badge>{p.blockedReason && <span className="block text-xs text-muted-foreground">{p.blockedReason}</span>}</Td>
            <Td>{isAdmin && ["BLOCKED", "FAILED", "PENDING"].includes(p.status) && <RunAction fn={retryPayoutAction} payload={{ bookingId: p.bookingId }} label="Relancer" success="Versement relancé (voir statut)" />}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
