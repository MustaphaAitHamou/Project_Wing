# Sécurité

| Menace | Mesure |
|---|---|
| Injection SQL | Prisma paramétré ; SQL brut exclusivement via `Prisma.sql` / templates paramétrés. Aucun `$queryRawUnsafe` sur des entrées utilisateur (seul usage : TRUNCATE des tests sur la base `tamurt_test`). |
| XSS | Rendu React échappé ; aucun HTML utilisateur ; `dangerouslySetInnerHTML` limité au JSON-LD sérialisé (échappement de `<`) et aux SVG de QR générés côté serveur ; CSP stricte avec nonce par requête et `strict-dynamic`. |
| CSRF | Server Actions : contrôle d'origine natif Next.js ; Better Auth : `trustedOrigins` + cookies `SameSite=Lax` ; webhooks : signature. |
| IDOR | Chaque service charge la ressource et vérifie la participation ; réponse « introuvable » pour une ressource d'autrui. Testé (intégration + E2E). |
| Élévation de privilèges | `role` absent des champs modifiables Better Auth (`input: false`) ; changement de rôle réservé aux ADMIN, audité, sessions révoquées ; impossible sur soi ; dernier admin protégé. |
| Accès admin | `requireStaff` + 2FA TOTP obligatoire (`ADMIN_REQUIRE_2FA`) ; décisions financières réservées aux ADMIN. |
| Force brute | Rate limiting Better Auth en base (connexion 8/min, inscription, reset, 2FA 5/min) ; limiteur applicatif (messages, propositions, uploads, OTP, contact) ; OTP 5 essais. |
| Sessions | Cookies HttpOnly, Secure en production, SameSite Lax ; 30 jours ; révocation à la réinitialisation du mot de passe ; liste et révocation des autres sessions. |
| Mots de passe | Hachage scrypt (Better Auth), 10 caractères min. avec complexité. |
| OTP / QR | HMAC-SHA256 avec pepper serveur, lié à réservation + étape ; jamais stocké en clair ; expiration ; consommation unique atomique ; jeton QR dans le fragment d'URL (non journalisé) ; envoi via job (pas de code en clair dans la file). |
| Paiements | Webhooks signés, idempotence (événement unique), contrôle du montant, clés d'idempotence Stripe, montants figés, aucun état « payé » sans confirmation prestataire. |
| Uploads | Détection du type par signature binaire, liste blanche (JPEG, PNG, WebP, PDF), taille limitée, nom de fichier aléatoire, stockage privé, URL signée courte, `Content-Disposition` et CSP `sandbox` sur le service local. |
| Données sensibles | Destinataire et téléphone visibles uniquement après paiement et par les parties ; aucun document KYC stocké ; journaux structurés avec masquage des clés sensibles ; contenu des emails non conservé en production. |
| Secrets | Variables d'environnement validées au démarrage ; `.env` ignoré par Git ; simulateurs refusés en production. |
| Clickjacking / divers | `frame-ancestors 'none'`, `X-Frame-Options DENY`, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. |
| Dépendances | `pnpm audit` en CI ; overrides pour les dépendances transitives vulnérables (mysql2, deepmerge-ts) ; Next.js 16.4.3 (correctifs RCE de 16.4.0). |
| Export CSV | Neutralisation des formules (`=`, `+`, `-`, `@`). |

## Tests de sécurité automatisés
- Intégration (`tests/integration/security.test.ts`) : IDOR, OTP invalide/expiré/double, webhook dupliqué, double paiement, montant falsifié, réservations concurrentes, survente, KYC, catégories interdites, corridors fermés, litige.
- E2E (`e2e/security.spec.ts`) : redirections, /admin interdit, export admin 403, cron 401, édition d'annonce d'autrui, OTP invalide/expiré, double confirmation par QR, rejeu de session de paiement, webhook non signé, acceptations simultanées.

## Signalement de vulnérabilité
Prévoir une adresse dédiée (security@…) et un fichier `/.well-known/security.txt` avant le lancement.
