"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { createReportAction } from "./actions";

const REASONS = { fraud: "Fraude ou arnaque", prohibited_item: "Objet interdit", harassment: "Harcèlement", spam: "Spam", fake_profile: "Faux profil", inappropriate: "Contenu inapproprié", other: "Autre" } as const;

export function ReportDialog({ open, onOpenChange, targetType, targetId }: { open: boolean; onOpenChange: (o: boolean) => void; targetType: "USER" | "PARCEL" | "TRIP" | "MESSAGE" | "REVIEW"; targetId: string }) {
  const [reason, setReason] = React.useState<keyof typeof REASONS>("fraud");
  const [details, setDetails] = React.useState("");
  const r = useAction(createReportAction, { success: "Signalement transmis à la modération", refresh: false, onSuccess: () => onOpenChange(false) });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Signaler" description="Notre équipe de modération examinera ce signalement. L'utilisateur concerné n'est pas informé de votre identité.">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void r.run({ targetType, targetId, reason, details: details || undefined }); }}>
          <Field id="report-reason" label="Motif"><Select value={reason} onChange={(e) => setReason(e.target.value as keyof typeof REASONS)}>{Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field id="report-details" label="Précisions" optional><Textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} /></Field>
          <div className="flex justify-end gap-2"><DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose><Button type="submit" loading={r.pending}>Envoyer</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReportButton(props: { targetType: "USER" | "PARCEL" | "TRIP" | "MESSAGE" | "REVIEW"; targetId: string; label?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="link" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>{props.label ?? "Signaler"}</Button>
      <ReportDialog open={open} onOpenChange={setOpen} targetType={props.targetType} targetId={props.targetId} />
    </>
  );
}
