"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { startPayoutOnboardingAction } from "@/features/account/actions";

export function PayoutOnboarding({ countries }: { countries: { code: string; name: string; enabled: boolean }[] }) {
  const [country, setCountry] = React.useState(countries.find((c) => c.enabled)?.code ?? countries[0]?.code ?? "FR");
  const a = useAction(startPayoutOnboardingAction, { refresh: false, onSuccess: (d) => { window.location.href = d.url; } });
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field id="payout-country" label="Pays de votre compte bancaire">
        <Select value={country} onChange={(e) => setCountry(e.target.value)}>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}{c.enabled ? "" : " (non disponible)"}</option>)}</Select>
      </Field>
      <Button loading={a.pending} onClick={() => a.run({ countryCode: country })}>Configurer mon compte</Button>
    </div>
  );
}
