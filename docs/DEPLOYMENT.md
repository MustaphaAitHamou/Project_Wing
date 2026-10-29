# Guide de déploiement

> Aucun déploiement public, achat ou activation de paiement réel n'a été effectué. Les étapes ci-dessous sont à réaliser par le propriétaire.

## Cible recommandée
- **Application** : hébergement Node.js persistant (Render, Railway, Fly.io, Scaleway Serverless Containers, VPS + Docker…) pour le flux temps réel SSE et `after()`. Vercel fonctionne aussi (le temps réel bascule alors sur le repli par rafraîchissement, et les crons doivent être déclarés).
- **PostgreSQL managé** (Neon, Supabase, Scaleway, OVH, RDS) avec sauvegardes automatiques et PITR. Région UE.
- **Stockage S3** privé (Scaleway Object Storage, OVH, AWS S3 eu-west-3, Cloudflare R2).
- **Emails** : Resend avec domaine vérifié (SPF, DKIM, DMARC).
- **Monitoring** : Sentry (`SENTRY_DSN`) + logs JSON de l'hébergeur.

## Étapes
1. Créer la base, le bucket S3 (privé, chiffrement au repos, CORS non nécessaire), le domaine Resend.
2. Définir toutes les variables de `.env.example` dans l'hébergeur (`EMAIL_PROVIDER=resend`, `PAYMENT_PROVIDER=stripe`, `KYC_PROVIDER=stripe_identity`, `STORAGE_DRIVER=s3`, `ADMIN_REQUIRE_2FA=true`). **Ne jamais définir `E2E_TEST_MODE`, `RATE_LIMIT_RELAXED` ni `SEED_DEMO` en production.**
3. Build : `pnpm install --frozen-lockfile && pnpm build`.
4. Migrations (étape de release, avant le démarrage) : `pnpm db:deploy` puis `pnpm db:seed` (référentiels uniquement).
5. Démarrage : `pnpm start` (port `$PORT`).
6. Crons : `POST /api/cron/jobs` chaque minute et `POST /api/cron/maintenance` chaque heure, avec `Authorization: Bearer $CRON_SECRET` (ou lancer `pnpm jobs:run` comme worker).
7. Webhooks Stripe : `https://<domaine>/api/webhooks/stripe` (événements : checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, payment_intent.payment_failed, refund.created, refund.updated, account.updated) et `https://<domaine>/api/webhooks/stripe-identity` (identity.verification_session.verified, identity.verification_session.requires_input).
8. Créer le premier administrateur : s'inscrire normalement, puis en base `UPDATE "user" SET role='ADMIN' WHERE email='…';` (opération unique, à journaliser manuellement) ; activer la 2FA à la première connexion.
9. Vérifier /admin/configuration : corridors, pays, commission, bandeau.

## Mises à jour
Déploiement bleu/vert ou rolling ; migrations additives d'abord (compatibles avec la version précédente), suppressions de colonnes dans une version ultérieure.

## Sauvegarde et restauration
- Sauvegardes managées quotidiennes + PITR 7 jours minimum.
- Export logique hebdomadaire hors fournisseur : `pg_dump --format=custom --no-owner "$DATABASE_URL" > tamurt-$(date +%F).dump`, chiffré et stocké dans un bucket distinct.
- **Restauration** : créer une base vide, `pg_restore --no-owner --dbname "$NEW_URL" tamurt-AAAA-MM-JJ.dump`, vérifier `pnpm prisma migrate status`, basculer `DATABASE_URL`, redémarrer. Le stockage S3 doit être versionné pour restaurer les fichiers.
- Tester la restauration chaque trimestre sur un environnement de préproduction.
- Après restauration, réconcilier les paiements avec le tableau de bord Stripe (événements rejoués par Stripe ou via `stripe events resend`).

## CI/CD
`.github/workflows/ci.yml` : installation, audit des dépendances, lint, typecheck, tests (PostgreSQL de service), build, E2E. Le déploiement continu n'est pas configuré (à brancher sur l'hébergeur choisi après validation).

## Vercel (configuration fournie : `vercel.json`)
- Migrations : appliquées automatiquement au build **de production uniquement** (`VERCEL_ENV=production`), jamais par les déploiements de prévisualisation.
- Crons Vercel : `/api/cron/jobs` et `/api/cron/maintenance` une fois par jour (limite du plan Hobby). Vercel envoie `Authorization: Bearer $CRON_SECRET` automatiquement si `CRON_SECRET` est défini. Les tâches sont aussi traitées juste après chaque requête (`after()`).
- Définir `INLINE_JOB_WORKER=false` (pas de processus persistant en serverless).
- Temps réel : les fonctions ont une durée limitée ; la messagerie bascule sur le rafraîchissement périodique (20 s).
- Fichiers : le disque Vercel n'est pas persistant. Pour une démo, `STORAGE_LOCAL_DIR=/tmp/storage` (photos perdues entre deux invocations) ; en vrai, S3/R2.
- Démo sans prestataires réels : `E2E_TEST_MODE=true` active les simulateurs (paiement, KYC, pages /dev). À réserver à un déploiement protégé (Vercel Deployment Protection), jamais au site public.
