import { z } from "zod";

/**
 * Variables d'environnement validées au démarrage. Toute variable absente ou
 * invalide fait échouer le serveur avec un message explicite plutôt qu'un
 * comportement silencieusement dégradé.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url(),
    APP_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().optional(),
    OTP_PEPPER: z.string().min(16),
    CRON_SECRET: z.string().min(12),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    EMAIL_PROVIDER: z.enum(["outbox", "resend"]).default("outbox"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Tamurt Sending <no-reply@localhost>"),

    SMS_PROVIDER: z.enum(["none", "twilio"]).default("none"),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM: z.string().optional(),

    PAYMENT_PROVIDER: z.enum(["local_sandbox", "stripe"]).default("local_sandbox"),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    KYC_PROVIDER: z.enum(["local_sandbox", "stripe_identity"]).default("local_sandbox"),
    STRIPE_IDENTITY_WEBHOOK_SECRET: z.string().optional(),

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./storage"),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),

    SENTRY_DSN: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const req = (cond: boolean, keys: string[], why: string) => {
      if (!cond) return;
      for (const k of keys)
        if (!(v as Record<string, unknown>)[k])
          ctx.addIssue({ code: "custom", path: [k], message: `${k} requis (${why})` });
    };
    req(v.EMAIL_PROVIDER === "resend", ["RESEND_API_KEY"], "EMAIL_PROVIDER=resend");
    req(v.SMS_PROVIDER === "twilio", ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"], "SMS_PROVIDER=twilio");
    req(v.PAYMENT_PROVIDER === "stripe", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"], "PAYMENT_PROVIDER=stripe");
    req(v.KYC_PROVIDER === "stripe_identity", ["STRIPE_SECRET_KEY", "STRIPE_IDENTITY_WEBHOOK_SECRET"], "KYC_PROVIDER=stripe_identity");
    req(v.STORAGE_DRIVER === "s3", ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"], "STORAGE_DRIVER=s3");
    // Les simulateurs locaux sont interdits en production. Vérifié au démarrage du serveur,
    // pas pendant `next build` : le build (CI, Vercel) ne reçoit pas forcément les secrets d'exécution.
    if (v.NODE_ENV === "production" && process.env.E2E_TEST_MODE !== "true" && process.env.NEXT_PHASE !== "phase-production-build") {
      if (v.PAYMENT_PROVIDER === "local_sandbox")
        ctx.addIssue({ code: "custom", path: ["PAYMENT_PROVIDER"], message: "Le simulateur de paiement local est interdit en production" });
      if (v.KYC_PROVIDER === "local_sandbox")
        ctx.addIssue({ code: "custom", path: ["KYC_PROVIDER"], message: "Le simulateur KYC local est interdit en production" });
      if (v.STORAGE_DRIVER === "local" && process.env.ALLOW_LOCAL_STORAGE_IN_PRODUCTION !== "true")
        ctx.addIssue({ code: "custom", path: ["STORAGE_DRIVER"], message: "Le stockage local est déconseillé en production" });
    }
  });

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${msg}`);
  }
  return parsed.data;
}

export const env = load();
export const isProd = env.NODE_ENV === "production";
/** Vrai lorsque des simulateurs (paiement/KYC) sont actifs : l'UI l'affiche clairement. */
export const usesLocalSandbox = env.PAYMENT_PROVIDER === "local_sandbox" || env.KYC_PROVIDER === "local_sandbox";
