import { z } from "zod";
import { idSchema, moneyInput, dateInput, kgInput, SUPPORTED_CURRENCIES, TRANSPORT_MODES } from "@/features/shared/schemas";

export const tripInputSchema = z
  .object({
    originCityId: idSchema,
    destCityId: idSchema,
    departureDate: dateInput("Date de départ"),
    arrivalDate: z.union([dateInput("Date d'arrivée"), z.literal("").transform(() => undefined)]).optional(),
    transportMode: z.enum(TRANSPORT_MODES),
    capacityGrams: kgInput("Poids disponible", 100),
    capacityVolumeL: z.union([z.coerce.number().min(1).max(2000), z.literal("").transform(() => undefined)]).optional(),
    pricePerKg: moneyInput("Prix par kg", { min: 100, max: 100_00 }),
    minPrice: moneyInput("Prix minimum", { min: 0, max: 500_00 }).default(0),
    currency: z.enum(SUPPORTED_CURRENCIES).default("EUR"),
    acceptsFragile: z.boolean().default(false),
    description: z.string().trim().max(2000).optional().transform((s) => s || undefined),
    conditions: z.string().trim().max(2000).optional().transform((s) => s || undefined),
  })
  .refine((d) => d.originCityId !== d.destCityId, { path: ["destCityId"], message: "La ville d'arrivée doit différer de la ville de départ" })
  .refine((d) => !d.arrivalDate || d.arrivalDate >= d.departureDate, { path: ["arrivalDate"], message: "L'arrivée doit suivre le départ" });

export const saveTripSchema = z.object({ id: idSchema.optional(), data: tripInputSchema });

export type TripInput = z.output<typeof tripInputSchema>;
export type TripFormValues = z.input<typeof tripInputSchema>;

export const TRIP_STATUS_LABELS = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  FULL: "Complet",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
  SUSPENDED: "Suspendu",
} as const;
