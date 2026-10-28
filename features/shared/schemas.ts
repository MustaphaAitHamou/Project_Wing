import { z } from "zod";
import { parseAmountToMinor } from "@/lib/domain/money";

export const idSchema = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "Identifiant invalide");

/** Montant saisi en euros ("12,50") → centimes. */
export const moneyInput = (label: string, { min = 0, max = 10_000_000 } = {}) =>
  z
    .union([z.string(), z.number()])
    .transform((v, ctx) => {
      const minor = typeof v === "number" ? (Number.isFinite(v) ? Math.round(v * 100) : null) : parseAmountToMinor(v);
      if (minor == null) {
        ctx.addIssue({ code: "custom", message: `${label} : montant invalide` });
        return z.NEVER;
      }
      return minor;
    })
    .pipe(z.number().int().min(min, `${label} : minimum ${min / 100} €`).max(max, `${label} : maximum ${max / 100} €`));

/** Date calendaire YYYY-MM-DD, interprétée en UTC (colonnes @db.Date). */
export const dateInput = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} : date invalide`)
    .transform((s) => new Date(`${s}T00:00:00.000Z`))
    .refine((d) => !Number.isNaN(d.getTime()), `${label} : date invalide`);

export const todayUtc = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

export const SUPPORTED_CURRENCIES = ["EUR"] as const;
export const TRANSPORT_MODES = ["PLANE", "CAR", "FERRY", "TRAIN", "BUS", "OTHER"] as const;
export const TRANSPORT_MODE_LABELS: Record<(typeof TRANSPORT_MODES)[number], string> = { PLANE: "Avion", CAR: "Voiture", FERRY: "Ferry", TRAIN: "Train", BUS: "Bus", OTHER: "Autre" };

export const kgInput = (label: string, maxKg = 100) =>
  z.coerce.number({ message: `${label} : nombre attendu` }).min(0.1, `${label} : minimum 0,1 kg`).max(maxKg, `${label} : maximum ${maxKg} kg`).transform((kg) => Math.round(kg * 1000));
