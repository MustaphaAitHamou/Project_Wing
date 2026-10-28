"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { useAction } from "@/lib/hooks/use-action";
import { sendContactAction } from "./actions";

export function ContactForm({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const [v, setV] = React.useState({ name: defaultName, email: defaultEmail, subject: "", message: "", website: "" });
  const [sent, setSent] = React.useState(false);
  const a = useAction(sendContactAction, { refresh: false, onSuccess: () => setSent(true) });
  if (sent) return <Alert tone="success" title="Message envoyé">Merci, nous vous répondrons par email dans les meilleurs délais.</Alert>;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-7" onSubmit={(e) => { e.preventDefault(); void a.run(v); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="c-name" label="Nom" error={a.fieldErrors.name?.[0]}><Input value={v.name} onChange={set("name")} autoComplete="name" /></Field>
        <Field id="c-email" label="Email" error={a.fieldErrors.email?.[0]}><Input type="email" value={v.email} onChange={set("email")} autoComplete="email" /></Field>
      </div>
      <Field id="c-subject" label="Objet" error={a.fieldErrors.subject?.[0]}><Input value={v.subject} onChange={set("subject")} /></Field>
      <Field id="c-message" label="Message" error={a.fieldErrors.message?.[0]}><Textarea rows={6} value={v.message} onChange={set("message")} /></Field>
      <input type="text" name="website" value={v.website} onChange={set("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Button type="submit" className="w-fit" loading={a.pending}>Envoyer</Button>
    </form>
  );
}
