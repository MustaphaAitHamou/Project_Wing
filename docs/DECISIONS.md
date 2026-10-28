# Décisions techniques (ADR)

### ADR-001 : Next.js 16 App Router + Server Actions, monolithe modulaire
Un seul déploiement, services métier séparés des interfaces (`server/services`), domaine pur testable (`lib/domain`). Pas de micro-services au lancement.

### ADR-002 : PostgreSQL + Prisma 7 (adaptateur pg), SQL brut ciblé
Prisma pour le CRUD et les types ; SQL paramétré pour la recherche, les verrous (`FOR UPDATE`), les UPDATE conditionnels et les contraintes CHECK/index partiels.

### ADR-003 : Better Auth plutôt qu'Auth.js
Auth.js v5 était encore en bêta. Better Auth (stable) fournit email/mot de passe, vérification, reset, OAuth, 2FA TOTP, rate limiting en base et adaptateur Prisma, sans code d'authentification maison.

### ADR-004 : Montants en centimes (Int)
Exactitude sans flottants ; commission arrondie en arithmétique entière.

### ADR-005 : Commission par défaut retenue sur le voyageur
Conforme à l'exemple du cahier des charges (50 € → 5 € de commission, 45 € au voyageur, l'expéditeur paie 50 €). Le modèle alternatif (surcharge expéditeur) est disponible dans la configuration. Les frais Stripe sont supportés par la plateforme sur sa commission : **à valider** côté rentabilité.

### ADR-006 : Stripe Connect « charges et transferts séparés »
Permet de différer le versement jusqu'à la livraison confirmée et de bloquer en cas de litige, sans que la plateforme détienne les fonds (ils restent sur le solde Stripe). Mangopay reste une alternative à étudier (agrément de monnaie électronique, marketplaces UE), non intégrée.

### ADR-007 : Double OTP + QR, codes non stockés en clair
Codes générés dans un job (jamais dans la file en clair), envoyés par email (et SMS si configuré), hachés en HMAC liés à la réservation. Destinataire sans email : le code de livraison est envoyé à l'expéditeur qui le relaie (limitation documentée).

### ADR-008 : File de tâches en base (outbox) plutôt que Redis
Aucune infrastructure supplémentaire, transactionnelle avec les écritures métier. Déclenchement par `after()`, cron HTTP ou worker. À remplacer par une file dédiée si le volume l'exige.

### ADR-009 : Temps réel par SSE + PostgreSQL LISTEN/NOTIFY
Aucun prestataire externe au lancement ; repli par rafraîchissement périodique. Interface isolée (`signalRealtime`) pour migrer vers Ably/Supabase Realtime.

### ADR-010 : Référentiel de villes local plutôt que Mapbox
Le besoin est la ville (pas l'adresse) ; les variantes kabyles (Bgayet, Tizi Wezzu, Tubirett…) sont mieux servies par un référentiel maîtrisé avec recherche normalisée.

### ADR-011 : Corridors TEST_ONLY par défaut
La plateforme est techniquement prête mais le droit d'exploiter n'est pas acquis ; l'ouverture LIVE exige une confirmation explicite auditée.

### ADR-012 : E2E sur build de production avec `E2E_TEST_MODE`
Le serveur de dev recompile et recharge les pages à la première visite d'une route, ce qui rend les tests instables. Les E2E tournent sur `next build && next start` ; `E2E_TEST_MODE` autorise simulateurs et corridors de test sur ce build uniquement.

### ADR-013 : Pas de réinitialisation destructive de la base E2E par l'agent
Prisma bloque `migrate reset` lorsqu'il est lancé par un agent IA, sans consentement explicite. La préparation E2E est non destructive (`migrate deploy`, seed idempotent, comptes uniques).

### ADR-014 : Composants UI maison (style shadcn) au lieu du CLI shadcn
Même approche (Radix + Tailwind + cva), écrits directement pour Tailwind 4 et React 19, sans dépendre du registre en ligne pendant le développement.
