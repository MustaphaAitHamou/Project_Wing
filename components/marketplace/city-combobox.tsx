"use client";
import * as React from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldBase } from "@/components/ui/input";

export interface CityOption {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  countryName: string;
}

/**
 * Autocomplétion de ville (ARIA combobox). La recherche est faite côté serveur et
 * tolère accents et variantes (Béjaïa, Bejaia, Bgayet).
 */
export function CityCombobox({
  id, value, onChange, placeholder = "Ville", country, invalid, describedBy, className, name, inputClassName,
}: {
  id: string;
  value: CityOption | null;
  onChange: (c: CityOption | null) => void;
  placeholder?: string;
  country?: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  inputClassName?: string;
  name?: string;
}) {
  const [query, setQuery] = React.useState(value?.name ?? "");
  const [options, setOptions] = React.useState<CityOption[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const listId = `${id}-list`;

  React.useEffect(() => setQuery(value?.name ?? ""), [value?.id, value?.name]);

  React.useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ q: query === value?.name ? "" : query });
        if (country) qs.set("country", country);
        const res = await fetch(`/api/cities?${qs}`, { signal: ctrl.signal });
        if (res.ok) {
          setOptions(await res.json());
          setActive(0);
        }
      } catch {
        // requête annulée
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open, country, value?.name]);

  const select = (c: CityOption) => {
    onChange(c);
    setQuery(c.name);
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id={id}
        name={name}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${id}-opt-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        className={cn(fieldBase, "h-11 pl-9", inputClassName)}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && open && options[active]) { e.preventDefault(); select(options[active]!); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-xl border bg-card p-1 shadow-lg">
          {options.length === 0 && <li className="px-3 py-2.5 text-sm text-muted-foreground">{loading ? "Recherche…" : "Aucune ville trouvée (seules les villes des pays ouverts sont proposées)"}</li>}
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm", i === active && "bg-muted")}
              onMouseDown={(e) => { e.preventDefault(); select(o); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="font-medium">{o.name}</span>
              <span className="text-xs text-muted-foreground">{o.countryName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
