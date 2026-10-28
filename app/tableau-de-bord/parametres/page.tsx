import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronRight, IdCard, KeyRound, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Paramètres" };
const LINKS = [
  { href: "/tableau-de-bord/parametres/profil", icon: UserRound, title: "Profil", text: "Nom, photo, présentation, téléphone" },
  { href: "/tableau-de-bord/parametres/verification", icon: IdCard, title: "Vérification d'identité", text: "Obligatoire pour transporter des colis" },
  { href: "/tableau-de-bord/parametres/notifications", icon: Bell, title: "Notifications", text: "Emails et notifications dans l'application" },
  { href: "/tableau-de-bord/parametres/securite", icon: KeyRound, title: "Sécurité", text: "Mot de passe, double authentification, sessions" },
];

export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Paramètres" />
      <ul className="divide-y rounded-xl border bg-card">
        {LINKS.map((l) => (
          <li key={l.href}><Link href={l.href} className="flex items-center gap-4 p-4 hover:bg-muted/50"><l.icon className="size-5 text-primary" aria-hidden /><span className="grid flex-1"><span className="font-semibold">{l.title}</span><span className="text-sm text-muted-foreground">{l.text}</span></span><ChevronRight className="size-4 text-muted-foreground" aria-hidden /></Link></li>
        ))}
      </ul>
    </div>
  );
}
