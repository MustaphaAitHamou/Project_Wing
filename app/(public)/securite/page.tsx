import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/marketplace/prose";

export const metadata: Metadata = { title: "Sécurité", description: "Vérification d'identité, paiement sécurisé, codes de remise et de livraison : ce que fait réellement Tamurt Sending.", alternates: { canonical: "/securite" } };

export default function SecurityPage() {
  return (
    <ProsePage title="Sécurité et confiance" intro="Voici précisément les mécanismes en place, et leurs limites.">
      <h2>Vérification d&apos;identité</h2>
      <p>Tout voyageur doit faire vérifier son identité par un prestataire spécialisé (pièce d&apos;identité et selfie) avant de transporter un colis. Les expéditeurs de colis de valeur élevée aussi. Tamurt Sending ne conserve que le résultat, pas vos documents.</p>
      <h2>Paiement</h2>
      <p>Les paiements sont traités par un prestataire de paiement agréé ; vos données de carte ne transitent jamais par nos serveurs. Le voyageur n&apos;est rémunéré qu&apos;après la livraison confirmée et la clôture de la transaction, et jamais pendant un litige.</p>
      <h2>Double confirmation par code</h2>
      <ul>
        <li><strong>Remise</strong> : l&apos;expéditeur reçoit un code à 6 chiffres (ou un QR code) qu&apos;il donne au voyageur une fois le colis vérifié.</li>
        <li><strong>Livraison</strong> : le destinataire reçoit un code distinct qu&apos;il donne au voyageur à la réception.</li>
        <li>Les codes expirent, sont limités à 5 essais, à usage unique, et ne sont jamais stockés en clair.</li>
      </ul>
      <h2>Confidentialité des coordonnées</h2>
      <p>Les coordonnées du destinataire et les numéros de téléphone ne sont partagés qu&apos;après le paiement de la réservation, et uniquement entre les deux parties.</p>
      <h2>Avis authentiques</h2>
      <p>Un avis ne peut être laissé qu&apos;après une transaction réellement terminée, une seule fois par personne et par transaction.</p>
      <h2>Ce que nous ne faisons pas</h2>
      <ul>
        <li>Aucune assurance n&apos;est incluse à ce jour.</li>
        <li>Nous ne proposons pas de suivi GPS en temps réel : le suivi repose sur les étapes confirmées.</li>
        <li>La messagerie est privée mais n&apos;est pas chiffrée de bout en bout ; l&apos;équipe de modération peut y accéder uniquement dans le cadre d&apos;un signalement ou d&apos;un litige, et cet accès est journalisé.</li>
      </ul>
      <p>Objets interdits : consultez <Link href="/objets-interdits">la liste complète</Link>.</p>
    </ProsePage>
  );
}
