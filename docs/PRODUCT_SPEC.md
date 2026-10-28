# Spécification produit — Tamurt Sending

## Vision
Marketplace de livraison collaborative (crowdshipping) : des expéditeurs confient des colis à des voyageurs qui font déjà le trajet. Marché initial : France ⇄ Algérie, Kabylie en priorité. Éditeur : Tamurt Services.

## Référence fonctionnelle et sources
DimHum (dimhum.com) a servi de référence concurrentielle. **Le site n'a pas pu être consulté directement** pendant le développement : son certificat TLS était expiré et la connexion a été refusée (nous ne désactivons jamais la vérification TLS). Les seules informations utilisées proviennent de sources publiques secondaires :
- communiqué de lancement (digitaljournal.com, 2025) : mise en relation expéditeurs/voyageurs déjà en route, vérification d'identité via Plaid, paiement via Stripe ;
- fiche App Store (apps.apple.com/app/dimhum/id6744582676) : usage personnel uniquement, petits objets légaux, mises à jour de livraison, confirmation de livraison par OTP ; corridor États-Unis ⇄ Bangladesh.

Tout le reste (parcours détaillés, double OTP remise + livraison, matching scoré, litiges, administration) est une **conception propre à Tamurt Sending**, inspirée des principes ergonomiques d'Airbnb (recherche), BlaBlaCar (mise en relation), Vinted (simplicité de transaction) et Cocolis (univers du colis), sans reprise d'interface, de texte ni d'identité visuelle.

## Personas
- **Expéditeur** : particulier de la diaspora (Marseille, Lyon, Paris…) qui veut envoyer vêtements, cadeaux, livres à sa famille en Kabylie ; sensible au prix, à la confiance et au suivi.
- **Voyageur** : particulier qui fait l'aller-retour (avion, voiture + ferry) et veut rentabiliser la place libre ; sensible à la simplicité, à la sécurité juridique et à la garantie d'être payé.
- **Destinataire** : non inscrit, reçoit un code de réception.
- **Modérateur / Administrateur** : traite annonces, signalements, litiges, paiements, configuration.

## Fonctionnalités (périmètre livré)
| Domaine | Fonctionnalités |
|---|---|
| Comptes | Inscription (prénom, nom, email, téléphone, pays, mot de passe robuste, CGU), vérification email, connexion, Google optionnel, mot de passe oublié/réinitialisation, 2FA TOTP + codes de secours, sessions (liste, révocation), profil public sans données privées, préférences de notification. Un seul compte expéditeur + voyageur. |
| KYC | Statuts UNVERIFIED / PENDING / VERIFIED / REJECTED / EXPIRED ; Stripe Identity (session hébergée) ou simulateur ; aucun document stocké ; blocage des actions requérant la vérification. |
| Colis | Formulaire 5 étapes (trajet, colis + photos, destinataire privé, budget avec estimation des frais, vérification + déclaration sur l'honneur), brouillons, statuts complets, modification/annulation encadrées, validation manuelle des catégories réglementées, catégories interdites refusées. |
| Trajets | Publication (villes, dates, mode, poids/volume, prix/kg, minimum, fragile, conditions), capacité réservée atomiquement, statut FULL, protections sur modification. |
| Recherche | Deux modes (voyageurs / colis), filtres (pays, villes, date ou fourchette, prix, budget, poids, catégorie, transport, profils vérifiés), tris, pagination serveur, URLs partageables, état vide + suggestions proches, tolérance aux accents et alias (Béjaïa/Bejaia/Bgayet/Bougie). |
| Matching | Score explicable /100 (itinéraire, dates, capacité, mode autorisé, fragile, prix, vérification, note) ; suggestions dans les deux sens ; notifications de nouvelles correspondances (dédupliquées). |
| Propositions | Voyageur → colis ou expéditeur → trajet ; modification/retrait par l'auteur ; acceptation/refus par l'autre partie. |
| Réservations | Machine à états à 14 états, transitions serveur, montants figés, verrous, historique, annulation avant remise avec remboursement prestataire. |
| Paiements | Stripe Checkout + webhooks signés idempotents ; simulateur local ; commission configurable (2 modèles) ; remboursements prestataire ; double paiement auto-remboursé ; versements Stripe Connect avec blocage par pays/litige/compte ; reçus ; export CSV. |
| Livraison | OTP de remise (expéditeur) + OTP de livraison (destinataire), hash HMAC, expiration, essais limités, renvois limités, QR code à jeton temporaire, audit, timeline d'événements réels. |
| Messagerie | Conversations par colis, temps réel (SSE + LISTEN/NOTIFY) avec repli, lu/non lu, pièces jointes contrôlées, blocage, signalement. |
| Notifications | Centre de notifications, emails (outbox/Resend), SMS optionnel (Twilio), préférences par type et canal. |
| Avis | Réciproques après COMPLETED, 1 par auteur et réservation, pas d'auto-avis, modération. |
| Litiges | 9 types, preuves, messages, notes internes, assignation, demande d'informations, décisions (remboursement total/partiel, paiement, sans suite), audit. |
| Admin | Dashboard (KPIs réels, graphique, période), utilisateurs (suspension, rôles), annonces (validation, suspension, suppression encadrée), réservations, paiements/remboursements/versements, litiges, signalements, configuration (commission, poids, valeurs, corridors, pays, catégories, bandeau, prestataires), FAQ, audit, export CSV. |
| Public | Accueil, comment ça marche, envoyer, devenir transporteur, recherche, trajets, colis, fiches, profils, tarifs, sécurité, FAQ, contact, à propos, CGU, confidentialité, cookies, mentions légales, objets interdits, 404, 500. |
| Transverse | Thèmes clair/sombre, responsive mobile-first (barre d'onglets), PWA (manifest, icônes), SEO (métadonnées, OG, sitemap, robots, canonical, JSON-LD), accessibilité (labels, focus, aria, contraste). |

## Hors périmètre / non livré
Voir `KNOWN_ISSUES.md` : notifications push, assurance, traductions, suivi GPS, application mobile native.
