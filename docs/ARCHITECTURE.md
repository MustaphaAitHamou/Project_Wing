# Architecture

## Vue d'ensemble
```
Navigateur ──HTTPS──▶ Next.js (App Router, Node.js)
                      ├─ proxy.ts : CSP à nonce, en-têtes
                      ├─ Pages serveur (RSC)  ─┐
                      ├─ Server Actions        ├─▶ server/services (métier) ─▶ Prisma ─▶ PostgreSQL
                      ├─ Route Handlers (api) ─┘          │                         ▲ LISTEN/NOTIFY
                      │    ├─ /api/auth/*  (Better Auth)    ├─ server/jobs (file outbox `job`)
                      │    ├─ /api/webhooks/stripe*          ├─ server/payments (Stripe | simulateur)
                      │    ├─ /api/realtime (SSE)            ├─ server/kyc (Stripe Identity | simulateur)
                      │    ├─ /api/cron/{jobs,maintenance}   ├─ server/storage (S3 | local, URLs signées)
                      │    └─ /api/files, /api/avatars, /api/cities, /api/admin/export
                      └─ Worker optionnel : pnpm jobs:run
Prestataires : Stripe (Checkout, Connect, Identity), Resend, Twilio (option), S3, Sentry (option)
```

## Couches
1. **UI** (`app/`, `components/`, `features/*/*.tsx`) : composants serveur par défaut ; composants client pour les formulaires et interactions.
2. **Server Actions** (`features/*/actions.ts`) : validation Zod via `action()`, récupération de l'utilisateur (`requireUser`/`requireStaff`), appel d'un service, `revalidatePath`. Aucune logique métier.
3. **Services** (`server/services/*`, `server/payments/service.ts`, `server/kyc`) : règles métier, autorisations par ressource, transactions.
4. **Domaine pur** (`lib/domain/*`) : calculs sans I/O (commission, machine à états, matching, OTP), testés unitairement.
5. **Persistance** : Prisma 7 + adaptateur pg ; SQL brut paramétré (`Prisma.sql`) pour la recherche, les verrous et les UPDATE conditionnels.

## Garanties de cohérence
- **Double réservation** : `SELECT … FOR UPDATE` sur le colis + index unique partiel `booking_one_active_per_parcel`.
- **Survente** : UPDATE conditionnel atomique sur `trip.reservedGrams` + contrainte CHECK.
- **Transitions** : `transition()` vérifie l'arête et l'acteur, puis `UPDATE … WHERE status = from AND version = v` (verrou optimiste).
- **Webhooks** : insertion de `payment_event` unique (provider, id) avant traitement ; doublon ignoré.
- **Paiement unique** : index unique partiel sur `payment(bookingId) WHERE succeededAt IS NOT NULL` ; paiement en double remboursé automatiquement.
- **Versement unique** : `payout.bookingId` unique, verrou PENDING→PROCESSING, clé d'idempotence prestataire.
- **OTP** : incrément atomique des essais, consommation conditionnelle `consumedAt IS NULL`, index unique d'un code actif par étape.

## File de tâches
Table `job` (outbox) : `enqueue()` dans la transaction métier ; traitement par `runDueJobs()` (`FOR UPDATE SKIP LOCKED`, backoff exponentiel, 5 essais), déclenché :
- juste après la réponse HTTP (`after()` de Next.js) ;
- par `/api/cron/jobs` (cron externe, toutes les minutes recommandé) ;
- ou par le worker `pnpm jobs:run`.
`/api/cron/maintenance` (horaire) : expirations, clôtures automatiques, KYC expirés, relance des versements bloqués, purge.

## Temps réel
`/api/realtime` : flux SSE par utilisateur alimenté par `LISTEN tamurt_realtime`. Une connexion PostgreSQL par client connecté : adapté au lancement (quelques centaines de connexions). Au-delà : service dédié (Ably, Pusher, Supabase Realtime) derrière la même interface `signalRealtime()`. Repli : rafraîchissement toutes les 20 s dans le fil de discussion. Nécessite un hébergement Node.js qui supporte les réponses longues (pas de fonctions serverless à durée courte).

## Sécurité
Voir `SECURITY.md`.

## Internationalisation
Le site est en français (`<html lang="fr" dir="ltr">`). Les textes sont actuellement dans les composants. Plan : extraction vers des catalogues (`next-intl`), segment `[locale]`, `dir="rtl"` pour l'arabe (Tailwind gère `rtl:`), tamazight en latin et tifinagh. Aucune traduction non relue ne sera publiée.
