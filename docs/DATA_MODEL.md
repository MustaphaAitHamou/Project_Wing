# Modèle de données

Schéma : `prisma/schema.prisma`. Migrations : `prisma/migrations/` (contraintes métier ajoutées en SQL dans `*_init/migration.sql`).

## Conventions
- Identifiants `cuid` (texte) ; tables d'auth au format Better Auth.
- Montants : `Int` en centimes + `currency` (ISO 4217). Poids en grammes, volume en cm³.
- Horodatages `createdAt` / `updatedAt` ; dates calendaires en `@db.Date` (UTC).
- Suppression : `Cascade` pour les dépendances pures (photos, messages), `Restrict` pour les entités financières (un utilisateur avec réservations ne peut pas être supprimé physiquement : suspension).

## Entités (correspondance avec le cahier des charges)
| Demandé | Implémentation |
|---|---|
| User, Account, Session, VerificationToken | `user`, `account`, `session`, `verification` (+ `twoFactor`, `rateLimit`) |
| UserProfile | `user_profile` (bio, ville approximative, agrégats de note, compteurs, statut KYC, préférences de notification) |
| IdentityVerification | `identity_verification` (prestataire, référence de session, statut, expiration ; aucun document) |
| Address | Fusionné : la seule adresse nécessaire est celle du destinataire (`parcel_recipient`) ; aucune adresse postale complète n'est collectée (minimisation RGPD) |
| Country, City | `country` (activation, versements autorisés), `city` (alias, `searchNames` normalisés indexés GIN) |
| Route | `corridor` (pays → pays, statut DISABLED/TEST_ONLY/LIVE, modes autorisés, poids max) |
| Trip, TripCapacity | `trip` (capacité et réservé fusionnés, contrainte CHECK) |
| Parcel, ParcelPhoto, ParcelCategory | `parcel`, `parcel_photo`, `parcel_category` (interdite, validation requise, modes autorisés) + `parcel_recipient` (privé) |
| Proposal | `proposal` (sens TRAVELER/SENDER, unique par colis+trajet) |
| Booking, BookingStatusHistory | `booking` (montants figés, version), `booking_status_history` |
| Payment, PaymentEvent, Payout, Commission | `payment`, `payment_event` (journal webhooks, unique), `refund`, `payout`, `payout_account`, `commission` |
| Conversation, ConversationParticipant, Message | idem + `user_block` |
| Notification | `notification` ; file d'envoi `job` ; journal `email_log` |
| Delivery, DeliveryEvent, DeliveryVerification | Delivery fusionnée dans `booking` (dates de remise/livraison) ; `delivery_event`, `delivery_verification` (hash OTP/QR) |
| Review | `review` (unique par réservation et auteur, CHECK note 1-5, CHECK auteur ≠ sujet) |
| Dispute, DisputeEvidence | `dispute`, `dispute_evidence`, `dispute_event` (historique des décisions et échanges) |
| Report | `report` |
| AuditLog | `audit_log` |
| PlatformSetting | `platform_setting` (validé par schéma Zod), `faq_item` |
| — | `rate_limit_bucket` (limiteur applicatif) |

## Contraintes SQL notables
- `trip_reserved_within_capacity`, `trip_reserved_volume_within_capacity`, `trip_dates_ordered`, `trip_distinct_cities`
- `parcel_positive_dimensions`, `parcel_amounts_non_negative`, `parcel_distinct_cities`
- `booking_amounts_consistent`, index unique partiel `booking_one_active_per_parcel`
- `payment_amounts`, index unique partiel `payment_one_success_per_booking` (sur `succeededAt`)
- `review_rating_range`, `review_not_self`, `user_block_not_self`
- `delivery_verification_attempts`, index unique partiel `delivery_verification_one_active`

## Index de recherche
`trip(status, originCityId, destCityId, departureDate)`, `parcel(status, originCityId, destCityId, desiredDate)`, `city.searchNames` (GIN), index par utilisateur/date sur toutes les listes du tableau de bord.

## Données de démonstration
`SEED_DEMO=true pnpm db:seed` (refusé en production) : 3 comptes `@demo.tamurt.local`, 3 trajets et 2 colis marqués `isDemo`, affichés avec un badge « Démo » et exclus du sitemap.
