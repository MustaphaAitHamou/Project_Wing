"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { completeOnboarding } from "./actions";
import { COUNTRY_OPTIONS } from "./schemas";

export function OnboardingForm({ next }: { next: string }) {
  const [phone, setPhone] = React.useState("");
  const [country, setCountry] = React.useState("FR");
  const [accept, setAccept] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await completeOnboarding({ acceptTerms: accept as true, phone, countryCode: country, next });
          if (r && !r.ok) {
            setError(r.error);
            setErrors(r.fieldErrors ?? {});
          }
        });
      }}
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <Field id="countryCode" label="Pays de résidence"><Select value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</Select></Field>
      <Field id="phone" label="Téléphone" hint="Format international, ex. +33612345678" error={errors.phone?.[0]}><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></Field>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox className="mt-0.5" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
        <span>J&apos;accepte les <Link href="/conditions-generales" target="_blank" className="font-medium text-primary underline">conditions générales</Link> et la <Link href="/confidentialite" target="_blank" className="font-medium text-primary underline">politique de confidentialité</Link>.</span>
      </label>
      {errors.acceptTerms && <p className="text-xs font-medium text-destructive">{errors.acceptTerms[0]}</p>}
      <Button type="submit" size="lg" loading={pending}>Continuer</Button>
    </form>
  );
}
