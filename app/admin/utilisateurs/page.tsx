import Link from "next/link";
import { searchUsers } from "@/server/services/admin";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { SearchBox, Table, Td } from "@/features/admin/ui";
import { Pagination } from "@/components/marketplace/pagination";
import { formatDate } from "@/lib/utils";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page = "1" } = await searchParams;
  const p = Math.max(1, Number(page) || 1);
  const { items, total } = await searchUsers(q.trim(), p);
  return (
    <div className="grid gap-5">
      <PageHeader title="Utilisateurs" description={`${total} compte(s)`} />
      <SearchBox q={q} placeholder="Email, prénom, nom ou identifiant" />
      <Table head={["Utilisateur", "Inscription", "Rôle", "Statut", "Email", "Identité", "2FA"]}>
        {items.map((u) => (
          <tr key={u.id}>
            <Td><Link href={`/admin/utilisateurs/${u.id}`} className="font-medium hover:underline">{u.firstName} {u.lastName}</Link><span className="block text-xs text-muted-foreground">{u.email}</span></Td>
            <Td className="tabular">{formatDate(u.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" })}</Td>
            <Td><Badge tone={u.role === "USER" ? "neutral" : "accent"}>{u.role}</Badge></Td>
            <Td><Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>{u.status === "ACTIVE" ? "Actif" : "Suspendu"}</Badge></Td>
            <Td>{u.emailVerified ? "Confirmé" : "Non confirmé"}</Td>
            <Td>{u.profile?.kycStatus ?? "UNVERIFIED"}</Td>
            <Td>{u.twoFactorEnabled ? "Oui" : "Non"}</Td>
          </tr>
        ))}
      </Table>
      <Pagination page={p} total={total} pageSize={25} params={{ q }} />
    </div>
  );
}
