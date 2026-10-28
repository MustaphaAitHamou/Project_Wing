import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/marketplace/prose";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Comment ça marche", description: "Le fonctionnement de Tamurt Sending pour les expéditeurs et les voyageurs, étape par étape.", alternates: { canonical: "/comment-ca-marche" } };

export default function HowItWorksPage() {
  return (
    <ProsePage title="Comment ça marche" intro="Tamurt Sending met en relation des personnes qui veulent envoyer un colis et des voyageurs qui font déjà le trajet. Un seul compte permet d'être expéditeur et voyageur.">
      <h2>Pour les expéditeurs</h2>
      <ol>
        <li><strong>Publiez votre colis</strong> : villes de départ et d&apos;arrivée, date souhaitée, poids, dimensions, contenu précis, valeur déclarée, photos et budget. Les coordonnées du destinataire restent privées.</li>
        <li><strong>Recevez des propositions</strong> des voyageurs compatibles, ou sollicitez vous-même un voyageur dont le trajet correspond. Chaque correspondance affiche un score de compatibilité détaillé.</li>
        <li><strong>Acceptez une proposition</strong> : le prix est figé et une réservation est créée.</li>
        <li><strong>Payez en ligne</strong> via notre prestataire de paiement. Le voyageur reçoit alors les coordonnées utiles à la livraison.</li>
        <li><strong>Remettez le colis</strong> en main propre. Vous recevez par email un code de remise à 6 chiffres (ou un QR code) que vous donnez au voyageur après avoir vérifié le colis ensemble.</li>
        <li><strong>Suivez l&apos;expédition</strong> étape par étape. À l&apos;arrivée, le destinataire reçoit son propre code et le donne au voyageur à la réception.</li>
        <li><strong>Confirmez et évaluez</strong> : la transaction est clôturée, le voyageur est rémunéré, vous laissez un avis.</li>
      </ol>
      <h2>Pour les voyageurs</h2>
      <ol>
        <li><strong>Vérifiez votre identité</strong> une fois, via notre prestataire spécialisé.</li>
        <li><strong>Publiez votre trajet</strong> avec la place disponible et votre tarif au kilo.</li>
        <li><strong>Proposez vos services</strong> sur les colis compatibles, ou répondez aux demandes des expéditeurs.</li>
        <li><strong>Récupérez le colis</strong> : vérifiez son contenu, puis saisissez le code de remise de l&apos;expéditeur.</li>
        <li><strong>Livrez</strong> : indiquez votre départ puis votre arrivée, remettez le colis et saisissez le code du destinataire.</li>
        <li><strong>Soyez payé</strong> sur votre compte de versement après la clôture, commission déduite.</li>
      </ol>
      <h2>En cas de problème</h2>
      <p>Depuis la réservation, ouvrez un litige : la transaction est gelée (aucun versement) jusqu&apos;à la décision de notre équipe, qui peut rembourser tout ou partie du paiement via le prestataire.</p>
      <div className="flex flex-wrap gap-3 pt-4"><Button asChild><Link href="/tableau-de-bord/colis/nouveau">Envoyer un colis</Link></Button><Button asChild variant="outline"><Link href="/tableau-de-bord/trajets/nouveau">Proposer un trajet</Link></Button></div>
    </ProsePage>
  );
}
