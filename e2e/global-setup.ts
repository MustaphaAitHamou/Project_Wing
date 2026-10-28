import { execSync } from "node:child_process";
import { Client } from "pg";
import { hashPassword } from "better-auth/crypto";
import { E2E_DATABASE_URL } from "../playwright.config";

export const ADMIN = { email: "admin.e2e@tamurt.test", password: "AdminE2e-Pass2026" };

/**
 * Prépare la base E2E sans rien détruire : migrations (deploy), données de référence
 * idempotentes, administrateur créé s'il n'existe pas. Chaque test utilise des comptes uniques.
 */
export default async function globalSetup() {
  if (!E2E_DATABASE_URL.includes("tamurt_e2e")) throw new Error("Refus : base E2E attendue");
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL, SEED_DEMO: "false" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
  const c = new Client({ connectionString: E2E_DATABASE_URL });
  await c.connect();
  await c.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "firstName", "lastName", role, status, "termsAcceptedAt", "countryCode", phone, "createdAt", "updatedAt")
     VALUES ('e2e_admin', 'Admin E2E', $1, true, 'Admin', 'E2E', 'ADMIN', 'ACTIVE', now(), 'FR', '+33600000099', now(), now())
     ON CONFLICT (id) DO NOTHING`,
    [ADMIN.email],
  );
  await c.query(`INSERT INTO "user_profile" ("userId", "kycStatus", "updatedAt") VALUES ('e2e_admin', 'VERIFIED', now()) ON CONFLICT DO NOTHING`);
  await c.query(`INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ('acc_e2e_admin', 'e2e_admin', 'credential', 'e2e_admin', $1, now(), now()) ON CONFLICT DO NOTHING`, [await hashPassword(ADMIN.password)]);
  // L'administrateur repart sans 2FA à chaque exécution pour rejouer l'activation dans le scénario C.
  await c.query(`DELETE FROM "twoFactor" WHERE "userId" = 'e2e_admin'`);
  await c.query(`UPDATE "user" SET "twoFactorEnabled" = false WHERE id = 'e2e_admin'`);
  await c.query(`DELETE FROM "session" WHERE "userId" = 'e2e_admin'`);
  await c.end();
}
