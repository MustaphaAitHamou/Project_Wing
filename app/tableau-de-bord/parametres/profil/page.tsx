import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { PageHeader } from "@/components/ui/misc";
import { ProfileForm } from "@/features/account/profile-form";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUserPage("/tableau-de-bord/parametres/profil");
  const u = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { profile: true } });
  return (
    <div className="grid max-w-2xl gap-6">
      <PageHeader title="Profil" description="Votre prénom, l'initiale de votre nom, votre photo, votre ville et votre présentation sont visibles sur votre profil public. Votre email et votre téléphone ne le sont jamais." actions={<Link href={`/profil/${user.id}`} className="text-sm font-semibold text-primary">Voir mon profil public →</Link>} />
      <ProfileForm initial={{ firstName: u.firstName, lastName: u.lastName, phone: u.phone ?? "", bio: u.profile?.bio ?? "", city: u.profile?.city ?? "", image: u.image, email: u.email }} />
    </div>
  );
}
