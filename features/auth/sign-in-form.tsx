"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";
import { signInSchema } from "./schemas";
import { GoogleIcon } from "./auth-card";
import type { z } from "zod";

export function SignInForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [unverified, setUnverified] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    setUnverified(null);
    const res = await authClient.signIn.email({ email: v.email, password: v.password, callbackURL: next });
    if (res.error) {
      if (res.error.status === 403 && /verif/i.test(res.error.message ?? "")) {
        setUnverified(v.email);
        return;
      }
      setError(res.error.status === 429 ? "Trop de tentatives. Patientez une minute avant de réessayer." : res.error.status === 401 ? "Email ou mot de passe incorrect." : (res.error.message ?? "Connexion impossible."));
      return;
    }
    if ((res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      router.push(`/connexion/2fa?next=${encodeURIComponent(next)}`);
      return;
    }
    router.push(next);
    router.refresh();
  });

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4" noValidate>
      {error && <Alert tone="danger">{error}</Alert>}
      {unverified && (
        <Alert tone="warning" title="Adresse email non confirmée">
          Nous venons de vous renvoyer un lien de confirmation à {unverified}. Pensez à vérifier vos courriers indésirables.
        </Alert>
      )}
      <Field id="email" label="Adresse email" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </Field>
      <Field id="password" label="Mot de passe" error={form.formState.errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...form.register("password")} />
      </Field>
      <div className="-mt-1 text-right text-sm">
        <Link href="/mot-de-passe-oublie" className="font-medium text-primary hover:underline">Mot de passe oublié ?</Link>
      </div>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>Se connecter</Button>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
          <Button type="button" variant="outline" size="lg" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next })}>
            <GoogleIcon />Continuer avec Google
          </Button>
        </>
      )}
    </form>
  );
}
