# Paiements, commission et versements

## Modèle retenu (par défaut)
**Charges et transferts séparés (Stripe Connect)** :
1. L'expéditeur paie via Stripe Checkout sur le compte de la plateforme (`payment`).
2. Le statut PAID n'est posé qu'à réception du webhook `checkout.session.completed` signé ; le montant et la devise sont comparés au montant attendu.
3. À la clôture (COMPLETED), un `payout` est créé ; le job `payout.release` émet un Transfer vers le compte Express du voyageur (`source_transaction` = charge d'origine, clé d'idempotence).
4. Blocages (statut BLOCKED + motif) : litige ouvert, compte de versement absent ou inactif, pays sans versements, réservation non clôturée.

## Commission (configurable dans /admin/configuration)
- `commission.rateBps` : 1000 = 10 %. Arrondi au centime le plus proche en arithmétique entière.
- `commission.feeModel` :
  - `TRAVELER_DEDUCTION` (défaut) : l'expéditeur paie le prix convenu ; la commission est retenue sur le voyageur. 50 € → expéditeur 50 €, commission 5 €, voyageur 45 €.
  - `SENDER_SURCHARGE` : la commission s'ajoute au prix payé par l'expéditeur. 50 € → expéditeur 55 €, voyageur 50 €.
- Les montants sont figés dans la réservation à l'acceptation ; un changement de taux ne s'applique qu'aux nouvelles réservations.
- Frais Stripe : supportés par la plateforme sur sa commission dans le modèle actuel (décision produit à confirmer, voir DECISIONS.md).

## Remboursements
Toujours exécutés par le prestataire (`stripe.refunds.create` avec clé d'idempotence). Le statut local ne change qu'à la réponse ou au webhook `refund.updated`. Cas : annulation avant remise (intégral, automatique), décision de litige (total ou partiel), paiement en double (intégral, automatique).

## Compatibilité pays (à vérifier sur votre compte Stripe)
| Besoin | État |
|---|---|
| Encaissement carte d'expéditeurs en France | Pris en charge par Stripe pour une plateforme française (à confirmer à l'activation) |
| Versements aux voyageurs résidant en France (compte Express FR) | Pris en charge par Connect pour une plateforme FR (à confirmer) |
| Expéditeurs résidant en Algérie payant par carte | Dépend de l'émetteur de la carte ; non garanti |
| Versements aux voyageurs résidant en Algérie | **Non activé.** Documentation Stripe : Algérie citée pour les cross-border payouts (en partie en préversion) ; éligibilité d'une plateforme FR et réglementation des changes non confirmées. Bloqué côté serveur (`country.payoutsEnabled = false`). |

## Simulateur local
`PAYMENT_PROVIDER=local_sandbox` : page /dev/paiement/[session] qui produit les mêmes événements normalisés que Stripe et passe par `handleProviderEvent` (idempotence, contrôle du montant, transitions). Refusé en production.

## Activation Stripe (mode test)
Voir `API_CONFIGURATION.md`.
