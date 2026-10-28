import { describe, expect, it } from "vitest";
import { assertTransition, BOOKING_STATUSES, canTransition, TRANSITIONS } from "@/lib/domain/booking-state";

describe("machine à états des réservations", () => {
  it("suit le parcours nominal complet", () => {
    const path = [
      ["PENDING", "ACCEPTED", "SYSTEM"],
      ["ACCEPTED", "AWAITING_PAYMENT", "SENDER"],
      ["AWAITING_PAYMENT", "PAID", "SYSTEM"],
      ["PAID", "READY_FOR_PICKUP", "SYSTEM"],
      ["READY_FOR_PICKUP", "PICKED_UP", "TRAVELER"],
      ["PICKED_UP", "IN_TRANSIT", "TRAVELER"],
      ["IN_TRANSIT", "OUT_FOR_DELIVERY", "TRAVELER"],
      ["OUT_FOR_DELIVERY", "DELIVERED", "TRAVELER"],
      ["DELIVERED", "COMPLETED", "SENDER"],
    ] as const;
    for (const [f, t, a] of path) expect(() => assertTransition(f, t, a)).not.toThrow();
  });
  it("interdit de livrer un colis non récupéré", () => {
    expect(canTransition("READY_FOR_PICKUP", "DELIVERED", "TRAVELER")).toBe(false);
    expect(canTransition("PAID", "OUT_FOR_DELIVERY", "TRAVELER")).toBe(false);
  });
  it("seul le prestataire (SYSTEM) peut marquer une réservation payée", () => {
    expect(canTransition("AWAITING_PAYMENT", "PAID", "SENDER")).toBe(false);
    expect(canTransition("AWAITING_PAYMENT", "PAID", "ADMIN")).toBe(false);
    expect(canTransition("AWAITING_PAYMENT", "PAID", "SYSTEM")).toBe(true);
  });
  it("seul le voyageur confirme la récupération (via OTP)", () => {
    expect(canTransition("READY_FOR_PICKUP", "PICKED_UP", "SENDER")).toBe(false);
  });
  it("aucune annulation après remise du colis", () => {
    for (const s of ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"] as const)
      for (const a of ["SENDER", "TRAVELER", "ADMIN"] as const) expect(canTransition(s, "CANCELLED", a)).toBe(false);
  });
  it("les états terminaux n'ont aucune sortie", () => {
    expect(Object.keys(TRANSITIONS.COMPLETED)).toHaveLength(0);
    expect(Object.keys(TRANSITIONS.REFUNDED)).toHaveLength(0);
  });
  it("une même transition ne peut pas être rejouée (pas de boucle sur soi)", () => {
    for (const s of BOOKING_STATUSES) expect(TRANSITIONS[s][s]).toBeUndefined();
  });
  it("seul un administrateur sort d'un litige", () => {
    expect(canTransition("DISPUTED", "COMPLETED", "SENDER")).toBe(false);
    expect(canTransition("DISPUTED", "COMPLETED", "ADMIN")).toBe(true);
  });
});
