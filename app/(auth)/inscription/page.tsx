import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/auth/auth-card";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { getCurrentUser } from "@/server/auth/session";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Créer un compte", description: "Inscription gratuite à Tamurt Sending pour envoyer ou transporter des colis." };

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/tableau-de-bord");
  return (
    <AuthCard title="Créer votre compte" description="Gratuit. Vous confirmerez votre email avant de publier." footer={<>Déjà inscrit ? <Link href="/connexion" className="font-semibold text-primary hover:underline">Se connecter</Link></>}>
      <SignUpForm googleEnabled={!!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)} />
    </AuthCard>
  );
}
