/**
 * Machine à états des réservations. Toute transition passe par `assertTransition`
 * côté serveur ; l'acteur doit figurer parmi ceux autorisés pour l'arête.
 */
export const BOOKING_STATUSES = [
  "PENDING",
  "AWAITING_VERIFICATION",
  "ACCEPTED",
  "AWAITING_PAYMENT",
  "PAID",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
  "REFUNDED",
] as const;
export type BookingState = (typeof BOOKING_STATUSES)[number];

/** SYSTEM = webhook prestataire, job planifié ou service interne après vérification. */
export type Actor = "SENDER" | "TRAVELER" | "SYSTEM" | "ADMIN";

type Edges = Partial<Record<BookingState, readonly Actor[]>>;

export const TRANSITIONS: Record<BookingState, Edges> = {
  PENDING: { AWAITING_VERIFICATION: ["SYSTEM"], ACCEPTED: ["SYSTEM"], CANCELLED: ["SENDER", "TRAVELER", "ADMIN", "SYSTEM"] },
  AWAITING_VERIFICATION: { ACCEPTED: ["SYSTEM"], CANCELLED: ["SENDER", "TRAVELER", "ADMIN", "SYSTEM"] },
  ACCEPTED: { AWAITING_PAYMENT: ["SENDER", "SYSTEM"], AWAITING_VERIFICATION: ["SYSTEM"], CANCELLED: ["SENDER", "TRAVELER", "ADMIN", "SYSTEM"] },
  AWAITING_PAYMENT: { PAID: ["SYSTEM"], ACCEPTED: ["SYSTEM"], CANCELLED: ["SENDER", "TRAVELER", "ADMIN", "SYSTEM"] },
  PAID: { READY_FOR_PICKUP: ["SYSTEM"], CANCELLED: ["SENDER", "TRAVELER", "ADMIN"], DISPUTED: ["SENDER", "TRAVELER", "ADMIN"] },
  READY_FOR_PICKUP: { PICKED_UP: ["TRAVELER"], CANCELLED: ["SENDER", "TRAVELER", "ADMIN"], DISPUTED: ["SENDER", "TRAVELER", "ADMIN"] },
  PICKED_UP: { IN_TRANSIT: ["TRAVELER"], DISPUTED: ["SENDER", "TRAVELER", "ADMIN"] },
  IN_TRANSIT: { OUT_FOR_DELIVERY: ["TRAVELER"], DISPUTED: ["SENDER", "TRAVELER", "ADMIN"] },
  OUT_FOR_DELIVERY: { DELIVERED: ["TRAVELER"], IN_TRANSIT: ["TRAVELER"], DISPUTED: ["SENDER", "TRAVELER", "ADMIN"] },
  DELIVERED: { COMPLETED: ["SENDER", "SYSTEM", "ADMIN"], DISPUTED: ["SENDER", "TRAVELER", "ADMIN"] },
  COMPLETED: {},
  CANCELLED: { REFUNDED: ["SYSTEM"] },
  // Sortie de litige : décision administrateur uniquement (ou remboursement confirmé par le prestataire).
  DISPUTED: {
    PAID: ["ADMIN"],
    READY_FOR_PICKUP: ["ADMIN"],
    PICKED_UP: ["ADMIN"],
    IN_TRANSIT: ["ADMIN"],
    OUT_FOR_DELIVERY: ["ADMIN"],
    DELIVERED: ["ADMIN"],
    COMPLETED: ["ADMIN"],
    CANCELLED: ["ADMIN"],
    REFUNDED: ["SYSTEM"],
  },
  REFUNDED: {},
};

export class TransitionError extends Error {
  constructor(public from: BookingState, public to: BookingState, public actor: Actor) {
    super(`Transition interdite : ${from} → ${to} (${actor})`);
    this.name = "TransitionError";
  }
}

export function canTransition(from: BookingState, to: BookingState, actor: Actor): boolean {
  return TRANSITIONS[from][to]?.includes(actor) ?? false;
}

export function assertTransition(from: BookingState, to: BookingState, actor: Actor): void {
  if (!canTransition(from, to, actor)) throw new TransitionError(from, to, actor);
}

export const TERMINAL_STATES: readonly BookingState[] = ["COMPLETED", "REFUNDED"];
/** États où le paiement a été encaissé par le prestataire et n'est pas encore restitué. */
export const FUNDS_HELD_STATES: readonly BookingState[] = ["PAID", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "DISPUTED"];
/** États où la réservation occupe de la capacité sur le trajet. */
export const CAPACITY_HOLDING_STATES: readonly BookingState[] = BOOKING_STATUSES.filter((s) => s !== "CANCELLED" && s !== "REFUNDED");
/** Annulation autorisée uniquement avant la remise du colis au transporteur. */
export const CANCELLABLE_STATES: readonly BookingState[] = ["PENDING", "AWAITING_VERIFICATION", "ACCEPTED", "AWAITING_PAYMENT", "PAID", "READY_FOR_PICKUP"];
export const DISPUTABLE_STATES: readonly BookingState[] = ["PAID", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

export const BOOKING_STATUS_LABELS: Record<BookingState, string> = {
  PENDING: "En préparation",
  AWAITING_VERIFICATION: "Vérification d'identité requise",
  ACCEPTED: "Acceptée",
  AWAITING_PAYMENT: "En attente de paiement",
  PAID: "Payée",
  READY_FOR_PICKUP: "Prête pour la remise",
  PICKED_UP: "Colis remis au voyageur",
  IN_TRANSIT: "En transport",
  OUT_FOR_DELIVERY: "Arrivé, en cours de livraison",
  DELIVERED: "Livrée",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  DISPUTED: "Litige en cours",
  REFUNDED: "Remboursée",
};
