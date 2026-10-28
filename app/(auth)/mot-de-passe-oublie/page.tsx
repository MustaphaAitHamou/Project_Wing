import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";
import { ForgotPasswordForm } from "@/features/auth/password-forms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Mot de passe oublié" description="Saisissez votre email : si un compte existe, vous recevrez un lien de réinitialisation valable 1 heure." footer={<Link href="/connexion" className="font-semibold text-primary hover:underline">Retour à la connexion</Link>}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
