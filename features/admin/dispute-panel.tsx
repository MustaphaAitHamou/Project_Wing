"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, NumberInput, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { formatMoney } from "@/lib/domain/money";
import { disputeStaffMessageAction, resolveDisputeAction } from "./actions";

export function DisputeAdminPanel({ disputeId, isAdmin, refundable }: { disputeId: string; isAdmin: boolean; refundable: number }) {
  const [note, setNote] = React.useState("");
  const [internal, setInternal] = React.useState(false);
  const [resolution, setResolution] = React.useState<"FULL_REFUND" | "PARTIAL_REFUND" | "RELEASE_PAYOUT" | "NO_ACTION">("RELEASE_PAYOUT");
  const [amount, setAmount] = React.useState("");
  const [decision, setDecision] = React.useState("");
  const msg = useAction(disputeStaffMessageAction, { success: "Message ajouté", onSuccess: () => setNote("") });
  const res = useAction(resolveDisputeAction, { success: "Décision appliquée" });
  return (
    <div className="grid gap-6 border-t pt-4">
      <div className="grid gap-3">
        <Field id="staff-note" label="Message aux parties ou note interne"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={internal} onChange={(e) => setInternal(e.target.checked)} />Note interne (non visible des parties)</label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" loading={msg.pending} disabled={note.trim().length < 2} onClick={() => msg.run({ disputeId, note, internal, requestInfo: false })}>Publier</Button>
          <Button variant="outline" disabled={note.trim().length < 2 || internal} onClick={() => msg.run({ disputeId, note, internal: false, requestInfo: true })}>Demander des informations</Button>
        </div>
      </div>
      {isAdmin ? (
        <form className="grid gap-3 rounded-xl border p-4" onSubmit={(e) => { e.preventDefault(); void res.run({ disputeId, resolution, refundAmount: resolution === "PARTIAL_REFUND" ? amount : undefined, note: decision }); }}>
          <p className="font-semibold">Décision</p>
          <Field id="resolution" label="Résolution">
            <Select value={resolution} onChange={(e) => setResolution(e.target.value as typeof resolution)}>
              <option value="RELEASE_PAYOUT">Clôturer et payer le voyageur</option>
              <option value="FULL_REFUND">Remboursement intégral ({formatMoney(refundable, "EUR")})</option>
              <option value="PARTIAL_REFUND">Remboursement partiel, puis paiement du solde au voyageur</option>
              <option value="NO_ACTION">Sans suite : reprendre le parcours</option>
            </Select>
          </Field>
          {resolution === "PARTIAL_REFUND" && <Field id="partial" label="Montant remboursé (€)" error={res.fieldErrors.refundAmount?.[0]}><NumberInput value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>}
          <Field id="decision" label="Motivation (visible des parties)" error={res.fieldErrors.note?.[0]}><Textarea rows={3} value={decision} onChange={(e) => setDecision(e.target.value)} /></Field>
          <Button type="submit" variant="destructive" className="w-fit" loading={res.pending}>Appliquer la décision</Button>
          <p className="text-xs text-muted-foreground">Les remboursements sont exécutés par le prestataire de paiement. La décision est journalisée.</p>
        </form>
      ) : <p className="text-sm text-muted-foreground">Les décisions financières sont réservées aux administrateurs.</p>}
    </div>
  );
}
