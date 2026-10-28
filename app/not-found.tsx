import Link from "next/link";
import { Compass } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="container-page grid min-h-[60dvh] place-content-center justify-items-center gap-4 py-16 text-center">
        <Compass className="size-12 text-primary" aria-hidden />
        <p className="text-sm font-semibold text-muted-foreground">Erreur 404</p>
        <h1 className="text-3xl font-bold">Cette page n&apos;existe pas ou plus</h1>
        <p className="max-w-md text-muted-foreground">L&apos;annonce a peut-être été réservée, annulée ou n&apos;est accessible qu&apos;à son propriétaire.</p>
        <div className="flex flex-wrap justify-center gap-2"><Button asChild><Link href="/">Retour à l&apos;accueil</Link></Button><Button asChild variant="outline"><Link href="/rechercher">Rechercher</Link></Button></div>
      </main>
    </>
  );
}
