import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/features/auth/auth-card";
import { ResendVerification } from "@/features/auth/resend-verification";

export const metadata: Metadata = { title: "Confirmez votre email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthCard title="Confirmez votre adresse email" footer={<Link href="/connexion" className="font-semibold text-primary hover:underline">Retour à la connexion</Link>}>
      <div className="grid gap-4 text-sm">
        <MailCheck className="size-10 text-primary" aria-hidden />
        <p>Nous avons envoyé un lien de confirmation{email ? <> à <strong>{email}</strong></> : null}. Cliquez dessus pour activer votre compte. Le lien expire dans 24 heures.</p>
        <p className="text-muted-foreground">Rien reçu ? Vérifiez vos courriers indésirables, puis demandez un nouvel envoi.</p>
        {email && <ResendVerification email={email} />}
      </div>
    </AuthCard>
  );
}
