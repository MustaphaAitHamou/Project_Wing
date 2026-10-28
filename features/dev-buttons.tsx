"use client";
import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/hooks/use-action";
import { simulateCheckoutAction, simulateKycAction, simulatePayoutAccountAction } from "./dev-actions";

export function CheckoutSimulator({ sessionId }: { sessionId: string }) {
  const a = useAction(simulateCheckoutAction, { refresh: false });
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" loading={a.pending} onClick={() => a.run({ sessionId, outcome: "success" })}>Simuler un paiement réussi</Button>
      <Button size="lg" variant="outline" disabled={a.pending} onClick={() => a.run({ sessionId, outcome: "failure" })}>Simuler un refus de carte</Button>
      <Button size="lg" variant="ghost" disabled={a.pending} onClick={() => a.run({ sessionId, outcome: "cancel" })}>Abandonner</Button>
    </div>
  );
}

export function KycSimulator({ refId }: { refId: string }) {
  const a = useAction(simulateKycAction, { refresh: false });
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" loading={a.pending} onClick={() => a.run({ ref: refId, outcome: "VERIFIED" })}>Simuler une identité vérifiée</Button>
      <Button size="lg" variant="outline" disabled={a.pending} onClick={() => a.run({ ref: refId, outcome: "REJECTED" })}>Simuler un refus</Button>
    </div>
  );
}

export function PayoutAccountSimulator({ accountId }: { accountId: string }) {
  const a = useAction(simulatePayoutAccountAction, { refresh: false });
  return <Button size="lg" loading={a.pending} onClick={() => a.run({ accountId })}>Simuler la configuration du compte de versement</Button>;
}
