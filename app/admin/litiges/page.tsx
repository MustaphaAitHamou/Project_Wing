import Link from "next/link";
import { db } from "@/server/db/client";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { FilterTabs, Table, Td } from "@/features/admin/ui";
import { DISPUTE_STATUS_LABELS, DISPUTE_TYPE_LABELS } from "@/server/services/disputes";
import { formatDateTime } from "@/lib/utils";

export default async function AdminDisputes({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "actifs" } = await searchParams;
  const where = status === "actifs" ? { status: { in: ["OPEN", "UNDER_REVIEW", "WAITING_FOR_INFORMATION"] as never[] } } : status ? { status: status as never } : {};
  const items = await db.dispute.findMany({ where, orderBy: { createdAt: "asc" }, take: 100, include: { booking: { select: { reference: true } }, openedBy: { select: { email: true } }, assignedTo: { select: { firstName: true } } } });
  return (
    <div className="grid gap-5">
      <PageHeader title="Litiges" description="File de traitement, des plus anciens aux plus récents." />
      <FilterTabs items={[["actifs", "À traiter"], ["OPEN", "Ouverts"], ["UNDER_REVIEW", "En examen"], ["WAITING_FOR_INFORMATION", "Infos demandées"], ["RESOLVED", "Résolus"], ["CLOSED", "Clôturés"]]} current={status} param="status" base={{}} />
      <Table head={["Ouvert le", "Type", "Réservation", "Ouvert par", "Assigné à", "Statut"]}>
        {items.map((d) => (
          <tr key={d.id}>
            <Td className="tabular">{formatDateTime(d.createdAt)}</Td>
            <Td><Link href={`/admin/litiges/${d.id}`} className="font-medium hover:underline">{DISPUTE_TYPE_LABELS[d.type]}</Link></Td>
            <Td className="font-mono">{d.booking.reference}</Td>
            <Td>{d.openedBy.email}</Td>
            <Td>{d.assignedTo?.firstName ?? "-"}</Td>
            <Td><Badge tone={["RESOLVED", "CLOSED"].includes(d.status) ? "success" : "danger"}>{DISPUTE_STATUS_LABELS[d.status]}</Badge></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
