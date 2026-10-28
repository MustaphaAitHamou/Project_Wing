import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/tamurt_e2e?schema=public";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // Résultats hors du projet : écrits dans le dossier surveillé, ils déclencheraient des recompilations du serveur de dev.
  outputDir: path.join(os.tmpdir(), "tamurt-e2e", "results"),
  reporter: [["list"], ["html", { open: "never", outputFolder: path.join(os.tmpdir(), "tamurt-e2e", "report") }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {} } },
  ],
  webServer: {
    // Build de production : pas de recompilation ni de rechargement à chaud pendant les tests.
    command: `next build && next start -p ${PORT}`,
    url: `http://localhost:${PORT}/robots.txt`,
    reuseExistingServer: false,
    timeout: 600_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      APP_URL: `http://localhost:${PORT}`,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      NEXT_DIST_DIR: ".next-e2e",
      E2E_TEST_MODE: "true",
      ALLOW_LOCAL_STORAGE_IN_PRODUCTION: "true",
      RATE_LIMIT_RELAXED: "true",
      ADMIN_REQUIRE_2FA: "true",
      EMAIL_PROVIDER: "outbox",
      PAYMENT_PROVIDER: "local_sandbox",
      KYC_PROVIDER: "local_sandbox",
      STORAGE_LOCAL_DIR: path.join(os.tmpdir(), "tamurt-e2e", "storage"),
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
