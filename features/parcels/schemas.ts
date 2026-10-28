import { z } from "zod";
import { idSchema, moneyInput, dateInput, kgInput, SUPPORTED_CURRENCIES } from "@/features/shared/schemas";
import { phoneSchema } from "@/features/auth/schemas";

const dim = (label: string) => z.coerce.number({ message: `${label} : nombre attendu` }).int(`${label} : nombre entier`).min(1, `${label} : minimum 1 cm`).max(200, `${label} : maximum 200 cm`);

export const parcelRouteSchema = z.object({
  originCityId: idSchema,
  destCityId: idSchema,
  desiredDate: dateInput("Date souhaitée"),
  dateFlexDays: z.coerce.number().int().min(0).max(30).default(0),
});

export const parcelDetailsSchema = z.object({
  title: z.string().trim().min(5, "Titre : 5 caractères minimum").max(120),
  categoryId: idSchema,
  description: z.string().trim().min(20, "Décrivez précisément le contenu (20 caractères minimum)").max(2000),
  weightGrams: kgInput("Poids", 100),
  lengthCm: dim("Longueur"),
  widthCm: dim("Largeur"),
  heightCm: dim("Hauteur"),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  declaredValue: moneyInput("Valeur déclarée", { min: 0, max: 1_000_000 }),
  isFragile: z.boolean().default(false),
  specialConditions: z.string().trim().max(1000).transform((s) => s || undefined).optional(),
});

export const parcelRecipientSchema = z.object({
  name: z.string().trim().min(2, "Nom du destinataire requis").max(120),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().email("Email invalide").max(200).optional().or(z.literal("").transform(() => undefined)),
  city: z.string().trim().min(2, "Ville requise").max(120),
  instructions: z.string().trim().max(1000).transform((s) => s || undefined).optional(),
});

export const parcelBudgetSchema = z.object({
  budget: moneyInput("Budget", { min: 500, max: 500_000 }),
  currency: z.enum(SUPPORTED_CURRENCIES).default("EUR"),
});

export const parcelInputSchema = parcelRouteSchema
  .extend(parcelDetailsSchema.shape)
  .extend({ recipient: parcelRecipientSchema })
  .extend(parcelBudgetSchema.shape)
  .refine((d) => d.originCityId !== d.destCityId, { path: ["destCityId"], message: "La ville d'arrivée doit différer de la ville de départ" });

export const publishDeclarationSchema = z.object({
  honorDeclaration: z.literal(true, { message: "La déclaration sur l'honneur est obligatoire" }),
  rulesAccepted: z.literal(true, { message: "Vous devez accepter les règles de transport" }),
});

export const saveParcelSchema = z.object({
  id: idSchema.optional(),
  data: parcelInputSchema,
  publish: z.boolean(),
  declarations: publishDeclarationSchema.optional(),
});

export type ParcelInput = z.output<typeof parcelInputSchema>;
export type ParcelFormValues = z.input<typeof parcelInputSchema>;

export const PARCEL_STATUS_LABELS = {
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En attente de validation",
  PUBLISHED: "Publiée",
  RESERVED: "Réservée",
  IN_TRANSIT: "En cours de transport",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  EXPIRED: "Expirée",
  SUSPENDED: "Suspendue",
} as const;
