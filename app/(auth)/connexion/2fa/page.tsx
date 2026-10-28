import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/auth-card";
import { TwoFactorForm } from "@/features/auth/two-factor-form";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Double authentification", robots: { index: false } };

export default async function TwoFactorPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthCard title="Double authentification" description="Saisissez le code à 6 chiffres affiché par votre application d'authentification, ou un code de secours.">
      <TwoFactorForm next={safeNext(next)} />
    </AuthCard>
  );
}
