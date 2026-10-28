"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";

export function TwoFactorForm({ next }: { next: string }) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [backup, setBackup] = React.useState(false);
  const [trust, setTrust] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const res = backup ? await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice: trust }) : await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice: trust });
        setPending(false);
        if (res.error) setError(res.error.status === 429 ? "Trop de tentatives. Patientez une minute." : "Code invalide.");
        else {
          router.push(next);
          router.refresh();
        }
      }}
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <Field id="code" label={backup ? "Code de secours" : "Code à 6 chiffres"}>
        <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode={backup ? "text" : "numeric"} autoComplete="one-time-code" maxLength={backup ? 20 : 6} className="text-center font-mono text-lg tracking-[0.4em]" />
      </Field>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={trust} onChange={(e) => setTrust(e.target.checked)} />Faire confiance à cet appareil pendant 30 jours</label>
      <Button type="submit" size="lg" loading={pending}>Vérifier</Button>
      <Button type="button" variant="link" onClick={() => setBackup((b) => !b)}>{backup ? "Utiliser l'application d'authentification" : "Utiliser un code de secours"}</Button>
    </form>
  );
}
