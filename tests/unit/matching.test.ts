import { describe, expect, it } from "vitest";
import { scoreMatch, type MatchParcel, type MatchTrip } from "@/lib/domain/matching";

const parcel: MatchParcel = {
  originCityId: "mrs", destCityId: "bej", originCountry: "FR", destCountry: "DZ",
  desiredDate: new Date("2026-12-15"), dateFlexDays: 3, weightGrams: 4000, volumeCm3: 30 * 20 * 15,
  isFragile: false, budget: 4000, currency: "EUR", allowedModes: [],
};
const trip: MatchTrip = {
  originCityId: "mrs", destCityId: "bej", originCountry: "FR", destCountry: "DZ",
  departureDate: new Date("2026-12-15"), transportMode: "PLANE", availableGrams: 10000, availableVolumeCm3: null,
  acceptsFragile: false, pricePerKg: 800, minPrice: 0, currency: "EUR", travelerVerified: true, travelerRating: 4.8,
};

describe("matching colis ↔ trajet", () => {
  it("donne un score maximal pour une correspondance parfaite", () => {
    const r = scoreMatch(parcel, trip);
    expect(r.compatible).toBe(true);
    expect(r.score).toBe(100);
    expect(r.estimatedPrice).toBe(3200);
  });
  it("rejette si la capacité est insuffisante", () => {
    expect(scoreMatch(parcel, { ...trip, availableGrams: 3000 }).compatible).toBe(false);
    expect(scoreMatch(parcel, { ...trip, availableVolumeCm3: 1000 }).compatible).toBe(false);
  });
  it("rejette si les pays diffèrent", () => {
    expect(scoreMatch(parcel, { ...trip, destCountry: "MA", destCityId: "cas" }).compatible).toBe(false);
  });
  it("tolère la flexibilité de date puis pénalise", () => {
    expect(scoreMatch(parcel, { ...trip, departureDate: new Date("2026-12-18") }).score).toBe(100);
    const late = scoreMatch(parcel, { ...trip, departureDate: new Date("2026-12-20") });
    expect(late.compatible).toBe(true);
    expect(late.score).toBeLessThan(100);
    expect(scoreMatch(parcel, { ...trip, departureDate: new Date("2027-01-20") }).compatible).toBe(false);
  });
  it("rejette un colis fragile si le voyageur ne l'accepte pas", () => {
    expect(scoreMatch({ ...parcel, isFragile: true }, trip).compatible).toBe(false);
    expect(scoreMatch({ ...parcel, isFragile: true }, { ...trip, acceptsFragile: true }).compatible).toBe(true);
  });
  it("respecte les modes de transport autorisés par catégorie", () => {
    expect(scoreMatch({ ...parcel, allowedModes: ["CAR", "FERRY"] }, trip).compatible).toBe(false);
  });
  it("propose une ville proche du même pays comme suggestion", () => {
    const r = scoreMatch(parcel, { ...trip, destCityId: "tizi" });
    expect(r.compatible).toBe(true);
    expect(r.score).toBeLessThan(100);
  });
  it("explique chaque critère", () => {
    const r = scoreMatch(parcel, { ...trip, travelerVerified: false });
    expect(r.reasons.find((x) => x.label === "Voyageur vérifié")?.ok).toBe(false);
  });
});
