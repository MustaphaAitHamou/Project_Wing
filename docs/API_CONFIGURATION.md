# Configuration des services externes

Chaque service a un adaptateur dans le code et un mode de développement sans compte. Voici ce qu'il faut fournir pour activer les vrais services.

| Service | Variables | Ce que vous devez faire |
|---|---|---|
| **Stripe Payments + Connect** | `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Créer un compte Stripe (entité Tamurt Services, France). Activer **Connect** (type Express, modèle « plateforme »), renseigner le profil de plateforme. Commencer avec les clés `sk_test_…`. Créer l'endpoint webhook (voir DEPLOYMENT.md) et copier son `whsec_…`. Demander par écrit à Stripe la prise en charge des versements vers l'Algérie pour votre compte avant toute activation du pays. |
| **Stripe Identity** | `KYC_PROVIDER=stripe_identity`, `STRIPE_IDENTITY_WEBHOOK_SECRET` | Activer Identity dans le tableau de bord Stripe (soumis à validation de Stripe), créer un endpoint webhook dédié. |
| **Resend** | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` | Créer un compte, vérifier le domaine d'envoi (SPF/DKIM), créer une clé API « sending only ». |
| **Twilio (SMS, optionnel)** | `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Compte Twilio, numéro ou sender ID autorisé pour la France et l'Algérie (vérifier les règles d'enregistrement d'expéditeur en Algérie). Activer ensuite `notifications.smsEnabled` dans l'admin. |
| **Google OAuth (optionnel)** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Console Google Cloud → identifiants OAuth « application Web » ; URI de redirection : `https://<domaine>/api/auth/callback/google`. |
| **Stockage S3** | `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_ORIGIN` | Bucket **privé** en région UE, clé limitée au bucket (put/get/delete). `S3_PUBLIC_ORIGIN` = origine des URLs signées (pour la CSP). |
| **Sentry (optionnel)** | `SENTRY_DSN` | Variable réservée ; l'intégration du SDK reste à faire (voir KNOWN_ISSUES.md). |
| **Cartographie** | — | Non nécessaire : l'autocomplétion des villes repose sur un référentiel local (alias kabyles/français inclus). Mapbox/Google Maps pourra être ajouté pour les adresses précises si besoin. |

## Tester Stripe en local
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # affiche le whsec_ à mettre dans STRIPE_WEBHOOK_SECRET
PAYMENT_PROVIDER=stripe pnpm dev
```
Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.
