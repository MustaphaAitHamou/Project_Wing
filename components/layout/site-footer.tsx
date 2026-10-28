import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const cols = [
  { title: "Tamurt Sending", links: [["/a-propos", "À propos"], ["/comment-ca-marche", "Comment ça marche"], ["/tarifs", "Tarifs"], ["/contact", "Contact"]] },
  { title: "Utiliser le service", links: [["/envoyer-un-colis", "Envoyer un colis"], ["/devenir-transporteur", "Devenir transporteur"], ["/trajets", "Trajets disponibles"], ["/colis", "Colis à transporter"]] },
  { title: "Confiance", links: [["/securite", "Sécurité"], ["/objets-interdits", "Objets interdits"], ["/faq", "Questions fréquentes"]] },
  { title: "Informations légales", links: [["/conditions-generales", "Conditions générales"], ["/confidentialite", "Confidentialité"], ["/cookies", "Cookies"], ["/mentions-legales", "Mentions légales"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_repeat(4,1fr)]">
        <div className="grid content-start gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">Une plateforme de Tamurt Services qui met en relation expéditeurs et voyageurs entre la France et l&apos;Algérie.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title} className="grid content-start gap-3">
            <p className="text-sm font-semibold">{c.title}</p>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {c.links.map(([href, label]) => (
                <li key={href}><Link href={href} className="hover:text-foreground">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Tamurt Services. Tous droits réservés.</p>
          <p>Service en phase de pré-lancement : certaines fonctions sont soumises à validation réglementaire.</p>
        </div>
      </div>
    </footer>
  );
}
