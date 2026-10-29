# Avancement

Dernière mise à jour : 29/10/2026.

| Phase | État | Détail |
|---|---|---|
| 1. Analyse et planification | ✔ | Environnement inspecté (vide), PostgreSQL 16 local, versions stables choisies ; DimHum inaccessible (TLS expiré), sources secondaires utilisées ; docs PRODUCT_SPEC, ARCHITECTURE, ROADMAP, DATA_MODEL, COMPLIANCE_CHECKLIST. |
| 2. Fondations | ✔ | Next.js 16.4.3, Prisma 7, Better Auth, Tailwind 4, design system, Vitest, Playwright ; schéma complet + contraintes SQL. |
| 3. Interface publique | ✔ | Accueil, recherche, listes, fiches, profils, pages de contenu et légales, 404/500, SEO, PWA. |
| 4. Comptes | ✔ | Inscription, vérification email, connexion, reset, Google (non testé), 2FA, sessions, profil, préférences, KYC (simulateur). |
| 5. Marketplace | ✔ | Colis (5 étapes), trajets, recherche, matching, propositions, réservations, machine à états. |
| 6. Communication et livraison | ✔ | Messagerie temps réel, notifications, OTP + QR, suivi, avis, litiges. |
| 7. Paiements | ✔ (sandbox) | Stripe Checkout/Connect/Identity écrits ; simulateur testé ; commission, remboursements, versements, blocages. Aucun paiement réel. |
| 8. Administration | ✔ | Dashboard, utilisateurs, annonces, réservations, paiements, litiges, signalements, configuration, FAQ, audit, CSV. |
| 9. Qualité et sécurité | ✔ | Voir « Tests » ci-dessous ; audit des dépendances propre. |
| 10. Préparation production | Partiel | Documentation, CI, checklist ✔ ; Sentry, mesures Lighthouse en préproduction, déploiement : à faire par le propriétaire. |

## Tests (dernier passage, 29/10/2026)
| Suite | Résultat |
|---|---|
| Unitaires (Vitest) : commissions, montants, machine à états, matching, OTP, normalisation, schémas, saisies numériques, redirections, configuration | 45/45 ✔ |
| Intégration (Vitest + PostgreSQL) : cycle complet, IDOR, OTP, webhooks, double paiement, concurrence, capacité, KYC, catégories, corridors, annulation/remboursement, litige | 32/32 ✔ |
| E2E (Playwright, build de production) : scénarios A, B, C, D + interface (saisies numériques, filtres, boutons, notifications, mobile sans débordement) | 32/32 ✔ |
| TypeScript strict | 0 erreur |
| ESLint | 0 erreur, 3 avertissements (bibliothèque React Hook Form non optimisable par le compilateur React, navigation Better Auth) |
| `pnpm audit` | aucune vulnérabilité |
| Build de production | ✔ |

## Lighthouse (local, build de production, profil mobile simulé par défaut)
| Page | Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|---|
| Accueil | 83 | 100 | 100 | 100 |
| Recherche (Marseille → Béjaïa) | 92 | 100 | 100 | 100 |
| Connexion | 83 | 100 | 96 | 63 (page volontairement `noindex`) |

Accueil et connexion sous l'objectif de 90 en performance (TBT 340 à 510 ms sur CPU mobile simulé, LCP 2,8 à 3,5 s). Mesure locale, sans CDN ni compression de l'hébergeur : à refaire sur la préproduction. Pistes : réduire le JavaScript client de l'en-tête et du formulaire de recherche, précharger la police d'affichage.
