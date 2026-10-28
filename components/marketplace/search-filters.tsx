"use client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TRANSPORT_MODES, TRANSPORT_MODE_LABELS } from "@/features/shared/schemas";

/** Filtres synchronisés avec l'URL (recherches partageables). */
export function SearchFilters({ mode, categories }: { mode: "trajets" | "colis"; categories: { slug: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [v, setV] = React.useState(() => Object.fromEntries(["dateFrom", "dateTo", "maxPrice", "minBudget", "weight", "category", "transport", "verified", "sort"].map((k) => [k, sp.get(k) ?? ""])));
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? ((e.target as HTMLInputElement).checked ? "1" : "") : e.target.value }));
  const apply = (e?: React.FormEvent) => {
    e?.preventDefault();
    const qs = new URLSearchParams(sp.toString());
    for (const [k, val] of Object.entries(v)) val ? qs.set(k, val) : qs.delete(k);
    qs.delete("page");
    if (qs.has("dateFrom") || qs.has("dateTo")) qs.delete("date");
    router.push(`${pathname}?${qs}`);
    setOpen(false);
  };
  const reset = () => {
    const qs = new URLSearchParams();
    for (const k of ["mode", "from", "to", "date"]) if (sp.get(k)) qs.set(k, sp.get(k)!);
    setV((s) => Object.fromEntries(Object.keys(s).map((k) => [k, ""])));
    router.push(`${pathname}?${qs}`);
    setOpen(false);
  };
  const form = (
    <form onSubmit={apply} className="grid gap-4">
      <Field id="f-sort" label="Trier par">
        <Select value={v.sort} onChange={set("sort")}>
          <option value="">Pertinence</option>
          <option value="date">Date la plus proche</option>
          <option value="price_asc">{mode === "trajets" ? "Prix le plus bas" : "Budget le plus bas"}</option>
          <option value="price_desc">{mode === "trajets" ? "Prix le plus élevé" : "Budget le plus élevé"}</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="f-from" label="Du"><Input type="date" value={v.dateFrom} onChange={set("dateFrom")} /></Field>
        <Field id="f-to" label="Au"><Input type="date" value={v.dateTo} onChange={set("dateTo")} /></Field>
      </div>
      {mode === "trajets" ? (
        <>
          <Field id="f-price" label="Prix max par kg (€)"><Input inputMode="decimal" value={v.maxPrice} onChange={set("maxPrice")} /></Field>
          <Field id="f-weight" label="Poids de mon colis (kg)" hint="Affiche les trajets avec assez de place."><Input inputMode="decimal" value={v.weight} onChange={set("weight")} /></Field>
          <Field id="f-transport" label="Moyen de transport"><Select value={v.transport} onChange={set("transport")}><option value="">Tous</option>{TRANSPORT_MODES.map((m) => <option key={m} value={m}>{TRANSPORT_MODE_LABELS[m]}</option>)}</Select></Field>
        </>
      ) : (
        <>
          <Field id="f-budget" label="Budget minimum (€)"><Input inputMode="decimal" value={v.minBudget} onChange={set("minBudget")} /></Field>
          <Field id="f-weight" label="Poids maximum (kg)" hint="Selon la place dont vous disposez."><Input inputMode="decimal" value={v.weight} onChange={set("weight")} /></Field>
          <Field id="f-cat" label="Catégorie"><Select value={v.category} onChange={set("category")}><option value="">Toutes</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
        </>
      )}
      <label className="flex items-center gap-3 text-sm"><Checkbox checked={v.verified === "1"} onChange={set("verified")} />Profils vérifiés uniquement</label>
      <div className="flex gap-2"><Button type="submit" className="flex-1">Appliquer</Button><Button type="button" variant="ghost" onClick={reset}>Réinitialiser</Button></div>
    </form>
  );
  return (
    <>
      <div className="hidden rounded-2xl border bg-card p-5 lg:block">{form}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button variant="outline" className="lg:hidden"><SlidersHorizontal />Filtres et tri</Button></DialogTrigger>
        <DialogContent title="Filtres et tri">{form}</DialogContent>
      </Dialog>
    </>
  );
}
