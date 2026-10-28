"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { openDisputeAction } from "./actions";

const TYPES = { LOST: "Colis perdu", DAMAGED: "Colis endommagé", NOT_AS_DESCRIBED: "Colis non conforme", TRAVELER_NO_SHOW: "Transporteur absent", SENDER_NO_SHOW: "Expéditeur absent", RECIPIENT_UNAVAILABLE: "Destinataire indisponible", DELAY: "Retard", PAYMENT_CONTESTED: "Paiement contesté", OTHER: "Autre" } as const;

export function OpenDisputeButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [type, setType] = React.useState<keyof typeof TYPES>("DAMAGED");
  const [description, setDescription] = React.useState("");
  const o = useAction(openDisputeAction, { success: "Litige ouvert", onSuccess: (d) => router.push(`/tableau-de-bord/litiges/${d.id}`) });
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline"><TriangleAlert />Signaler un problème</Button></DialogTrigger>
      <DialogContent title="Signaler un problème" description="Un litige gèle la transaction (aucun versement) jusqu'à la décision de notre équipe. Vous pourrez ajouter des photos et justificatifs.">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void o.run({ bookingId, type, description }); }}>
          <Field id="dispute-type" label="Nature du problème"><Select value={type} onChange={(e) => setType(e.target.value as keyof typeof TYPES)}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field id="dispute-desc" label="Description" hint="Soyez factuel : dates, lieux, état du colis…" error={o.fieldErrors.description?.[0]}><Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
            <Button type="submit" variant="destructive" loading={o.pending}>Ouvrir le litige</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
