"use client";
import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./dialog";
import { Textarea, Field } from "./input";

/** Bouton avec étape de confirmation explicite (et motif facultatif ou requis). */
export function ConfirmAction({
  label, title, description, confirmLabel = "Confirmer", onConfirm, variant = "outline", size, destructive, reason, children,
}: {
  label: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: (reason: string) => Promise<unknown>;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  destructive?: boolean;
  reason?: { label: string; required?: boolean; placeholder?: string };
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [pending, setPending] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant={variant} size={size}>{label}</Button></DialogTrigger>
      <DialogContent title={title} description={description}>
        {children}
        {reason && <Field id="confirm-reason" label={reason.label} optional={!reason.required}><Textarea rows={3} value={text} placeholder={reason.placeholder} onChange={(e) => setText(e.target.value)} /></Field>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose>
          <Button
            variant={destructive ? "destructive" : "default"}
            loading={pending}
            disabled={!!reason?.required && text.trim().length < 5}
            onClick={async () => {
              setPending(true);
              const ok = await onConfirm(text.trim());
              setPending(false);
              if (ok !== null) setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
