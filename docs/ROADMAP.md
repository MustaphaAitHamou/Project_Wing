# Feuille de route

## Phases réalisées (voir PROGRESS.md)
1. Analyse et planification ✔ · 2. Fondations ✔ · 3. Interface publique ✔ · 4. Comptes ✔ · 5. Marketplace ✔ · 6. Communication et livraison ✔ · 7. Paiements (sandbox) ✔ · 8. Administration ✔ · 9. Qualité et sécurité ✔ (voir rapport de tests) · 10. Préparation production : documentation ✔, monitoring à brancher.

## Avant le lancement commercial (bloquant)
- Validation juridique (COMPLIANCE_CHECKLIST.md) et rédaction définitive des pages légales.
- Ouverture du compte Stripe, tests de bout en bout en mode test Stripe réel, confirmation des pays de versement.
- Activation Stripe Identity, Resend, stockage S3 ; déploiement d'une préproduction.
- Intégration Sentry et alerting ; test de restauration de sauvegarde.
- Audit de sécurité externe (pentest) ; mesure Lighthouse sur la préproduction.

## Ensuite
- Traductions (anglais, arabe RTL, tamazight) avec relecture native.
- Notifications push (Web Push + service worker), mode hors ligne PWA.
- Assurance colis via partenaire.
- Ouverture Belgique, Espagne, Allemagne, Suisse, Italie, Maroc, Tunisie (corridors + référentiels de villes).
- Application mobile (Expo) réutilisant les services via une API dédiée.
- Recherche géographique (rayon autour d'une ville) avec PostGIS.
