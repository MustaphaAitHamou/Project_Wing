import Link from "next/link";
import { cn } from "@/lib/utils";

export function Table({ head, children, minWidth = "44rem" }: { head: string[]; children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground"><tr>{head.map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}

export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => <td className={cn("p-3 align-top", className)}>{children}</td>;

export function FilterTabs({ items, current, param, base }: { items: [string, string][]; current: string; param: string; base: Record<string, string | undefined> }) {
  return (
    <nav className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 text-sm font-semibold sm:w-fit" aria-label="Filtre">
      {items.map(([v, l]) => {
        const qs = new URLSearchParams(Object.fromEntries(Object.entries({ ...base, [param]: v || undefined }).filter(([, x]) => x)) as Record<string, string>);
        return <Link key={v} href={`?${qs}`} aria-current={current === v ? "page" : undefined} className={current === v ? "rounded-lg bg-card px-3 py-1.5 shadow-sm" : "rounded-lg px-3 py-1.5 text-muted-foreground"}>{l}</Link>;
      })}
    </nav>
  );
}

export function SearchBox({ q, placeholder, hidden }: { q: string; placeholder: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form className="flex gap-2" role="search">
      {Object.entries(hidden ?? {}).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <input name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder} className="h-10 w-full max-w-sm rounded-lg border border-input bg-card px-3 text-sm" />
      <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Rechercher</button>
    </form>
  );
}
