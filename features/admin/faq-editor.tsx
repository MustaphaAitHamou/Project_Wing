"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { deleteFaqAction, upsertFaqAction } from "./actions";

type Item = { id: string; question: string; answer: string; category: string; sortOrder: number; isPublished: boolean };

export function FaqEditor({ item }: { item: Item | null }) {
  const empty = { id: "", question: "", answer: "", category: "general", sortOrder: 50, isPublished: true };
  const [v, setV] = React.useState<Item>(item ?? empty);
  const save = useAction(upsertFaqAction, { success: "FAQ enregistrée", onSuccess: () => !item && setV(empty) });
  const del = useAction(deleteFaqAction, { success: "Question supprimée" });
  return (
    <details className="rounded-xl border bg-card p-4" open={!item}>
      <summary className="cursor-pointer font-medium">{item ? item.question : "Ajouter une question"}{item && !item.isPublished ? " (masquée)" : ""}</summary>
      <div className="mt-3 grid gap-3">
        <Field id={`q-${v.id}`} label="Question" error={save.fieldErrors.question?.[0]}><Input value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} /></Field>
        <Field id={`a-${v.id}`} label="Réponse" error={save.fieldErrors.answer?.[0]}><Textarea rows={4} value={v.answer} onChange={(e) => setV({ ...v, answer: e.target.value })} /></Field>
        <div className="flex flex-wrap items-end gap-3">
          <Field id={`c-${v.id}`} label="Rubrique"><Select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}><option value="general">Général</option><option value="expediteur">Expéditeurs</option><option value="voyageur">Voyageurs</option><option value="securite">Sécurité</option></Select></Field>
          <Field id={`o-${v.id}`} label="Ordre"><Input type="number" className="w-24" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} /></Field>
          <label className="flex h-11 items-center gap-2 text-sm"><Checkbox checked={v.isPublished} onChange={(e) => setV({ ...v, isPublished: e.target.checked })} />Publiée</label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" loading={save.pending} onClick={() => save.run({ ...v, id: v.id || undefined, category: v.category as "general" })}>Enregistrer</Button>
          {item && <Button size="sm" variant="ghost" loading={del.pending} onClick={() => del.run({ id: item.id })}>Supprimer</Button>}
        </div>
      </div>
    </details>
  );
}
