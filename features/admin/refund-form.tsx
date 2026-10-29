"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, NumberInput } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { formatMoney } from "@/lib/domain/money";
import { adminRefundAction } from "./actions";

export function RefundForm({ paymentId, max }: { paymentId: string; max: number }) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(String(max / 100));
  const [reason, setReason] = React.useState("");
  const a = useAction(adminRefundAction, { success: "Remboursement demandé au prestataire", onSuccess: () => setOpen(false) });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Rembourser</Button></DialogTrigger>
      <DialogContent title="Remboursement" description={`Exécuté par le prestataire de paiement. Maximum ${formatMoney(max, "EUR")}.`}>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void a.run({ paymentId, amount, reason }); }}>
          <Field id="refund-amount" label="Montant (€)" error={a.fieldErrors.amount?.[0]}><NumberInput value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field id="refund-reason" label="Motif (journalisé)" error={a.fieldErrors.reason?.[0]}><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-2"><DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose><Button type="submit" variant="destructive" loading={a.pending}>Rembourser</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
