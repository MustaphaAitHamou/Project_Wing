import type { Metadata } from "next";
import { Star } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { EmptyState, PageHeader, Stars } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Avis" };

export default async function ReviewsPage() {
  const user = await requireUserPage("/tableau-de-bord/avis");
  const [received, written, profile] = await Promise.all([
    db.review.findMany({ where: { subjectId: user.id, status: "VISIBLE" }, orderBy: { createdAt: "desc" }, include: { author: { select: { firstName: true } } } }),
    db.review.findMany({ where: { authorId: user.id }, orderBy: { createdAt: "desc" }, include: { subject: { select: { firstName: true } } } }),
    db.userProfile.findUnique({ where: { userId: user.id } }),
  ]);
  const avg = profile?.ratingCount ? profile.ratingSum / profile.ratingCount : null;
  return (
    <div className="grid gap-8">
      <PageHeader title="Avis" description="Les avis ne peuvent être laissés qu'après une transaction terminée." />
      <section className="grid gap-3"><h2 className="flex items-center gap-3 text-lg font-semibold">Avis reçus <Stars value={avg} count={profile?.ratingCount} /></h2>{received.length ? <ReviewList items={received.map((r) => ({ ...r, who: `De ${r.author.firstName}` }))} /> : <EmptyState icon={Star} title="Aucun avis reçu" />}</section>
      <section className="grid gap-3"><h2 className="text-lg font-semibold">Avis donnés</h2>{written.length ? <ReviewList items={written.map((r) => ({ ...r, who: `Pour ${r.subject.firstName}` }))} /> : <p className="text-sm text-muted-foreground">Aucun avis donné.</p>}</section>
    </div>
  );
}

function ReviewList({ items }: { items: { id: string; who: string; rating: number; comment: string | null; createdAt: Date }[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((r) => (
        <li key={r.id} className="grid gap-1 rounded-xl border bg-card p-4 text-sm">
          <div className="flex items-center justify-between"><span className="font-medium">{r.who}</span><Stars value={r.rating} /></div>
          {r.comment && <p>« {r.comment} »</p>}
          <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
