import type { Metadata } from "next";
import { ProsePage, TODO } from "@/components/marketplace/prose";

export const metadata: Metadata = { title: "À propos", description: "Tamurt Sending, une plateforme de Tamurt Services.", alternates: { canonical: "/a-propos" } };

export default function AboutPage() {
  return (
    <ProsePage title="À propos de Tamurt Sending" intro="« Tamurt » signifie « le pays » en kabyle. Tamurt Sending est née d'un constat simple : chaque semaine, des milliers de personnes voyagent entre la France et l'Algérie avec de la place dans leurs bagages, pendant que d'autres cherchent à faire parvenir un colis à leurs proches.">
      <p>Tamurt Sending est une plateforme éditée par Tamurt Services. Elle met en relation expéditeurs et voyageurs, sécurise le paiement et chaque étape de la remise, et accompagne les utilisateurs en cas de problème.</p>
      <h2>Nos principes</h2>
      <ul>
        <li><strong>Transparence</strong> : prix et commission affichés avant tout engagement, aucune promesse que nous ne pouvons pas tenir.</li>
        <li><strong>Confiance</strong> : identités vérifiées, avis authentiques, codes de confirmation à chaque étape.</li>
        <li><strong>Proximité</strong> : une plateforme pensée d&apos;abord pour la diaspora et la Kabylie, en français, puis en tamazight, en arabe et en anglais.</li>
      </ul>
      <h2>L&apos;entreprise</h2>
      <p><TODO>Raison sociale, forme juridique, siège, numéro d&apos;immatriculation et coordonnées de Tamurt Services.</TODO></p>
    </ProsePage>
  );
}
