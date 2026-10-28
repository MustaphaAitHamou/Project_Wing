import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/auth/auth-card";
import { SignInForm } from "@/features/auth/sign-in-form";
import { getCurrentUser } from "@/server/auth/session";
import { env } from "@/lib/env";
import { Alert } from "@/components/ui/misc";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthCard title="Bon retour parmi nous" description="Connectez-vous pour gérer vos colis et vos trajets." footer={<>Pas encore de compte ? <Link href={`/inscription${sp.next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:underline">Créer un compte</Link></>}>
      {sp.verifie === "1" && <Alert tone="success" className="mb-4">Votre adresse email est confirmée. Vous pouvez vous connecter.</Alert>}
      {sp.reinitialise === "1" && <Alert tone="success" className="mb-4">Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.</Alert>}
      <SignInForm next={next} googleEnabled={!!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)} />
    </AuthCard>
  );
}
