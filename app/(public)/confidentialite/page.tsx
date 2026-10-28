import type { Metadata } from "next";
import { ProsePage, TODO } from "@/components/marketplace/prose";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default function PrivacyPage() {
  return (
    <ProsePage title="Politique de confidentialité" updated="brouillon technique, octobre 2026" draftLegal>
      <h2>Responsable du traitement</h2>
      <p>Tamurt Services. <TODO>Coordonnées complètes, désignation éventuelle d&apos;un délégué à la protection des données.</TODO></p>
      <h2>Données traitées et finalités</h2>
      <ul>
        <li><strong>Compte</strong> : nom, prénom, email, téléphone, pays, mot de passe (haché). Finalité : gestion du compte, sécurité. Base : exécution du contrat.</li>
        <li><strong>Annonces et réservations</strong> : trajets, colis, photos, destinataire (nom, téléphone, email facultatif, ville). Finalité : mise en relation et exécution du transport.</li>
        <li><strong>Messagerie</strong> : messages et pièces jointes, accessibles aux seuls participants ; accès de la modération uniquement sur signalement ou litige, journalisé.</li>
        <li><strong>Vérification d&apos;identité</strong> : réalisée par le prestataire (Stripe Identity). Tamurt Sending ne conserve que le statut et la référence de vérification.</li>
        <li><strong>Paiement</strong> : traité par le prestataire de paiement (Stripe). Tamurt Sending ne voit ni ne stocke les numéros de carte.</li>
        <li><strong>Journaux techniques et de sécurité</strong> : adresse IP, appareil, actions sensibles. Finalité : sécurité, prévention de la fraude. Base : intérêt légitime.</li>
      </ul>
      <h2>Destinataires et sous-traitants</h2>
      <p>Hébergement, base de données, stockage de fichiers, emails transactionnels (Resend), paiement et vérification d&apos;identité (Stripe), suivi des erreurs (Sentry). <TODO>Liste définitive, localisation des données, garanties pour les transferts hors UE.</TODO></p>
      <h2>Durées de conservation</h2>
      <p><TODO>Durées par catégorie (compte actif, après clôture, données de transaction et obligations comptables, journaux de sécurité, pièces de litige).</TODO> Les tâches techniques et emails de développement sont purgés après 30 jours.</p>
      <h2>Vos droits</h2>
      <p>Accès, rectification, effacement, limitation, opposition, portabilité, directives post-mortem, réclamation auprès de la CNIL. <TODO>Adresse de contact pour l&apos;exercice des droits et délai de réponse.</TODO></p>
      <h2>Sécurité</h2>
      <p>Chiffrement des échanges (HTTPS), mots de passe hachés, codes de confirmation hachés, fichiers privés accessibles uniquement par liens signés temporaires, contrôle d&apos;accès sur chaque ressource, double authentification obligatoire pour l&apos;administration.</p>
    </ProsePage>
  );
}
