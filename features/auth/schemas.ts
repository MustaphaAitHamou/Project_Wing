import { z } from "zod";

export const COUNTRY_OPTIONS = [
  { code: "FR", label: "France", prefix: "+33" },
  { code: "DZ", label: "Algérie", prefix: "+213" },
  { code: "BE", label: "Belgique", prefix: "+32" },
  { code: "ES", label: "Espagne", prefix: "+34" },
  { code: "DE", label: "Allemagne", prefix: "+49" },
  { code: "CH", label: "Suisse", prefix: "+41" },
  { code: "IT", label: "Italie", prefix: "+39" },
  { code: "MA", label: "Maroc", prefix: "+212" },
  { code: "TN", label: "Tunisie", prefix: "+216" },
  { code: "CA", label: "Canada", prefix: "+1" },
] as const;

const countryCodes = COUNTRY_OPTIONS.map((c) => c.code) as [string, ...string[]];

export const passwordSchema = z
  .string()
  .min(10, "10 caractères minimum")
  .max(128, "128 caractères maximum")
  .regex(/[a-z]/, "Au moins une minuscule")
  .regex(/[A-Z]/, "Au moins une majuscule")
  .regex(/\d/, "Au moins un chiffre");

export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s.()-]/g, ""))
  .pipe(z.string().regex(/^\+?[1-9]\d{7,14}$/, "Numéro de téléphone invalide (format international recommandé, ex. +33612345678)"));

const nameSchema = (label: string) => z.string().trim().min(1, `${label} requis`).max(60, `${label} trop long`).regex(/^[\p{L}\p{M}' -]+$/u, `${label} : lettres uniquement`);

export const signUpFormSchema = z
  .object({
    firstName: nameSchema("Prénom"),
    lastName: nameSchema("Nom"),
    email: z.string().trim().toLowerCase().email("Adresse email invalide").max(200),
    phone: phoneSchema,
    countryCode: z.enum(countryCodes, { message: "Choisissez un pays" }),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: "Vous devez accepter les conditions générales" }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Les mots de passe ne correspondent pas" });

/** Champs reçus par Better Auth à l'inscription (re-validés côté serveur). */
export const signUpServerSchema = z.object({
  firstName: nameSchema("Prénom"),
  lastName: nameSchema("Nom"),
  email: z.string().email(),
  phone: phoneSchema,
  countryCode: z.enum(countryCodes),
  password: passwordSchema,
  acceptTerms: z.literal(true, { message: "Vous devez accepter les conditions générales" }),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const forgotPasswordSchema = z.object({ email: z.string().trim().toLowerCase().email("Adresse email invalide") });
export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Les mots de passe ne correspondent pas" });
