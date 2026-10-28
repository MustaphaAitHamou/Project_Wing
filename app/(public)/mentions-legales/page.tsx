import type { Metadata } from "next";
import { ProsePage, TODO } from "@/components/marketplace/prose";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default function LegalNoticePage() {
  return (
    <ProsePage title="Mentions légales" draftLegal>
      <h2>Éditeur</h2>
      <p>Tamurt Services. <TODO>Forme juridique, capital, siège social, RCS/SIREN, numéro de TVA intracommunautaire, directeur de la publication, email et téléphone.</TODO></p>
      <h2>Hébergement</h2>
      <p><TODO>Nom, adresse et téléphone de l&apos;hébergeur retenu.</TODO></p>
      <h2>Propriété intellectuelle</h2>
      <p>L&apos;identité visuelle, les textes et le code de Tamurt Sending sont la propriété de Tamurt Services. Les contenus publiés par les utilisateurs restent leur propriété ; ils accordent à Tamurt Services une licence d&apos;affichage limitée au fonctionnement du service.</p>
      <h2>Médiation</h2>
      <p><TODO>Coordonnées du médiateur de la consommation.</TODO></p>
    </ProsePage>
  );
}
