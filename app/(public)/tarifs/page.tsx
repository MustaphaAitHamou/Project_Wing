import type { Metadata } from "next";
import { ProsePage } from "@/components/marketplace/prose";
import { getSetting } from "@/server/settings";
import { computeFees, formatMoney } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Tarifs", description: "Prix fixé entre expéditeur et voyageur, commission transparente.", alternates: { canonical: "/tarifs" } };

export default async function PricingPage() {
  const [rate, model] = await Promise.all([getSetting("commission.rateBps"), getSetting("commission.feeModel")]);
  const ex = computeFees(5000, rate, model);
  return (
    <ProsePage title="Tarifs" intro="L'inscription et la publication d'annonces sont gratuites. Tamurt Sending se rémunère par une commission sur chaque transport effectué.">
      <h2>Le prix du transport</h2>
      <p>Il est librement fixé entre l&apos;expéditeur et le voyageur : le voyageur indique un tarif au kilo, l&apos;expéditeur un budget, et la proposition acceptée fixe le prix définitif. Il ne peut plus changer ensuite.</p>
      <h2>La commission de la plateforme</h2>
      <p>Commission actuelle : <strong>{rate / 100} %</strong> du prix du transport, {model === "TRAVELER_DEDUCTION" ? "déduite de la rémunération du voyageur. L'expéditeur paie le prix affiché, sans frais supplémentaires." : "ajoutée au prix payé par l'expéditeur. Le voyageur reçoit le prix convenu."}</p>
      <div className="overflow-x-auto rounded-xl border bg-card p-5">
        <p className="mb-3 font-semibold">Exemple pour un transport à {formatMoney(ex.transportPrice, "EUR")}</p>
        <dl className="grid gap-1.5 tabular">
          <div className="flex justify-between"><dt>L&apos;expéditeur paie</dt><dd className="font-semibold">{formatMoney(ex.totalCharged, "EUR")}</dd></div>
          <div className="flex justify-between"><dt>Commission Tamurt Sending</dt><dd>{formatMoney(ex.platformFee, "EUR")}</dd></div>
          <div className="flex justify-between"><dt>Le voyageur reçoit (net estimé)</dt><dd className="font-semibold">{formatMoney(ex.travelerNet, "EUR")}</dd></div>
        </dl>
      </div>
      <h2>Frais du prestataire de paiement</h2>
      <p>Les frais de traitement du paiement par carte sont pris en charge par la plateforme sur sa commission. Des frais de versement ou de change peuvent s&apos;appliquer selon le pays du compte bancaire du voyageur ; ils sont indiqués avant la configuration du compte.</p>
      <h2>Annulation et remboursement</h2>
      <p>Avant la remise du colis, une réservation payée peut être annulée : le remboursement intégral est demandé au prestataire de paiement. Après la remise, un litige permet à notre équipe de décider d&apos;un remboursement total ou partiel.</p>
    </ProsePage>
  );
}
