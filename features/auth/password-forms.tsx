"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema, resetPasswordSchema } from "./schemas";

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  if (sent) return <Alert tone="success" title="Demande enregistrée">Si un compte correspond à cette adresse, un email de réinitialisation vient d&apos;être envoyé.</Alert>;
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (v) => {
        setError(null);
        const res = await authClient.requestPasswordReset({ email: v.email, redirectTo: "/reinitialiser-mot-de-passe" });
        // Même réponse que le compte existe ou non (pas d'énumération d'adresses).
        if (res.error?.status === 429) setError("Trop de demandes. Réessayez dans une heure.");
        else setSent(true);
      })}
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <Field id="email" label="Adresse email" error={form.formState.errors.email?.message}><Input type="email" autoComplete="email" {...form.register("email")} /></Field>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>Envoyer le lien</Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (v) => {
        setError(null);
        const res = await authClient.resetPassword({ newPassword: v.password, token });
        if (res.error) setError("Le lien est invalide ou a expiré. Demandez-en un nouveau.");
        else router.push("/connexion?reinitialise=1");
      })}
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <Field id="password" label="Nouveau mot de passe" hint="10 caractères minimum, avec majuscule, minuscule et chiffre." error={form.formState.errors.password?.message}><Input type="password" autoComplete="new-password" {...form.register("password")} /></Field>
      <Field id="confirmPassword" label="Confirmation" error={form.formState.errors.confirmPassword?.message}><Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} /></Field>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>Enregistrer</Button>
    </form>
  );
}
