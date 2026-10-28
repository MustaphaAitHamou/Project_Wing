# AGENTS.md : Tamurt Sending

Contexte permanent pour les agents de développement. À lire avant toute modification.

## Projet
Tamurt Sending (Tamurt Services) est une marketplace de crowdshipping : des expéditeurs publient des colis, des voyageurs publient leurs trajets, la plateforme les met en relation, sécurise le paiement (prestataire externe) et la remise / livraison par codes OTP. Marché initial France ⇄ Algérie (Kabylie). Langue : français.

## Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS 4, composants maison façon shadcn (Radix), Lucide.
- PostgreSQL 16, Prisma 7 (client généré dans `generated/prisma`, adaptateur `@prisma/adapter-pg`).
- Better Auth (email/mot de passe, vérification email, reset, Google optionnel, 2FA TOTP, rate limiting en base).
- Zod 4, React Hook Form, TanStack Query (provider en place).
- Stripe (Checkout, Connect, Identity) via adaptateurs ; simulateurs locaux pour dev/test.
- Vitest (unitaires + intégration sur PostgreSQL réel), Playwright (E2E sur build de production).

## Commandes
```bash
pnpm install                     # installe et génère le client Prisma
pnpm dev                         # serveur de dev (port 3000)
pnpm db:migrate                  # nouvelle migration (dev)
pnpm db:deploy                   # applique les migrations (CI/prod)
SEED_DEMO=true pnpm db:seed      # référentiels + comptes de démo
pnpm typecheck && pnpm lint      # vérifications statiques
pnpm test                        # Vitest (base tamurt_test, voir .env.test)
pnpm test:e2e                    # Playwright (base tamurt_e2e, build de prod sur :3100)
pnpm jobs:run                    # worker de file de tâches (alternative au cron)
```

## Structure
- `app/` : routes (groupes `(public)`, `(auth)`, `tableau-de-bord`, `admin`, `dev` (simulateurs), `api`).
- `components/` : UI générique (`ui/`), mise en page, marketplace, dashboard.
- `features/<domaine>/` : schémas Zod partagés, Server Actions, composants client du domaine.
- `server/` : code serveur uniquement (`import "server-only"`) : services métier, auth, paiements, KYC, stockage, emails, jobs, sécurité.
- `lib/domain/` : logique pure testable (montants, machine à états, matching, OTP).
- `prisma/` : schéma, migrations (contraintes CHECK et index partiels écrits à la main), seed.
- `tests/` (Vitest), `e2e/` (Playwright), `docs/`.

## Conventions
- Montants en centimes (Int) + devise ISO explicite. Poids en grammes, volumes en cm³. Jamais de flottant sur un montant.
- Toute écriture passe par un service de `server/services` ; les Server Actions (`features/*/actions.ts`) valident avec Zod via `action()` puis appellent le service.
- Autorisation dans le service, sur chaque ressource : une ressource d'autrui renvoie NOT_FOUND (anti-IDOR).
- Transitions de réservation uniquement via `transition()` (machine à états + update conditionnel + historique).
- Effets de bord asynchrones (emails, OTP, matching, versements) via la file `job` (pattern outbox, `enqueue` dans la transaction).
- Toute action d'administration sensible est auditée (`audit()`).
- Textes UI en français, ton direct, aucune promesse non tenue (assurance, garantie, chiffrement de bout en bout).

## Règles de sécurité
- Jamais de secret dans Git ; `.env` ignoré ; `.env.example` à jour.
- Les simulateurs (paiement, KYC, stockage local) sont refusés en production par `lib/env.ts` (sauf `E2E_TEST_MODE`, réservé aux tests).
- Codes OTP et jetons QR stockés uniquement hachés (HMAC + pepper), à usage unique, expirants, essais limités.
- Paiement « payé » posé uniquement à réception d'un webhook vérifié ; webhooks idempotents (`payment_event` unique).
- Rôles modifiables uniquement par un ADMIN depuis /admin (audité) ; 2FA obligatoire pour /admin.
- Fichiers : type détecté par signature binaire, taille limitée, stockage privé, accès par URL signée après contrôle des droits.
- CSP stricte avec nonce (proxy.ts), en-têtes de sécurité (next.config.ts).

## Critères d'acceptation d'un module
Code présent, connecté à la base, contrôles d'accès et validations serveur, états de chargement/erreur, tests passants, limitations documentées dans `docs/KNOWN_ISSUES.md`, `docs/PROGRESS.md` mis à jour, commit.

## Décisions d'architecture
Voir `docs/DECISIONS.md` (ADR) et `docs/ARCHITECTURE.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
