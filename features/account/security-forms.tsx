"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";
import { passwordSchema } from "@/features/auth/schemas";

export function ChangePasswordForm() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <form className="grid gap-4 rounded-2xl border bg-card p-5" onSubmit={async (e) => {
      e.preventDefault();
      const v = passwordSchema.safeParse(next);
      if (!v.success) return setErr(v.error.issues[0]!.message);
      setPending(true);
      setErr(null);
      const r = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
      setPending(false);
      if (r.error) setErr(r.error.status === 400 || r.error.status === 401 ? "Mot de passe actuel incorrect." : "Modification impossible.");
      else { toast.success("Mot de passe modifié. Vos autres sessions ont été déconnectées."); setCurrent(""); setNext(""); }
    }}>
      {err && <Alert tone="danger">{err}</Alert>}
      <Field id="current-password" label="Mot de passe actuel"><Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
      <Field id="new-password" label="Nouveau mot de passe" hint="10 caractères minimum, avec majuscule, minuscule et chiffre."><Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
      <Button type="submit" className="w-fit" loading={pending}>Modifier</Button>
    </form>
  );
}

export function TwoFactorSetup({ enabled, hasPassword }: { enabled: boolean; hasPassword: boolean }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [setup, setSetup] = React.useState<{ qr: string; secret: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  if (!hasPassword) return <Alert tone="info">Définissez un mot de passe (via « Mot de passe oublié ») pour activer la double authentification.</Alert>;

  if (enabled && !setup)
    return (
      <form className="grid gap-3 rounded-2xl border bg-card p-5" onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const r = await authClient.twoFactor.disable({ password });
        setPending(false);
        if (r.error) setErr("Mot de passe incorrect."); else { toast.success("Double authentification désactivée"); router.refresh(); }
      }}>
        <Alert tone="success">La double authentification est activée.</Alert>
        {err && <Alert tone="danger">{err}</Alert>}
        <Field id="2fa-off-pwd" label="Mot de passe (pour désactiver)"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Button type="submit" variant="outline" className="w-fit" loading={pending}>Désactiver</Button>
      </form>
    );

  return (
    <div className="grid gap-4 rounded-2xl border bg-card p-5 text-sm">
      {err && <Alert tone="danger">{err}</Alert>}
      {!setup ? (
        <form className="grid gap-3" onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setErr(null);
          const r = await authClient.twoFactor.enable({ password });
          setPending(false);
          if (r.error || !r.data || r.data.method !== "totp") return setErr("Mot de passe incorrect.");
          const uri = r.data.totpURI;
          setSetup({ qr: await QRCode.toString(uri, { type: "svg", margin: 1 }), secret: new URL(uri).searchParams.get("secret") ?? "", backupCodes: r.data.backupCodes });
        }}>
          <p>Protégez votre compte avec une application d&apos;authentification (Google Authenticator, Authy, 1Password…).</p>
          <Field id="2fa-pwd" label="Mot de passe"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button type="submit" className="w-fit" loading={pending}>Activer</Button>
        </form>
      ) : (
        <form className="grid gap-4" onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const r = await authClient.twoFactor.verifyTotp({ code });
          setPending(false);
          if (r.error) setErr("Code invalide, réessayez.");
          else { toast.success("Double authentification activée"); setSetup(null); router.refresh(); }
        }}>
          <p>1. Scannez ce QR code avec votre application :</p>
          <div className="w-48 rounded-xl bg-white p-2 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: setup.qr }} />
          <p className="text-xs text-muted-foreground">Ou saisissez la clé : <code className="break-all">{setup.secret}</code></p>
          <p>2. Conservez ces codes de secours en lieu sûr (chacun utilisable une fois) :</p>
          <ul className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-3 font-mono text-xs">{setup.backupCodes.map((c) => <li key={c}>{c}</li>)}</ul>
          <Field id="2fa-code" label="3. Saisissez le code affiché par l'application"><Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className="font-mono tracking-[0.3em]" /></Field>
          <Button type="submit" className="w-fit" loading={pending}>Confirmer l&apos;activation</Button>
        </form>
      )}
    </div>
  );
}

export function SessionsList() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  return (
    <Button variant="outline" className="w-fit" loading={pending} onClick={async () => {
      setPending(true);
      await authClient.revokeOtherSessions();
      setPending(false);
      toast.success("Autres sessions déconnectées");
      router.refresh();
    }}>Déconnecter les autres appareils</Button>
  );
}
