import type { Metadata } from "next";
import Link from "next/link";
import { SECTIONS } from "@/components/dashboard/sections";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Menu" };

/** Menu complet du tableau de bord pour mobile. */
export default function DashboardMenuPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Menu" />
      {SECTIONS.map((s, i) => (
        <section key={i} className="grid gap-2">
          {s.title && <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</h2>}
          <ul className="divide-y rounded-xl border bg-card">
            {s.items.map((it) => <li key={it.href}><Link href={it.href} className="flex items-center gap-3 p-4 font-medium"><it.icon className="size-5 text-primary" aria-hidden />{it.label}</Link></li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
