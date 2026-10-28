/**
 * Registre affiché dans l'administration et la documentation :
 * implémenté / testé / activé en production. À tenir à jour à chaque évolution.
 */
export const FEATURE_STATUS: { name: string; implemented: boolean; tested: boolean; live: "yes" | "pending" | "blocked"; condition: string }[] = [
  { name: "Comptes, email, mot de passe, 2FA", implemented: true, tested: true, live: "pending", condition: "Configurer Resend (domaine vérifié) pour l'envoi réel des emails" },
  { name: "Connexion Google", implemented: true, tested: false, live: "pending", condition: "Fournir GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" },
  { name: "Publication colis / trajets, recherche, matching", implemented: true, tested: true, live: "pending", condition: "Ouverture d'un corridor en LIVE" },
  { name: "Corridor France ⇄ Algérie", implemented: true, tested: true, live: "blocked", condition: "Validation juridique : douanes, statut des voyageurs, assurance" },
  { name: "Paiement Stripe (Checkout + webhooks)", implemented: true, tested: false, live: "pending", condition: "Clés Stripe test puis live, validation du parcours, statut réglementaire de l'encaissement" },
  { name: "Simulateur de paiement local", implemented: true, tested: true, live: "blocked", condition: "Interdit en production par configuration" },
  { name: "Versements transporteurs (Stripe Connect)", implemented: true, tested: true, live: "pending", condition: "Activation Connect, confirmation pays par pays" },
  { name: "Versements vers l'Algérie", implemented: true, tested: true, live: "blocked", condition: "Non pris en charge tant que le prestataire ne l'a pas confirmé pour le compte plateforme" },
  { name: "Vérification d'identité (Stripe Identity)", implemented: true, tested: false, live: "pending", condition: "Activation Stripe Identity sur le compte" },
  { name: "OTP remise / livraison, QR code", implemented: true, tested: true, live: "pending", condition: "Emails réels (Resend) ; SMS optionnel (Twilio)" },
  { name: "SMS", implemented: true, tested: false, live: "pending", condition: "Compte Twilio et numéro d'envoi" },
  { name: "Messagerie temps réel (SSE + PostgreSQL)", implemented: true, tested: true, live: "pending", condition: "Hébergement Node.js persistant (ou repli sur rafraîchissement périodique)" },
  { name: "Litiges et remboursements", implemented: true, tested: true, live: "pending", condition: "Procédure interne de traitement à formaliser" },
  { name: "Stockage S3 des fichiers", implemented: true, tested: false, live: "pending", condition: "Bucket S3 privé et clés d'accès" },
  { name: "Notifications push web", implemented: false, tested: false, live: "blocked", condition: "Non développé" },
  { name: "Assurance des colis", implemented: false, tested: false, live: "blocked", condition: "Aucun partenariat" },
  { name: "Traductions anglais / arabe / kabyle", implemented: false, tested: false, live: "blocked", condition: "Architecture prête (lang/dir), traductions à produire et faire relire" },
];
