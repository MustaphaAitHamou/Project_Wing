import { afterEach, describe, expect, it, vi } from "vitest";

const base = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  APP_URL: "https://tamurt.example",
  BETTER_AUTH_SECRET: "x".repeat(32),
  OTP_PEPPER: "y".repeat(16),
  CRON_SECRET: "z".repeat(12),
  PAYMENT_PROVIDER: "local_sandbox",
  KYC_PROVIDER: "local_sandbox",
  STORAGE_DRIVER: "local",
  E2E_TEST_MODE: "",
  NEXT_PHASE: "",
};

async function loadEnv(overrides: Record<string, string>) {
  for (const [k, v] of Object.entries({ ...base, ...overrides })) vi.stubEnv(k, v);
  vi.resetModules();
  return import("@/lib/env");
}

describe("validation de la configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuse les simulateurs au démarrage en production", async () => {
    await expect(loadEnv({ NODE_ENV: "production" })).rejects.toThrow(/simulateur de paiement local est interdit/);
  });
  it("laisse passer le build de production (CI, Vercel) sans secrets d'exécution", async () => {
    const m = await loadEnv({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" });
    expect(m.isProd).toBe(true);
  });
  it("autorise les simulateurs en développement", async () => {
    const m = await loadEnv({ NODE_ENV: "development" });
    expect(m.usesLocalSandbox).toBe(true);
  });
  it("exige les clés Stripe quand Stripe est choisi", async () => {
    await expect(loadEnv({ NODE_ENV: "development", PAYMENT_PROVIDER: "stripe" })).rejects.toThrow(/STRIPE_SECRET_KEY requis/);
  });
});
