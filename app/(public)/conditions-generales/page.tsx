import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage, TODO } from "@/components/marketplace/prose";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Conditions générales d'utilisation", alternates: { canonical: "/conditions-generales" } };

export default async function TermsPage() {
  const rate = await getSetting("commission.rateBps");
  return (
    <ProsePage title="Conditions générales d'utilisation" updated="brouillon technique, octobre 2026" draftLegal>
      <h2>1. Objet</h2>
      <p>Les présentes conditions régissent l&apos;utilisation de la plateforme Tamurt Sending, éditée par Tamurt Services, qui met en relation des expéditeurs souhaitant faire transporter un colis et des voyageurs disposant de place lors de leurs déplacements.</p>
      <h2>2. Rôle de la plateforme</h2>
      <p>Tamurt Sending agit comme intermédiaire de mise en relation. Elle n&apos;est pas transporteur et ne prend pas possession des colis. <TODO>Qualification juridique précise du service (opérateur de plateforme en ligne au sens de l&apos;article L.111-7 du Code de la consommation, intermédiaire, commissionnaire de transport ?) et conséquences en matière de responsabilité.</TODO></p>
      <h2>3. Inscription et compte</h2>
      <ul>
        <li>L&apos;inscription est réservée aux personnes majeures. Un seul compte par personne, utilisable comme expéditeur et comme voyageur.</li>
        <li>L&apos;utilisateur confirme son adresse email et fournit des informations exactes.</li>
        <li>La vérification d&apos;identité, réalisée par un prestataire tiers, est obligatoire pour transporter des colis et peut être exigée pour certains envois.</li>
      </ul>
      <h2>4. Obligations de l&apos;expéditeur</h2>
      <ul>
        <li>Décrire exactement le contenu, déclarer sa valeur réelle, respecter la liste des <Link href="/objets-interdits">objets interdits</Link>.</li>
        <li>Présenter le colis ouvert ou ouvrable au voyageur pour vérification lors de la remise.</li>
        <li>Respecter les réglementations douanières applicables. <TODO>Répartition des obligations déclaratives douanières entre expéditeur et voyageur.</TODO></li>
      </ul>
      <h2>5. Obligations du voyageur</h2>
      <ul>
        <li>Vérifier le contenu de chaque colis, refuser tout objet interdit ou non conforme.</li>
        <li>Transporter le colis avec soin et le remettre au destinataire désigné, contre son code de réception.</li>
        <li>Respecter les règles de son transporteur et des douanes. <TODO>Statut du voyageur rémunéré (activité occasionnelle, seuils, obligations fiscales et sociales) et éventuelles obligations de transporteur professionnel.</TODO></li>
      </ul>
      <h2>6. Prix, paiement et commission</h2>
      <p>Le prix du transport est convenu entre les parties via une proposition acceptée sur la plateforme ; il est ensuite figé. Le paiement s&apos;effectue en ligne auprès du prestataire de paiement de la plateforme. La commission de Tamurt Sending est actuellement de {rate / 100} % du prix du transport. Le voyageur est rémunéré après la livraison confirmée et la clôture de la transaction. <TODO>Statut réglementaire de l&apos;encaissement pour compte de tiers (agent du prestataire de paiement) et mentions obligatoires.</TODO></p>
      <h2>7. Annulation, litiges et remboursement</h2>
      <p>Une réservation peut être annulée tant que le colis n&apos;a pas été remis au voyageur ; un paiement encaissé est alors intégralement remboursé. Après la remise, tout incident fait l&apos;objet d&apos;un litige examiné par Tamurt Sending, qui peut décider d&apos;un remboursement total ou partiel. <TODO>Frais d&apos;annulation éventuels, délais, droit de rétractation applicable ou exclusion motivée, médiation de la consommation.</TODO></p>
      <h2>8. Responsabilité et assurance</h2>
      <p>Aucune assurance n&apos;est incluse à ce jour. <TODO>Limites de responsabilité de la plateforme, du voyageur et de l&apos;expéditeur en cas de perte, vol, dommage, retard ou saisie douanière ; plafonds ; recours.</TODO></p>
      <h2>9. Avis et modération</h2>
      <p>Les avis sont réservés aux transactions terminées. Tamurt Sending peut masquer un avis contraire aux présentes conditions, suspendre une annonce ou un compte en cas de manquement, après examen.</p>
      <h2>10. Données personnelles</h2>
      <p>Voir la <Link href="/confidentialite">politique de confidentialité</Link>.</p>
      <h2>11. Droit applicable</h2>
      <p><TODO>Droit applicable, juridiction compétente, traitement des utilisateurs résidant en Algérie.</TODO></p>
    </ProsePage>
  );
}
