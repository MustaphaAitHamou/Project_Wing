import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BarChart3, ClipboardList, CreditCard, FileClock, Flag, HelpCircle, Route, Settings2, Users } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { requireStaffPage } from "@/server/auth/session";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration" }, robots: { index: false } };

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: BarChart3 },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/annonces", label: "Annonces", icon: ClipboardList },
  { href: "/admin/reservations", label: "Réservations", icon: Route },
  { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
  { href: "/admin/litiges", label: "Litiges", icon: AlertTriangle },
  { href: "/admin/signalements", label: "Signalements", icon: Flag },
  { href: "/admin/configuration", label: "Configuration", icon: Settings2 },
  { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { href: "/admin/audit", label: "Journal d'audit", icon: FileClock },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage();
  return (
    <>
      <SiteHeader />
      <div className="container-page grid gap-6 py-6 lg:grid-cols-[13rem_1fr]">
        <aside>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administration · {staff.role === "ADMIN" ? "Admin" : "Modération"}</p>
          <nav className="flex gap-1 overflow-x-auto pb-2 lg:grid lg:overflow-visible" aria-label="Administration">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><n.icon className="size-4" aria-hidden />{n.label}</Link>)}
          </nav>
        </aside>
        <main id="contenu" className="min-w-0">{children}</main>
      </div>
    </>
  );
}
