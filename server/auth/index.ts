import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { env, isProd } from "@/lib/env";
import { rateLimitsRelaxed } from "@/lib/test-mode";
import { db } from "@/server/db/client";
import { enqueue } from "@/server/jobs/queue";
import { signUpServerSchema } from "@/features/auth/schemas";

export const auth = betterAuth({
  appName: "Tamurt Sending",
  baseURL: env.BETTER_AUTH_URL ?? env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  // Sur une prévisualisation Vercel (protégée), accepte aussi les adresses du déploiement et de la branche.
  trustedOrigins: [env.APP_URL, ...(process.env.VERCEL_ENV === "preview" ? [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].filter(Boolean).map((h) => `https://${h}`) : [])],
  user: {
    // Seuls ces champs sont acceptés à l'inscription. `role` et `status` n'en font
    // jamais partie : ils ne peuvent pas être définis par l'utilisateur.
    additionalFields: {
      firstName: { type: "string", required: true, input: true },
      lastName: { type: "string", required: true, input: true },
      phone: { type: "string", required: false, input: true },
      countryCode: { type: "string", required: false, input: true },
      role: { type: "string", required: false, input: false, defaultValue: "USER" },
      status: { type: "string", required: false, input: false, defaultValue: "ACTIVE" },
      termsAcceptedAt: { type: "date", required: false, input: false },
    },
    changeEmail: { enabled: false },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      await enqueue(db, "email.send", { to: user.email, template: "resetPassword", data: { name: user.name, url } });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 24 * 3600,
    sendVerificationEmail: async ({ user, url }) => {
      await enqueue(db, "email.send", { to: user.email, template: "verifyEmail", data: { name: user.name, url } });
    },
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : undefined,
  session: {
    expiresIn: 30 * 24 * 3600,
    updateAge: 24 * 3600,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    // Désactivable uniquement en mode test (tests automatisés), jamais en production réelle.
    enabled: !rateLimitsRelaxed(),
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 3600, max: 10 },
      "/request-password-reset": { window: 3600, max: 5 },
      "/send-verification-email": { window: 3600, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: isProd,
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: isProd },
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          // Inscription email : validation serveur complète (y compris CGU acceptées).
          if (ctx?.path === "/sign-up/email") {
            const parsed = signUpServerSchema.safeParse(ctx.body);
            if (!parsed.success) throw new APIError("BAD_REQUEST", { message: parsed.error.issues[0]?.message ?? "Données invalides" });
            const d = parsed.data;
            return { data: { ...user, name: `${d.firstName} ${d.lastName}`.trim(), firstName: d.firstName, lastName: d.lastName, phone: d.phone, countryCode: d.countryCode, termsAcceptedAt: new Date(), role: "USER", status: "ACTIVE" } };
          }
          // Inscription Google : prénom/nom issus du profil, CGU à accepter au premier passage.
          const [firstName = "", ...rest] = (user.name ?? "").split(" ");
          return { data: { ...user, firstName, lastName: rest.join(" "), role: "USER", status: "ACTIVE" } };
        },
        after: async (user) => {
          await db.userProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const u = await db.user.findUnique({ where: { id: session.userId }, select: { status: true } });
          if (!u || u.status === "SUSPENDED") throw new APIError("FORBIDDEN", { message: "Ce compte est suspendu. Contactez le support." });
        },
      },
    },
  },
  plugins: [twoFactor({ issuer: "Tamurt Sending" }), nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
