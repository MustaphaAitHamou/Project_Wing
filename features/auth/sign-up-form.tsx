"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";
import { COUNTRY_OPTIONS, signUpFormSchema } from "./schemas";
import { GoogleIcon } from "./auth-card";
import type { z } from "zod";

type Values = z.input<typeof signUpFormSchema>;

export function SignUpForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<Values, unknown, z.output<typeof signUpFormSchema>>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", countryCode: "FR", password: "", confirmPassword: "", acceptTerms: false as unknown as true },
  });
  const e = form.formState.errors;

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const res = await authClient.signUp.email({
      email: v.email, password: v.password, name: `${v.firstName} ${v.lastName}`,
      firstName: v.firstName, lastName: v.lastName, phone: v.phone, countryCode: v.countryCode,
      // Champ contrôlé côté serveur (hook Better Auth) : refus si absent.
      ...({ acceptTerms: v.acceptTerms } as object),
      callbackURL: "/tableau-de-bord?bienvenue=1",
    } as Parameters<typeof authClient.signUp.email>[0]);
    if (res.error) {
      setError(res.error.status === 422 || /exist/i.test(res.error.message ?? "") ? "Un compte existe déjà avec cette adresse email." : res.error.status === 429 ? "Trop de tentatives. Réessayez plus tard." : (res.error.message ?? "Inscription impossible."));
      return;
    }
    router.push(`/verification-email?email=${encodeURIComponent(v.email)}`);
  });

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-4" noValidate>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="firstName" label="Prénom" error={e.firstName?.message}><Input autoComplete="given-name" {...form.register("firstName")} /></Field>
        <Field id="lastName" label="Nom" error={e.lastName?.message}><Input autoComplete="family-name" {...form.register("lastName")} /></Field>
      </div>
      <Field id="email" label="Adresse email" error={e.email?.message}><Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} /></Field>
      <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
        <Field id="countryCode" label="Pays de résidence" error={e.countryCode?.message}>
          <Select autoComplete="country" {...form.register("countryCode")}>
            {COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </Select>
        </Field>
        <Field id="phone" label="Téléphone" hint="Format international, ex. +33612345678" error={e.phone?.message}><Input type="tel" autoComplete="tel" inputMode="tel" {...form.register("phone")} /></Field>
      </div>
      <Field id="password" label="Mot de passe" hint="10 caractères minimum, avec majuscule, minuscule et chiffre." error={e.password?.message}><Input type="password" autoComplete="new-password" {...form.register("password")} /></Field>
      <Field id="confirmPassword" label="Confirmation du mot de passe" error={e.confirmPassword?.message}><Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} /></Field>
      <div className="grid gap-1">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox id="acceptTerms" className="mt-0.5" aria-invalid={e.acceptTerms ? true : undefined} {...form.register("acceptTerms")} />
          <span>J&apos;accepte les <Link href="/conditions-generales" target="_blank" className="font-medium text-primary underline">conditions générales</Link> et j&apos;ai pris connaissance de la <Link href="/confidentialite" target="_blank" className="font-medium text-primary underline">politique de confidentialité</Link>.</span>
        </label>
        {e.acceptTerms && <p className="text-xs font-medium text-destructive" role="alert">{e.acceptTerms.message}</p>}
      </div>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>Créer mon compte</Button>
      {googleEnabled && (
        <Button type="button" variant="outline" size="lg" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/bienvenue" })}>
          <GoogleIcon />S&apos;inscrire avec Google
        </Button>
      )}
      <p className="text-xs text-muted-foreground">Un seul compte vous permet d&apos;envoyer des colis et de proposer vos trajets.</p>
    </form>
  );
}
