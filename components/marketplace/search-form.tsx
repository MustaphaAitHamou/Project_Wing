"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CityCombobox, type CityOption } from "./city-combobox";
import { cn, toDateInput } from "@/lib/utils";

export function SearchForm({ initial, variant = "hero" }: { initial?: { mode?: "trajets" | "colis"; from?: CityOption | null; to?: CityOption | null; date?: string }; variant?: "hero" | "compact" }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"trajets" | "colis">(initial?.mode ?? "trajets");
  const [from, setFrom] = React.useState<CityOption | null>(initial?.from ?? null);
  const [to, setTo] = React.useState<CityOption | null>(initial?.to ?? null);
  const [date, setDate] = React.useState(initial?.date ?? "");
  const [pending, startTransition] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams({ mode });
    if (from) qs.set("from", from.slug);
    if (to) qs.set("to", to.slug);
    if (date) qs.set("date", date);
    startTransition(() => router.push(`/rechercher?${qs}`));
  };

  return (
    <form onSubmit={submit} className={cn("grid gap-3", variant === "hero" && "rounded-2xl border bg-card p-3 shadow-[0_12px_40px_-12px_rgba(10,60,50,0.25)] sm:p-4")} role="search" aria-label="Rechercher un trajet ou un colis">
      <div role="radiogroup" aria-label="Type de recherche" className="flex gap-1 rounded-xl bg-muted p-1 text-sm font-semibold sm:w-fit">
        {([["trajets", "Trouver un voyageur"], ["colis", "Trouver un colis à transporter"]] as const).map(([m, label]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn("flex-1 rounded-lg px-3 py-2 transition-colors sm:flex-none", mode === m ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_11rem_auto] md:items-center">
        <div>
          <label htmlFor="search-from" className="sr-only">Ville de départ</label>
          <CityCombobox id="search-from" value={from} onChange={setFrom} placeholder="Départ (ex. Marseille)" />
        </div>
        <Button type="button" variant="ghost" size="icon" className="hidden justify-self-center md:inline-flex" aria-label="Inverser départ et arrivée" onClick={() => { setFrom(to); setTo(from); }}>
          <ArrowLeftRight />
        </Button>
        <div>
          <label htmlFor="search-to" className="sr-only">Ville d&apos;arrivée</label>
          <CityCombobox id="search-to" value={to} onChange={setTo} placeholder="Arrivée (ex. Béjaïa)" />
        </div>
        <div>
          <label htmlFor="search-date" className="sr-only">Date souhaitée</label>
          <Input id="search-date" type="date" min={toDateInput(new Date())} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date souhaitée" />
        </div>
        <Button type="submit" size="lg" loading={pending} className="h-11">
          {!pending && <Search />}Rechercher
        </Button>
      </div>
    </form>
  );
}
