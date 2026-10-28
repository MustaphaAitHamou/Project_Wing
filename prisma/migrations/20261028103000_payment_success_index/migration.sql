-- Un seul paiement encaissé par réservation. Un paiement en double remboursé
-- automatiquement n'a jamais de succeededAt et n'est donc pas concerné.
DROP INDEX IF EXISTS "payment_one_success_per_booking";
CREATE UNIQUE INDEX "payment_one_success_per_booking" ON "payment" ("bookingId") WHERE "succeededAt" IS NOT NULL;
