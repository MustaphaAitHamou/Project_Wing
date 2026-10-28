import { AlertTriangle, Bell, CreditCard, HandCoins, Home, Inbox, MessageSquare, Package, PackagePlus, Route, Settings, Star, Truck, Search } from "lucide-react";

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

