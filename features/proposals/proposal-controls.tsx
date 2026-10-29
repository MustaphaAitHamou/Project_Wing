"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, NumberInput, Select, Textarea } from "@/components/ui/input";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { useAction } from "@/lib/hooks/use-action";
import { acceptProposalAction, createProposalAction, rejectProposalAction, withdrawProposalAction } from "./actions";

export function RespondToProposal({ id }: { id: string }) {
  const router = useRouter();
  const accept = useAction(acceptProposalAction, { success: "Proposition acceptée : réservation créée", onSuccess: (d) => router.push(`/tableau-de-bord/reservations/${d.bookingId}`) });
  const reject = useAction(rejectProposalAction, { success: "Proposition refusée" });
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction label={<><Check />Accepter</>} variant="default" size="sm" title="Accepter cette proposition ?" description="Le prix sera figé et une réservation sera créée. Les autres propositions pour ce colis seront refusées." confirmLabel="Accepter et réserver" onConfirm={() => accept.run({ id })} />
      <Button size="sm" variant="ghost" loading={reject.pending} onClick={() => reject.run({ id })}><X />Refuser</Button>
    </div>
  );
}

export function WithdrawProposal({ id }: { id: string }) {
  const w = useAction(withdrawProposalAction, { success: "Proposition retirée" });
  return <ConfirmAction label="Retirer" size="sm" variant="ghost" title="Retirer votre proposition ?" confirmLabel="Retirer" destructive onConfirm={() => w.run({ id })} />;
}

/**
 * Formulaire de proposition :
 * - voyageur sur un colis : choisit l'un de ses trajets compatibles ;
 * - expéditeur sur un trajet : choisit l'un de ses colis publiés.
 */
export function ProposeDialog({ mode, fixedId, options, suggestedPrice, triggerLabel }: { mode: "traveler" | "sender"; fixedId: string; options: { id: string; label: string; suggested?: number }[]; suggestedPrice?: number; triggerLabel: string }) {
  const [open, setOpen] = React.useState(false);
  const [choice, setChoice] = React.useState(options[0]?.id ?? "");
  const sug = options.find((o) => o.id === choice)?.suggested ?? suggestedPrice;
  const [price, setPrice] = React.useState(sug ? String(sug / 100) : "");
  const [message, setMessage] = React.useState("");
  const create = useAction(createProposalAction, { success: "Proposition envoyée", onSuccess: () => setOpen(false) });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Send />{triggerLabel}</Button></DialogTrigger>
      <DialogContent title={triggerLabel} description={mode === "traveler" ? "L'expéditeur pourra accepter ou refuser. Le prix est figé à l'acceptation." : "Le voyageur pourra accepter ou refuser votre demande."}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void create.run({ parcelId: mode === "traveler" ? fixedId : choice, tripId: mode === "traveler" ? choice : fixedId, price, message: message || undefined });
          }}
        >
          <Field id="proposal-choice" label={mode === "traveler" ? "Votre trajet" : "Votre colis"}>
            <Select value={choice} onChange={(e) => { setChoice(e.target.value); const s2 = options.find((o) => o.id === e.target.value)?.suggested; if (s2) setPrice(String(s2 / 100)); }}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select>
          </Field>
          <Field id="proposal-price" label="Prix du transport (€)" hint="Une commission de plateforme s'applique selon les conditions affichées sur la page Tarifs." error={create.fieldErrors.price?.[0]}>
            <NumberInput value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field id="proposal-message" label="Message" optional error={create.fieldErrors.message?.[0]}>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Présentez-vous, précisez où et quand récupérer le colis…" />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
            <Button type="submit" loading={create.pending}>Envoyer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
