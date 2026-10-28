import { listAudit } from "@/server/services/admin";
import { PageHeader } from "@/components/ui/misc";
import { Table, Td } from "@/features/admin/ui";
import { Pagination } from "@/components/marketplace/pagination";
import { formatDateTime } from "@/lib/utils";

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ action?: string; target?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await listAudit({ action: sp.action, targetId: sp.target }, page);
  return (
    <div className="grid gap-5">
      <PageHeader title="Journal d'audit" description="Actions sensibles : administration, paiements, OTP, vérifications. Non modifiable depuis l'interface." />
      <form className="flex flex-wrap gap-2">
        <input name="action" defaultValue={sp.action} placeholder="Action (ex. dispute, user.suspend)" aria-label="Filtrer par action" className="h-10 rounded-lg border border-input bg-card px-3 text-sm" />
        <input name="target" defaultValue={sp.target} placeholder="Identifiant de la cible" aria-label="Filtrer par cible" className="h-10 rounded-lg border border-input bg-card px-3 text-sm" />
        <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Filtrer</button>
      </form>
      <Table head={["Date", "Acteur", "Action", "Cible", "Détails"]} minWidth="56rem">
        {items.map((l) => (
          <tr key={l.id}>
            <Td className="whitespace-nowrap tabular">{formatDateTime(l.createdAt)}</Td>
            <Td>{l.actor?.email ?? "Système"}</Td>
            <Td className="font-mono text-xs">{l.action}</Td>
            <Td className="font-mono text-xs">{l.targetType}{l.targetId ? ` · ${l.targetId}` : ""}</Td>
            <Td><code className="block max-w-md overflow-x-auto whitespace-pre text-xs text-muted-foreground">{l.metadata ? JSON.stringify(l.metadata) : ""}</code></Td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} pageSize={50} params={{ action: sp.action, target: sp.target }} />
    </div>
  );
}
