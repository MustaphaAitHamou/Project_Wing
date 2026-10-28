import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/marketplace/prose";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Transporter des colis pendant vos voyages", description: "Rentabilisez la place libre dans vos bagages entre la France et l'Algérie.", alternates: { canonical: "/devenir-transporteur" } };

export default function TravelerPage() {
  return (
    <ProsePage title="Transportez des colis pendant vos voyages" intro="Vous voyagez entre la France et l'Algérie ? Proposez la place libre dans vos bagages ou votre véhicule et soyez rémunéré.">
      <h2>Comment ça fonctionne</h2>
      <ol>
        <li>Vérifiez votre identité (une seule fois, via un prestataire spécialisé).</li>
        <li>Publiez votre trajet : dates, moyen de transport, place disponible, tarif.</li>
        <li>Proposez vos services sur les colis compatibles, ou acceptez les demandes reçues.</li>
        <li>Vérifiez le contenu à la remise, transportez, livrez avec le code du destinataire.</li>
        <li>Recevez votre rémunération après la clôture, commission de la plateforme déduite.</li>
      </ol>
      <h2>Vos responsabilités</h2>
      <ul>
        <li>Vérifier le contenu de chaque colis en présence de l&apos;expéditeur et refuser tout objet interdit ou non conforme.</li>
        <li>Respecter les règles de votre compagnie de transport (bagages, liquides, batteries) et des douanes.</li>
        <li>Ne jamais transporter un colis fermé dont vous ignorez le contenu.</li>
      </ul>
      <h2>Rémunération</h2>
      <p>Vous fixez votre prix. Tamurt Sending prélève une commission (voir <Link href="/tarifs">Tarifs</Link>). Les versements vers certains pays, dont l&apos;Algérie, ne sont pas encore disponibles : votre tableau de bord l&apos;indique avant tout engagement.</p>
      <p className="text-sm text-muted-foreground">Le statut fiscal et réglementaire des voyageurs rémunérés dépend de votre situation et de votre pays de résidence. Renseignez-vous sur vos obligations déclaratives.</p>
      <div className="flex flex-wrap gap-3 pt-4"><Button asChild size="lg"><Link href="/tableau-de-bord/trajets/nouveau">Publier mon trajet</Link></Button><Button asChild size="lg" variant="outline"><Link href="/colis">Voir les colis à transporter</Link></Button></div>
    </ProsePage>
  );
}
