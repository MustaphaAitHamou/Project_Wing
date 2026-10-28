import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";
import { ResetPasswordForm } from "@/features/auth/password-forms";
import { Alert } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <AuthCard title="Choisir un nouveau mot de passe" footer={<Link href="/connexion" className="font-semibold text-primary hover:underline">Retour à la connexion</Link>}>
      {!token || error ? (
        <Alert tone="danger" title="Lien invalide ou expiré">
          Demandez un nouveau lien depuis la page <Link href="/mot-de-passe-oublie">Mot de passe oublié</Link>.
        </Alert>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </AuthCard>
  );
}
