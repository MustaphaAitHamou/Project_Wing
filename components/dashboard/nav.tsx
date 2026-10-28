"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Bell, CreditCard, HandCoins, Home, Inbox, LayoutGrid, MessageSquare, Package, PackagePlus, Route, Settings, Star, Truck, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const SECTIONS = [
  { title: null, items: [
    { href: "/tableau-de-bord", label: "Vue d'ensemble", icon: Home, exact: true },
    { href: "/tableau-de-bord/reservations", label: "Expéditions et livraisons", icon: Route },
    { href: "/tableau-de-bord/messages", label: "Messages", icon: MessageSquare, badge: "messages" as const },
    { href: "/tableau-de-bord/notifications", label: "Notifications", icon: Bell, badge: "notifications" as const },
  ] },
  { title: "Expéditeur", items: [
    { href: "/tableau-de-bord/colis", label: "Mes colis", icon: Package },
    { href: "/tableau-de-bord/colis/nouveau", label: "Publier un colis", icon: PackagePlus, exact: true },
    { href: "/tableau-de-bord/paiements", label: "Paiements", icon: CreditCard },
  ] },
  { title: "Voyageur", items: [
    { href: "/tableau-de-bord/trajets", label: "Mes trajets", icon: Truck },
    { href: "/rechercher?mode=colis", label: "Colis disponibles", icon: Search },
    { href: "/tableau-de-bord/propositions", label: "Propositions", icon: Inbox },
    { href: "/tableau-de-bord/revenus", label: "Revenus", icon: HandCoins },
  ] },
  { title: "Compte", items: [
    { href: "/tableau-de-bord/avis", label: "Avis", icon: Star },
    { href: "/tableau-de-bord/litiges", label: "Litiges", icon: AlertTriangle },
    { href: "/tableau-de-bord/parametres", label: "Paramètres", icon: Settings },
  ] },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  const path = href.split("?")[0]!;
  return exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
}

export function SidebarNav({ counts }: { counts: { messages: number; notifications: number } }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Tableau de bord" className="grid gap-5">
      {SECTIONS.map((s, i) => (
        <div key={i} className="grid gap-0.5">
          {s.title && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</p>}
          {s.items.map((it) => {
            const active = isActive(pathname, it.href, "exact" in it ? it.exact : false) && !(it.href === "/tableau-de-bord/colis" && pathname === "/tableau-de-bord/colis/nouveau");
            const n = "badge" in it && it.badge ? counts[it.badge] : 0;
            return (
              <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4", active && "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft")}>
                <it.icon aria-hidden />
                <span className="flex-1">{it.label}</span>
                {n > 0 && <span className="rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white tabular">{n > 99 ? "99+" : n}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

const TABS = [
  { href: "/tableau-de-bord", label: "Accueil", icon: Home, exact: true },
  { href: "/tableau-de-bord/colis", label: "Colis", icon: Package },
  { href: "/tableau-de-bord/trajets", label: "Trajets", icon: Truck },
  { href: "/tableau-de-bord/messages", label: "Messages", icon: MessageSquare, badge: "messages" as const },
  { href: "/tableau-de-bord/menu", label: "Plus", icon: LayoutGrid },
];

export function MobileTabBar({ counts }: { counts: { messages: number; notifications: number } }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation du tableau de bord" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href, t.exact);
          const n = t.badge ? counts[t.badge] : 0;
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground", active && "text-primary")}>
                <t.icon className="size-5" aria-hidden />
                {t.label}
                {n > 0 && <span className="absolute right-[calc(50%-18px)] top-1.5 size-2 rounded-full bg-destructive" aria-label={`${n} non lu(s)`} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
