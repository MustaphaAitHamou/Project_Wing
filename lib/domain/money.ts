/**
 * Calculs monétaires. Tous les montants sont des entiers en unités mineures
 * (centimes). Aucune arithmétique flottante n'est appliquée sur un montant.
 */

export type FeeModel = "TRAVELER_DEDUCTION" | "SENDER_SURCHARGE";

export interface FeeBreakdown {
  /** Prix du transport convenu entre les parties. */
  transportPrice: number;
  /** Commission Tamurt Sending. */
  platformFee: number;
  /** Montant net estimé pour le transporteur (avant éventuels frais du prestataire de paiement). */
  travelerNet: number;
  /** Montant total débité à l'expéditeur. */
  totalCharged: number;
  commissionRateBps: number;
  feeModel: FeeModel;
}

export const MAX_COMMISSION_BPS = 5000; // 50 % : garde-fou contre une erreur de configuration

function assertMinorUnits(n: number, label: string) {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`${label} doit être un entier positif en centimes`);
}

/** Commission arrondie au centime le plus proche (demi vers le haut), en arithmétique entière. */
export function computeCommission(amount: number, rateBps: number): number {
  assertMinorUnits(amount, "amount");
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > MAX_COMMISSION_BPS)
    throw new RangeError("Taux de commission invalide");
  return Math.floor((amount * rateBps + 5000) / 10000);
}

/**
 * - TRAVELER_DEDUCTION (modèle par défaut) : l'expéditeur paie le prix du transport,
 *   la commission est retenue sur la rémunération du transporteur.
 *   Ex. 50 € → commission 5 €, transporteur 45 €, expéditeur paie 50 €.
 * - SENDER_SURCHARGE : la commission est ajoutée au prix payé par l'expéditeur.
 *   Ex. 50 € → expéditeur paie 55 €, transporteur 50 €.
 */
export function computeFees(transportPrice: number, rateBps: number, feeModel: FeeModel = "TRAVELER_DEDUCTION"): FeeBreakdown {
  assertMinorUnits(transportPrice, "transportPrice");
  if (transportPrice === 0) throw new RangeError("Le prix du transport doit être positif");
  const platformFee = computeCommission(transportPrice, rateBps);
  if (feeModel === "SENDER_SURCHARGE") {
    return { transportPrice, platformFee, travelerNet: transportPrice, totalCharged: transportPrice + platformFee, commissionRateBps: rateBps, feeModel };
  }
  return { transportPrice, platformFee, travelerNet: transportPrice - platformFee, totalCharged: transportPrice, commissionRateBps: rateBps, feeModel };
}

/** Conversion d'une saisie utilisateur ("12,50" / "12.5") en centimes, sans flottants. */
export function parseAmountToMinor(input: string): number | null {
  const s = input.trim().replace(/\s/g, "").replace(",", ".");
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const units = Number(m[1]);
  const cents = Number((m[2] ?? "").padEnd(2, "0"));
  return units * 100 + cents;
}

export function formatMoney(minor: number, currency: string, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: minor % 100 === 0 ? 0 : 2 }).format(minor / 100);
}

/** Prix suggéré pour un trajet : prix au kg × poids, avec minimum. Arrondi au centime supérieur. */
export function estimateTripPrice(pricePerKg: number, minPrice: number, weightGrams: number): number {
  assertMinorUnits(pricePerKg, "pricePerKg");
  assertMinorUnits(weightGrams, "weightGrams");
  const raw = Math.ceil((pricePerKg * weightGrams) / 1000);
  return Math.max(raw, minPrice);
}
