import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/marketplace/prose";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Envoyer un colis en France ou en Algérie", description: "Confiez votre colis à un voyageur qui fait déjà le trajet entre la France et l'Algérie.", alternates: { canonical: "/envoyer-un-colis" } };

export default function SendPage() {
  return (
    <ProsePage title="Envoyer un colis avec un voyageur" intro="Vêtements, livres, cadeaux, électronique : confiez vos colis à des voyageurs vérifiés qui font déjà le trajet entre la France et l'Algérie.">
      <h2>Ce que vous gagnez</h2>
      <ul>
        <li>Un prix fixé par vous et le voyageur, souvent inférieur à un envoi classique pour des petits colis.</li>
        <li>Un contact direct avec la personne qui transporte votre colis, via la messagerie intégrée.</li>
        <li>Une remise et une livraison prouvées par codes à usage unique.</li>
        <li>Un paiement en ligne : le voyageur n&apos;est payé qu&apos;après la livraison confirmée.</li>
      </ul>
      <h2>Avant de publier</h2>
      <ul>
        <li>Vérifiez que le contenu n&apos;est pas dans la liste des <Link href="/objets-interdits">objets interdits</Link>.</li>
        <li>Préparez un emballage solide, que le voyageur pourra ouvrir pour contrôle puis refermer.</li>
        <li>Renseignez une valeur déclarée exacte. Aucune assurance n&apos;est incluse à ce jour.</li>
        <li>Les règles douanières des pays traversés s&apos;appliquent : vous restez responsable du contenu déclaré.</li>
      </ul>
      <div className="flex flex-wrap gap-3 pt-4"><Button asChild size="lg"><Link href="/tableau-de-bord/colis/nouveau">Publier mon colis</Link></Button><Button asChild size="lg" variant="outline"><Link href="/trajets">Voir les trajets disponibles</Link></Button></div>
    </ProsePage>
  );
}
