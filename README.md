# Tamurt Sending

Marketplace de livraison collaborative (crowdshipping) : envoyez vos colis grâce aux voyageurs qui font déjà le trajet entre la France et l'Algérie. Projet de **Tamurt Services**.

> **État :** techniquement prêt pour une revue de lancement, **pas encore commercialement opérationnel**. Les paiements réels, la vérification d'identité réelle, l'envoi d'emails réels, le corridor France ⇄ Algérie et les pages légales attendent la configuration des prestataires et une validation juridique. Voir [docs/COMPLIANCE_CHECKLIST.md](docs/COMPLIANCE_CHECKLIST.md) et [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md).

## Fonctionnalités
- Comptes uniques expéditeur + voyageur : email vérifié, mot de passe, Google (option), double authentification, vérification d'identité (Stripe Identity).
- Publication de colis (formulaire en 5 étapes, photos, destinataire privé) et de trajets (capacité, tarif au kilo).
- Recherche PostgreSQL tolérante aux accents et aux noms kabyles (Béjaïa / Bejaia / Bgayet), filtres, tri, pagination, URLs partageables.
- Matching scoré et explicable, notifications de nouvelles correspondances.
- Propositions dans les deux sens, réservation transactionnelle (pas de double réservation ni de survente), machine à états à 14 états.
- Paiement Stripe Checkout + webhooks idempotents, commission configurable, remboursements, versements Stripe Connect avec blocages par pays et litige.
- Remise et livraison confirmées par deux codes OTP (et QR code), hachés, expirants, à usage unique.
- Messagerie temps réel, notifications (application, email, SMS optionnel), avis réciproques, litiges avec preuves.
- Administration : tableau de bord, utilisateurs, modération, réservations, paiements, litiges, signalements, configuration (corridors, pays, catégories, commission), FAQ, audit, export CSV.
- Thèmes clair/sombre, mobile d'abord, PWA installable, SEO.

## Démarrage rapide
```bash
docker compose up -d                       # PostgreSQL 16 (ou votre propre instance)
pnpm install
cp .env.example .env                       # compléter les secrets
cp .env.test.example .env.test
pnpm db:deploy
SEED_DEMO=true pnpm db:seed
ADMIN_REQUIRE_2FA=false pnpm dev           # http://localhost:3000
```
Comptes de démonstration : `admin@`, `expediteur@`, `voyageur@demo.tamurt.local`, mot de passe `DemoTamurt2026!`. Les emails (liens de vérification, codes) sont visibles sur `/dev/mailbox`. Paiements et KYC sont simulés (`/dev/paiement`, `/dev/kyc`), sans aucun débit réel.

## Commandes
| Commande | Rôle |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Développement, build, production |
| `pnpm lint` / `pnpm typecheck` | Vérifications statiques |
| `pnpm test` | Tests unitaires et d'intégration (PostgreSQL réel) |
| `pnpm test:e2e` | Tests end-to-end Playwright (build de production) |
| `pnpm db:migrate` / `pnpm db:deploy` / `pnpm db:seed` | Base de données |
| `pnpm jobs:run` | Worker de la file de tâches |

## Documentation
- [Spécification produit](docs/PRODUCT_SPEC.md) · [Architecture](docs/ARCHITECTURE.md) · [Modèle de données](docs/DATA_MODEL.md)
- [Paiements](docs/PAYMENTS.md) · [Sécurité](docs/SECURITY.md) · [Conformité](docs/COMPLIANCE_CHECKLIST.md)
- [Développement](docs/DEVELOPMENT.md) · [Déploiement](docs/DEPLOYMENT.md) · [Configuration des APIs](docs/API_CONFIGURATION.md) · [Checklist de mise en production](docs/PRODUCTION_CHECKLIST.md)
- [Avancement](docs/PROGRESS.md) · [Décisions](docs/DECISIONS.md) · [Limites connues](docs/KNOWN_ISSUES.md) · [Feuille de route](docs/ROADMAP.md)
- Contexte agents : [AGENTS.md](AGENTS.md)

## Stack
Next.js 16 · React 19 · TypeScript strict · Tailwind CSS 4 · Radix · Lucide · PostgreSQL 16 · Prisma 7 · Better Auth · Zod 4 · React Hook Form · Stripe · Resend · Vitest · Playwright.
