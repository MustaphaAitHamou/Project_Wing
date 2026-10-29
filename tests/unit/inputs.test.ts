import { describe, expect, it } from "vitest";
import { sanitizeNumeric } from "@/lib/numeric";
import { safeNext } from "@/lib/safe-next";
import { kgInput, moneyInput } from "@/features/shared/schemas";

describe("saisie numérique (prix, poids)", () => {
  it("supprime les lettres et symboles", () => {
    expect(sanitizeNumeric("ngbvv")).toBe("");
    expect(sanitizeNumeric("12abc")).toBe("12");
    expect(sanitizeNumeric("1e5")).toBe("15");
    expect(sanitizeNumeric("-3")).toBe("3");
    expect(sanitizeNumeric("4 kg")).toBe("4");
  });
  it("garde un seul séparateur décimal, virgule ou point", () => {
    expect(sanitizeNumeric("12,50")).toBe("12,50");
    expect(sanitizeNumeric("12.50")).toBe("12.50");
    expect(sanitizeNumeric("1,2,3")).toBe("1,23");
    expect(sanitizeNumeric(",5")).toBe("0,5");
  });
  it("limite le nombre de décimales", () => {
    expect(sanitizeNumeric("8,999")).toBe("8,99");
    expect(sanitizeNumeric("4,55", 1)).toBe("4,5");
    expect(sanitizeNumeric("40,5", 0)).toBe("405");
  });
});

describe("schémas de montants et de poids", () => {
  const money = moneyInput("Budget", { min: 100 });
  const kg = kgInput("Poids", 30);
  it("convertit les euros en centimes", () => {
    expect(money.parse("12,50")).toBe(1250);
    expect(money.parse("8")).toBe(800);
  });
  it("refuse un montant non numérique ou trop bas", () => {
    expect(money.safeParse("ngbvv").success).toBe(false);
    expect(money.safeParse("0,50").success).toBe(false);
  });
  it("accepte la virgule française pour les kilos", () => {
    expect(kg.parse("4,5")).toBe(4500);
    expect(kg.parse("10")).toBe(10000);
    expect(kg.parse(2)).toBe(2000);
  });
  it("refuse un poids invalide ou hors limites", () => {
    expect(kg.safeParse("abc").success).toBe(false);
    expect(kg.safeParse("").success).toBe(false);
    expect(kg.safeParse("31").success).toBe(false);
  });
});

describe("redirections internes (safeNext)", () => {
  it("accepte un chemin interne", () => {
    expect(safeNext("/tableau-de-bord/reservations/abc")).toBe("/tableau-de-bord/reservations/abc");
  });
  it("refuse les redirections externes", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined])
      expect(safeNext(bad, "/x")).toBe("/x");
  });
});
