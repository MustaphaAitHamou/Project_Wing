import { describe, expect, it } from "vitest";
import { generateOtp, generateQrToken, hashSecret, safeEqualHex } from "@/lib/domain/otp";
import { normalizeSearch } from "@/lib/domain/text";
import { bookingReference } from "@/lib/domain/reference";

describe("OTP", () => {
  it("génère 6 chiffres", () => {
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
  it("hash lié à la réservation et à l'étape", () => {
    const a = hashSecret("pepper-123456789", "b1", "PICKUP", "123456");
    expect(a).not.toContain("123456");
    expect(safeEqualHex(a, hashSecret("pepper-123456789", "b1", "PICKUP", "123456"))).toBe(true);
    expect(safeEqualHex(a, hashSecret("pepper-123456789", "b2", "PICKUP", "123456"))).toBe(false);
    expect(safeEqualHex(a, hashSecret("pepper-123456789", "b1", "DELIVERY", "123456"))).toBe(false);
  });
  it("jetons QR uniques", () => {
    const s = new Set(Array.from({ length: 100 }, generateQrToken));
    expect(s.size).toBe(100);
  });
});

describe("normalisation", () => {
  it("rend la recherche tolérante aux accents", () => {
    expect(normalizeSearch("Béjaïa")).toBe("bejaia");
    expect(normalizeSearch("  Tizi-Ouzou ")).toBe("tizi ouzou");
    expect(normalizeSearch("L'Arbaâ Nath Irathen")).toBe("l arbaa nath irathen");
  });
  it("références de réservation lisibles", () => {
    expect(bookingReference()).toMatch(/^TS-[A-Z2-9]{8}$/);
  });
});
