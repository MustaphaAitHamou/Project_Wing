import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, Star } from "lucide-react";
import { getPublicProfile } from "@/server/services/reviews";
import { getCurrentUser } from "@/server/auth/session";
import { Avatar, EmptyState, Stars } from "@/components/ui/misc";
import { TripCard } from "@/components/marketplace/cards";
import { ReportButton } from "@/features/reports/report-dialog";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPublicProfile((await params).id);
  return { title: p ? `Profil de ${p.displayName}` : "Profil introuvable", robots: { index: false } };
}

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const [p, viewer] = await Promise.all([getPublicProfile(id), getCurrentUser()]);
  if (!p) notFound();
  const pr = p.profile;
  return (
    <div className="container-page grid max-w-4xl gap-8 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={p.firstName} src={p.image} size={88} />
        <div className="grid gap-1">
          <h1 className="flex items-center gap-2 text-3xl font-bold">{p.displayName}{pr?.kycStatus === "VERIFIED" && <BadgeCheck className="size-6 text-primary" aria-label="Identité vérifiée" />}</h1>
          <p className="text-sm text-muted-foreground">Membre depuis {formatDate(p.memberSince, { month: "long", year: "numeric" })}{pr?.city ? ` · ${pr.city}` : ""}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm"><Stars value={pr?.ratingCount ? pr.ratingSum / pr.ratingCount : null} count={pr?.ratingCount} /><span>{pr?.deliveriesCount ?? 0} livraison(s) effectuée(s)</span><span>{pr?.shipmentsCount ?? 0} envoi(s)</span><span className={pr?.kycStatus === "VERIFIED" ? "text-primary" : "text-muted-foreground"}>{pr?.kycStatus === "VERIFIED" ? "Identité vérifiée" : "Identité non vérifiée"}</span></div>
        </div>
      </header>
      {pr?.bio && <p className="max-w-2xl whitespace-pre-line">{pr.bio}</p>}
      {p.trips.length > 0 && <section className="grid gap-3"><h2 className="text-xl font-semibold">Prochains trajets</h2><div className="grid gap-4 sm:grid-cols-2">{p.trips.map((t) => <TripCard key={t.id} trip={{ ...t, traveler: { firstName: p.firstName, image: p.image, profile: pr } }} />)}</div></section>}
      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Avis</h2>
        {p.reviews.length === 0 ? <EmptyState icon={Star} title="Pas encore d'avis" description="Les avis sont laissés uniquement après une transaction terminée." /> : (
          <ul className="grid gap-3">{p.reviews.map((r) => <li key={r.id} className="grid gap-1 rounded-xl border bg-card p-4 text-sm"><div className="flex items-center justify-between"><span className="font-medium">{r.author.firstName}</span><Stars value={r.rating} /></div>{r.comment && <p>« {r.comment} »</p>}<span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span></li>)}</ul>
        )}
      </section>
      {viewer && viewer.id !== p.id && <ReportButton targetType="USER" targetId={p.id} label="Signaler ce profil" />}
    </div>
  );
}
