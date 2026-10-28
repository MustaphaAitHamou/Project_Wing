import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/auth/auth-card";
import { OnboardingForm } from "@/features/auth/onboarding-form";
import { getCurrentUser } from "@/server/auth/session";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Bienvenue", robots: { index: false } };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (user.termsAccepted) redirect(safeNext(next));
  return (
    <AuthCard title={`Bienvenue ${user.firstName || ""}`.trim()} description="Encore une étape avant d'utiliser Tamurt Sending.">
      <OnboardingForm next={safeNext(next)} />
    </AuthCard>
  );
}
