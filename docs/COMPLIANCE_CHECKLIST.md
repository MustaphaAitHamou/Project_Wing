# Dossier de conformité (à instruire avant tout lancement commercial)

> **Statut : questions ouvertes.** Ce document ne contient aucune affirmation juridique validée. Il liste ce qu'un juriste (droit des transports, douanes, consommation, fiscalité, paiements, RGPD) doit trancher, et les mécanismes techniques prévus pour appliquer ses conclusions. La création technique du site ne vaut pas autorisation d'exploiter le service.

## Mécanismes de blocage déjà en place
- **Corridors** : `corridor.status` DISABLED / TEST_ONLY / LIVE. France ⇄ Algérie est livré en **TEST_ONLY** : inutilisable en production tant qu'un administrateur ne le passe pas en LIVE en cochant une confirmation explicite de validation juridique et opérationnelle (audité).
- **Modes de transport** autorisés par corridor et par catégorie.
- **Catégories** : interdites (refus serveur), réglementées (validation manuelle), poids/valeur maximum configurables.
- **Versements** : `country.payoutsEnabled` (Algérie : désactivé) ; activation avec confirmation explicite du prestataire (auditée).
- **Prestataires** : simulateurs refusés en production ; prestataires de paiement activables/désactivables dans la configuration.
- **Registre des fonctions** (`lib/feature-status.ts`, visible dans /admin/configuration) : implémenté / testé / activé.
- **Pages légales** : structurées, passages non validés signalés « [À VALIDER] » et bandeau d'avertissement.

## Questions à trancher
### 1. Réglementation du transport
- Le voyageur rémunéré exerce-t-il une activité de transport de marchandises pour compte d'autrui ? Seuils (montant, fréquence) au-delà desquels une inscription au registre des transporteurs, une licence ou un statut professionnel est requis, en France et en Algérie ?
- La plateforme peut-elle être qualifiée de commissionnaire de transport, d'organisateur de transport ou d'intermédiaire ? Conséquences en responsabilité.
- Règles des compagnies aériennes et maritimes sur le transport de bagages appartenant à des tiers.
### 2. Statut des voyageurs rémunérés
- Revenus occasionnels / partage de frais / activité professionnelle : critères et obligations déclaratives (France : déclaration automatique des revenus par les plateformes, art. 242 bis CGI ; directive DAC7). Situation des voyageurs résidant en Algérie.
### 3. Douanes France–Algérie
- Franchises applicables aux envois de particulier à particulier transportés dans les bagages d'un tiers ; produits prohibés ou soumis à licence ; déclaration de contenu ; responsabilité du voyageur qui passe la frontière avec le bien d'autrui.
- Sources officielles à consulter : douane.gouv.fr (DGDDI), douane.gov.dz (Direction générale des douanes algériennes), règlement (UE) 952/2013 (code des douanes de l'Union).
### 4. Marchandises interdites ou réglementées
- Liste à consolider à partir des sources douanières et des règles IATA/compagnies (marchandises dangereuses, batteries lithium, liquides). La liste actuelle de la plateforme est prudente et non exhaustive.
### 5. Responsabilités
- Perte, vol, casse, retard, saisie douanière : qui répond, dans quelles limites ? Clause limitative opposable aux consommateurs ?
### 6. Assurance
- Aucune assurance n'est proposée. Étudier un partenariat (responsabilité civile de la plateforme, assurance colis optionnelle). Le site n'affiche aucune garantie tant que rien n'est souscrit.
### 7. RGPD
- Registre des traitements, base légale de chaque traitement, durées de conservation (non définies : voir politique de confidentialité), analyse d'impact (KYC, transferts hors UE vers l'Algérie : décision d'adéquation ? clauses contractuelles types ?), sous-traitants (DPA Stripe, Resend, hébergeur, S3, Sentry), information des destinataires dont les données sont saisies par l'expéditeur.
### 8. Conditions générales et droit de la consommation
- Obligations d'information des plateformes (art. L.111-7 et D.111-6 s. Code de la consommation), classement des offres, droit de rétractation applicable à la prestation de mise en relation, médiateur de la consommation, mentions légales.
### 9. Traitement des paiements
- Encaissement pour compte de tiers : la plateforme doit opérer comme agent d'un établissement de paiement (ex. Stripe Connect) et ne jamais détenir les fonds. Valider le schéma « charges et transferts séparés » et son exemption éventuelle d'agrément.
- **Versements vers l'Algérie** : la documentation Stripe consultée le 28/10/2026 mentionne l'Algérie (DZD) parmi les pays de destination des *Global Payouts / cross-border payouts*, dont une partie en préversion (docs.stripe.com/global-payouts/send-money/recipient-countries ; changelog 2025-12-15). La disponibilité réelle pour un compte plateforme français, pour des particuliers, et la compatibilité avec la réglementation des changes algérienne ne sont **pas confirmées**. Le versement reste bloqué côté serveur.
### 10. Fiscalité
- TVA sur la commission (lieu de la prestation, OSS), facturation de la commission, obligations DAC7 de la plateforme.

## Décision de lancement
Le projet ne doit pas être déclaré commercialement opérationnel tant que les points 1, 3, 6, 7, 8 et 9 ne sont pas validés par écrit.
