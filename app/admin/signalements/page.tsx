import Link from "next/link";
import { db } from "@/server/db/client";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { FilterTabs, Table, Td } from "@/features/admin/ui";
import { RunAction } from "@/features/admin/run-action";
import { handleReportAction, hideMessageAction, moderateReviewAction } from "@/features/admin/actions";
import { REPORT_REASON_LABELS } from "@/server/services/reports";
import { formatDateTime } from "@/lib/utils";

const targetLink = (t: string, id: string) => ({ USER: `/admin/utilisateurs/${id}`, PARCEL: `/admin/annonces?q=${id}`, TRIP: `/admin/annonces?type=trajets&q=${id}` } as Record<string, string>)[t];

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "OPEN" } = await searchParams;
  const reports = await db.report.findMany({ where: status ? { status: status as never } : {}, orderBy: { createdAt: "desc" }, take: 100, include: { reporter: { select: { email: true } } } });
  const msgIds = reports.filter((r) => r.targetType === "MESSAGE").map((r) => r.targetId);
  const revIds = reports.filter((r) => r.targetType === "REVIEW").map((r) => r.targetId);
  const [msgs, revs] = await Promise.all([db.message.findMany({ where: { id: { in: msgIds } } }), db.review.findMany({ where: { id: { in: revIds } } })]);
  const msgMap = new Map(msgs.map((m) => [m.id, m]));
  const revMap = new Map(revs.map((r) => [r.id, r]));
  return (
    <div className="grid gap-5">
      <PageHeader title="Signalements" />
      <FilterTabs items={[["OPEN", "Ouverts"], ["REVIEWED", "Traités"], ["DISMISSED", "Classés"], ["", "Tous"]]} current={status} param="status" base={{}} />
      <Table head={["Date", "Cible", "Motif", "Signalé par", "Statut", "Actions"]} minWidth="56rem">
        {reports.map((r) => {
          const m = msgMap.get(r.targetId);
          const rv = revMap.get(r.targetId);
          const link = targetLink(r.targetType, r.targetId);
          return (
            <tr key={r.id}>
              <Td className="tabular">{formatDateTime(r.createdAt)}</Td>
              <Td>{link ? <Link href={link} className="hover:underline">{r.targetType}</Link> : r.targetType}{m && <span className="block max-w-xs truncate text-xs text-muted-foreground">« {m.body} »</span>}{rv && <span className="block max-w-xs truncate text-xs text-muted-foreground">{rv.rating}/5 « {rv.comment} »</span>}</Td>
              <Td>{REPORT_REASON_LABELS[r.reason as keyof typeof REPORT_REASON_LABELS] ?? r.reason}{r.details && <span className="block max-w-xs text-xs text-muted-foreground">{r.details}</span>}</Td>
              <Td>{r.reporter.email}</Td>
              <Td><Badge tone={r.status === "OPEN" ? "warning" : "neutral"}>{r.status}</Badge></Td>
              <Td><div className="flex flex-wrap gap-1">
                {r.status === "OPEN" && <><RunAction fn={handleReportAction} payload={{ reportId: r.id, status: "REVIEWED" }} label="Traité" success="Signalement traité" /><RunAction fn={handleReportAction} payload={{ reportId: r.id, status: "DISMISSED" }} label="Classer" variant="ghost" success="Signalement classé" /></>}
                {m && <RunAction fn={hideMessageAction} payload={{ messageId: m.id, hidden: !m.isHidden }} label={m.isHidden ? "Réafficher le message" : "Masquer le message"} success="Message mis à jour" />}
                {rv && <RunAction fn={moderateReviewAction} payload={{ reviewId: rv.id, status: rv.status === "HIDDEN" ? "VISIBLE" : "HIDDEN" }} label={rv.status === "HIDDEN" ? "Réafficher l'avis" : "Masquer l'avis"} success="Avis mis à jour" />}
              </div></Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
