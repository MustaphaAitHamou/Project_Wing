import { describe, expect, it } from "vitest";
import { computeCommission, computeFees, estimateTripPrice, formatMoney, parseAmountToMinor } from "@/lib/domain/money";

describe("commission", () => {
  it("applique 10 % sur 50 € (exemple du cahier des charges)", () => {
    const f = computeFees(5000, 1000);
    expect(f).toMatchObject({ transportPrice: 5000, platformFee: 500, travelerNet: 4500, totalCharged: 5000 });
  });
  it("modèle surcharge expéditeur", () => {
    const f = computeFees(5000, 1000, "SENDER_SURCHARGE");
    expect(f).toMatchObject({ platformFee: 500, travelerNet: 5000, totalCharged: 5500 });
  });
  it("arrondit au centime le plus proche sans flottants", () => {
    expect(computeCommission(1005, 1000)).toBe(101); // 100,5 → 101
    expect(computeCommission(1004, 1000)).toBe(100);
    expect(computeCommission(333, 1250)).toBe(42); // 41,625 → 42
  });
  it("la somme commission + net égale toujours le prix", () => {
    for (let p = 1; p < 20000; p += 37) {
      const f = computeFees(p, 1000);
      expect(f.platformFee + f.travelerNet).toBe(p);
    }
  });
  it("refuse les montants et taux invalides", () => {
    expect(() => computeFees(0, 1000)).toThrow();
    expect(() => computeFees(10.5, 1000)).toThrow();
    expect(() => computeFees(-1, 1000)).toThrow();
    expect(() => computeCommission(100, 6000)).toThrow();
    expect(() => computeCommission(100, -1)).toThrow();
  });
});

describe("saisie et format des montants", () => {
  it("parse les saisies françaises", () => {
    expect(parseAmountToMinor("12,50")).toBe(1250);
    expect(parseAmountToMinor("12.5")).toBe(1250);
    expect(parseAmountToMinor("40")).toBe(4000);
    expect(parseAmountToMinor("1 200")).toBe(120000);
    expect(parseAmountToMinor("12,505")).toBeNull();
    expect(parseAmountToMinor("abc")).toBeNull();
    expect(parseAmountToMinor("-3")).toBeNull();
  });
  it("formate en euros", () => {
    expect(formatMoney(4500, "EUR").replace(/\s/g, " ")).toBe("45 €");
    expect(formatMoney(1250, "EUR").replace(/\s/g, " ")).toBe("12,50 €");
  });
  it("estime le prix d'un trajet au kg avec minimum", () => {
    expect(estimateTripPrice(800, 1500, 4000)).toBe(3200);
    expect(estimateTripPrice(800, 1500, 1000)).toBe(1500);
    expect(estimateTripPrice(999, 0, 1001)).toBe(1000);
  });
});
