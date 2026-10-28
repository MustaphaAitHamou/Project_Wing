/**
 * Score de compatibilité colis ↔ trajet, purement algorithmique et explicable.
 * Les critères éliminatoires (villes, capacité, catégorie, fragilité) renvoient
 * `compatible: false` ; les autres pondèrent le score sur 100.
 */
export interface MatchParcel {
  originCityId: string;
  destCityId: string;
  originCountry: string;
  destCountry: string;
  desiredDate: Date;
  dateFlexDays: number;
  weightGrams: number;
  volumeCm3: number;
  isFragile: boolean;
  budget: number;
  currency: string;
  allowedModes: readonly string[];
}

export interface MatchTrip {
  originCityId: string;
  destCityId: string;
  originCountry: string;
  destCountry: string;
  departureDate: Date;
  transportMode: string;
  availableGrams: number;
  availableVolumeCm3: number | null;
  acceptsFragile: boolean;
  pricePerKg: number;
  minPrice: number;
  currency: string;
  travelerVerified: boolean;
  travelerRating: number | null;
}

export interface MatchReason {
  label: string;
  points: number;
  ok: boolean;
}

export interface MatchResult {
  compatible: boolean;
  score: number;
  estimatedPrice: number;
  reasons: MatchReason[];
}

const DAY = 86_400_000;
export const dayDiff = (a: Date, b: Date) => Math.round((Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()) - Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())) / DAY);

export function scoreMatch(p: MatchParcel, t: MatchTrip): MatchResult {
  const reasons: MatchReason[] = [];
  let compatible = true;
  let score = 0;
  const add = (label: string, points: number, ok: boolean, blocking = false) => {
    reasons.push({ label, points: ok ? points : 0, ok });
    if (ok) score += points;
    else if (blocking) compatible = false;
  };

  // Itinéraire (30 pts) — même ville exacte, ou même pays (suggestion proche, non bloquant).
  const sameOrigin = p.originCityId === t.originCityId;
  const sameDest = p.destCityId === t.destCityId;
  const sameCountries = p.originCountry === t.originCountry && p.destCountry === t.destCountry;
  if (sameOrigin && sameDest) add("Même itinéraire", 30, true);
  else if (sameCountries) {
    reasons.push({ label: sameOrigin || sameDest ? "Une ville diffère (même pays)" : "Villes différentes (mêmes pays)", points: sameOrigin || sameDest ? 15 : 5, ok: false });
    score += sameOrigin || sameDest ? 15 : 5;
  } else add("Pays de départ et d'arrivée compatibles", 30, false, true);

  // Dates (25 pts)
  const diff = Math.abs(dayDiff(t.departureDate, p.desiredDate));
  const flex = Math.max(0, p.dateFlexDays);
  if (diff <= flex) add(diff === 0 ? "Date identique" : `Date dans la flexibilité (±${flex} j)`, 25, true);
  else if (diff <= flex + 7) {
    const pts = Math.max(0, 25 - (diff - flex) * 3);
    reasons.push({ label: `Date décalée de ${diff} jour(s)`, points: pts, ok: false });
    score += pts;
  } else add(`Date trop éloignée (${diff} jours)`, 25, false, true);

  // Capacité (20 pts) — bloquant
  const volOk = t.availableVolumeCm3 == null || p.volumeCm3 <= t.availableVolumeCm3;
  add("Capacité disponible suffisante", 20, p.weightGrams <= t.availableGrams && volOk, true);

  // Mode de transport autorisé pour la catégorie — bloquant
  if (p.allowedModes.length > 0) add("Mode de transport autorisé pour cette catégorie", 0, p.allowedModes.includes(t.transportMode), true);

  // Fragile — bloquant si refusé
  if (p.isFragile) add("Accepte les colis fragiles", 5, t.acceptsFragile, true);
  else score += 5;

  // Prix (10 pts)
  const estimatedPrice = Math.max(Math.ceil((t.pricePerKg * p.weightGrams) / 1000), t.minPrice);
  if (t.currency !== p.currency) reasons.push({ label: "Devise différente", points: 0, ok: false });
  else add(estimatedPrice <= p.budget ? "Prix dans le budget" : "Prix au-dessus du budget", 10, estimatedPrice <= p.budget);

  // Confiance (10 pts)
  add("Voyageur vérifié", 7, t.travelerVerified);
  add("Voyageur bien noté", 3, (t.travelerRating ?? 0) >= 4);

  return { compatible, score: Math.min(100, Math.round(score)), estimatedPrice, reasons };
}
