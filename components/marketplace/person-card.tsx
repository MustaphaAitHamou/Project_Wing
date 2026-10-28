import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Avatar, Stars } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";

export function PersonCard({ person, role }: { person: { id: string; firstName: string; image: string | null; createdAt: Date; profile: { kycStatus: string; ratingSum: number; ratingCount: number; deliveriesCount?: number; shipmentsCount?: number; city?: string | null } | null }; role: "Voyageur" | "Expéditeur" }) {
  const p = person.profile;
  return (
    <Link href={`/profil/${person.id}`} className="grid gap-3 rounded-2xl border bg-card p-5 hover:border-primary/40">
      <div className="flex items-center gap-3">
        <Avatar name={person.firstName} src={person.image} size={48} />
        <div className="grid">
          <span className="flex items-center gap-1.5 font-semibold">{person.firstName}{p?.kycStatus === "VERIFIED" && <BadgeCheck className="size-4 text-primary" aria-label="Identité vérifiée" />}</span>
          <span className="text-xs text-muted-foreground">{role} · membre depuis {formatDate(person.createdAt, { month: "long", year: "numeric" })}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Stars value={p?.ratingCount ? p.ratingSum / p.ratingCount : null} count={p?.ratingCount} />
        {p?.deliveriesCount != null && <span className="text-muted-foreground">{p.deliveriesCount} livraison(s)</span>}
        <span className={p?.kycStatus === "VERIFIED" ? "text-primary" : "text-muted-foreground"}>{p?.kycStatus === "VERIFIED" ? "Identité vérifiée" : "Identité non vérifiée"}</span>
      </div>
    </Link>
  );
}
