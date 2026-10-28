"use client";
import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { verifyCodeAction } from "./actions";

export function ScanConfirm({ bookingId, purpose }: { bookingId: string; purpose: "PICKUP" | "DELIVERY" }) {
  const [state, setState] = React.useState<"idle" | "pending" | "ok" | "error">("idle");
  const [error, setError] = React.useState("");
  const [token, setToken] = React.useState<string | null>(null);
  React.useEffect(() => {
    setToken(window.location.hash.slice(1) || null);
    // Retire le jeton de l'historique du navigateur.
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);
  if (state === "ok")
    return (
      <div className="grid justify-items-center gap-4 text-center">
        <CheckCircle2 className="size-14 text-success" aria-hidden />
        <h1 className="text-2xl font-bold">{purpose === "PICKUP" ? "Remise confirmée" : "Livraison confirmée"}</h1>
        <Button asChild><Link href={`/tableau-de-bord/reservations/${bookingId}`}>Voir la réservation</Link></Button>
      </div>
    );
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">{purpose === "PICKUP" ? "Confirmer la remise du colis" : "Confirmer la livraison"}</h1>
      <p className="text-sm text-muted-foreground">Ne confirmez qu&apos;après avoir vérifié le contenu du colis avec l&apos;expéditeur.</p>
      {!token && <Alert tone="danger">QR code incomplet. Saisissez plutôt le code à 6 chiffres depuis la page de la réservation.</Alert>}
      {state === "error" && <Alert tone="danger">{error}</Alert>}
      <Button size="lg" disabled={!token} loading={state === "pending"} onClick={async () => {
        setState("pending");
        const r = await verifyCodeAction({ bookingId, purpose, qrToken: token ?? undefined });
        if (r.ok) setState("ok");
        else { setError(r.error); setState("error"); }
      }}>Je confirme avoir {purpose === "PICKUP" ? "reçu le colis" : "remis le colis"}</Button>
    </div>
  );
}
