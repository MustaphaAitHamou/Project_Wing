# Guide de développement

## Prérequis
Node.js ≥ 22, pnpm 10, PostgreSQL 16 (ou `docker compose up -d`).

## Installation
```bash
pnpm install
cp .env.example .env            # compléter BETTER_AUTH_SECRET, OTP_PEPPER, CRON_SECRET
cp .env.test.example .env.test  # base dédiée aux tests d'intégration
pnpm db:deploy                  # ou pnpm db:migrate en développement
SEED_DEMO=true pnpm db:seed     # référentiels + comptes de démonstration
pnpm dev
```
Comptes de démo (mot de passe : `DemoTamurt2026!` ou `SEED_DEMO_PASSWORD`) : `admin@demo.tamurt.local`, `expediteur@demo.tamurt.local`, `voyageur@demo.tamurt.local`. En local, `ADMIN_REQUIRE_2FA=false` permet d'accéder à /admin sans 2FA.

## Outils de développement
- `/dev/mailbox` : emails émis (mode outbox), y compris liens de vérification et codes OTP.
- `/dev/paiement/[session]` : simulateur de paiement (succès, refus, abandon).
- `/dev/kyc/[ref]`, `/dev/compte-versement/[id]` : simulateurs KYC et compte de versement.
- La file de tâches est traitée après chaque requête ; `pnpm jobs:run` pour un worker continu.

## Tests
```bash
pnpm test        # unitaires + intégration (PostgreSQL réel, base tamurt_test, séquentiel)
pnpm test:e2e    # Playwright : migre et prépare tamurt_e2e, build de production sur :3100 (E2E_TEST_MODE)
```
Les tests d'intégration vident la base `tamurt_test` (garde-fou sur le nom). Les tests E2E ne détruisent rien : comptes uniques à chaque exécution.

## Ajouter une fonctionnalité
1. Logique pure dans `lib/domain` + test unitaire.
2. Service dans `server/services` (autorisation, transaction, audit si sensible) + test d'intégration.
3. Schéma Zod dans `features/<domaine>/schemas.ts`, Server Action dans `actions.ts`.
4. UI (composant serveur + composant client si interaction), états vide/chargement/erreur.
5. Mettre à jour `docs/PROGRESS.md`, `KNOWN_ISSUES.md`, `lib/feature-status.ts` si pertinent.

## Migrations
`pnpm db:migrate --name <nom>` ; les contraintes CHECK et index partiels s'écrivent à la main dans le SQL généré (`--create-only` puis édition). Ne jamais modifier une migration déjà déployée.
