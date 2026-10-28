import type { Metadata } from "next";
import { ProsePage, TODO } from "@/components/marketplace/prose";

export const metadata: Metadata = { title: "Cookies", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <ProsePage title="Cookies et traceurs" updated="brouillon technique, octobre 2026" draftLegal>
      <p>Tamurt Sending n&apos;utilise à ce jour <strong>aucun cookie publicitaire ni de mesure d&apos;audience</strong>. Aucun bandeau de consentement n&apos;est donc nécessaire pour les traceurs ci-dessous, strictement nécessaires au service.</p>
      <h2>Traceurs strictement nécessaires</h2>
      <ul>
        <li><strong>Session d&apos;authentification</strong> (better-auth.session_token) : maintien de la connexion, 30 jours maximum, HttpOnly.</li>
        <li><strong>Appareil de confiance</strong> (double authentification) : 30 jours si vous le choisissez.</li>
        <li><strong>Préférence de thème</strong> (stockage local du navigateur) : clair ou sombre.</li>
      </ul>
      <p><TODO>Si un outil de mesure d&apos;audience ou de marketing est ajouté, mettre en place un recueil du consentement conforme aux lignes directrices de la CNIL avant son activation.</TODO></p>
    </ProsePage>
  );
}
