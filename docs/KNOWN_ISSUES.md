# Limites connues et travaux restants

Ce fichier liste honnêtement ce qui n'est pas fait, simulé ou incomplet.

## Bloqué par des éléments externes
| Sujet | État | Ce qu'il faut |
|---|---|---|
| Paiements réels | Adaptateur Stripe complet (Checkout, webhooks, remboursements, Connect) **non exécuté contre Stripe** : aucune clé disponible. Les tests utilisent le simulateur local, qui passe par le même code de traitement. | Clés Stripe test, puis validation du parcours réel. |
| Versements vers l'Algérie | Bloqués côté serveur (`country.payoutsEnabled=false`). | Confirmation écrite du prestataire + conformité réglementation des changes. |
| Vérification d'identité réelle | Adaptateur Stripe Identity écrit, non exécuté. Simulateur en dev. | Activation Stripe Identity. |
| Emails réels | Adaptateur Resend écrit, non exécuté ; mode outbox en dev. | Clé Resend + domaine vérifié. |
| SMS | Adaptateur Twilio (API REST) écrit, non exécuté ; désactivé. | Compte Twilio. |
| Connexion Google | Configurée via Better Auth, non testée (pas d'identifiants). | Identifiants OAuth Google. |
| Stockage S3 | Adaptateur écrit (URLs présignées), non exécuté ; stockage local en dev. | Bucket et clés. |
| Corridor France ⇄ Algérie | TEST_ONLY : fermé en production. | Validation juridique (COMPLIANCE_CHECKLIST.md). |
| Pages légales | Structurées, passages « [À VALIDER] ». | Juriste. |
| DimHum | Site inaccessible (certificat TLS expiré) : analyse limitée aux sources publiques secondaires. | — |

## Non développé
- **Sentry** : variable `SENTRY_DSN` réservée, SDK non intégré. Les erreurs sont journalisées en JSON sur stdout.
- **Notifications push web** : non implémentées (aucune promesse dans l'interface).
- **Traductions** (anglais, arabe RTL, tamazight) : architecture préparée (`lang`/`dir`, textes centralisables), aucune traduction livrée.
- **Assurance** : aucune.
- **Suivi GPS** : volontairement absent ; le suivi repose sur les étapes confirmées.
- **Chiffrement de bout en bout de la messagerie** : non ; la messagerie est privée (contrôle d'accès) et l'accès modération est journalisé.
- **Suppression de compte en libre-service (RGPD)** et export des données personnelles : à développer (actuellement via le support / suspension par l'admin).
- **Consultation par l'admin d'une conversation liée à un litige** : le service `staffReadConversation` (journalisé) existe, pas encore d'écran dédié.
- **Re-encodage des images** (suppression des métadonnées EXIF/GPS des photos) : non fait ; les photos sont stockées telles quelles en privé.
- **Recherche géographique par rayon** : non ; correspondance par ville exacte ou par pays (suggestions).

## Limitations techniques assumées
- Temps réel : une connexion PostgreSQL par client SSE ; au-delà de quelques centaines d'utilisateurs connectés simultanément, passer à un service dédié. Repli automatique par rafraîchissement (20 s).
- File de tâches en base : adaptée au volume de lancement.
- Destinataire sans email ni SMS configuré : le code de livraison est envoyé à l'expéditeur, qui le transmet. Moins robuste qu'un canal direct.
- Clôture automatique d'une livraison non confirmée par l'expéditeur après `booking.autoCompleteDays` (7 j par défaut).
- Un seul devise (EUR) pour les transactions.
- Mesures Lighthouse / Core Web Vitals : non mesurées sur une infrastructure de production (voir rapport de fin de phase).
- `next dev` recharge la page à la première compilation d'une route : les E2E tournent donc sur un build de production.
