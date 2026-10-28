import { randomUUID } from "node:crypto";
import { db } from "@/server/db/client";
import { seedReferenceData } from "@/prisma/reference-data";
import type { CurrentUser } from "@/server/auth/session";
import { drainJobs } from "@/server/jobs/runner";

export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("tamurt_test")) throw new Error("Refus : les tests d'intégration exigent la base tamurt_test");
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await seedReferenceData(db as never);
}

export async function makeUser(o: { kyc?: boolean; role?: "USER" | "ADMIN" | "MODERATOR"; country?: string; firstName?: string } = {}): Promise<CurrentUser> {
  const id = `u_${randomUUID().slice(0, 8)}`;
  const u = await db.user.create({
    data: {
      id, email: `${id}@test.local`, name: `${o.firstName ?? "Test"} User`, firstName: o.firstName ?? "Test", lastName: "User", emailVerified: true, role: o.role ?? "USER",
      termsAcceptedAt: new Date(), countryCode: o.country ?? "FR", phone: "+33611111111",
      profile: { create: { kycStatus: o.kyc ? "VERIFIED" : "UNVERIFIED" } },
    },
  });
  return { id: u.id, email: u.email, name: u.name, firstName: u.firstName, lastName: u.lastName, image: null, role: u.role, emailVerified: true, twoFactorEnabled: true, kycStatus: o.kyc ? "VERIFIED" : "UNVERIFIED", termsAccepted: true };
}

export const cityId = async (slug: string) => (await db.city.findUniqueOrThrow({ where: { slug } })).id;
export const categoryId = async (slug: string) => (await db.parcelCategory.findUniqueOrThrow({ where: { slug } })).id;

export function inDays(n: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export async function parcelInput(overrides: Record<string, unknown> = {}) {
  return {
    originCityId: await cityId("marseille-fr"), destCityId: await cityId("bejaia-dz"), desiredDate: inDays(10), dateFlexDays: 3,
    title: "Vêtements enfants", categoryId: await categoryId("vetements"), description: "Un sac de vêtements neufs pour enfants, étiquettes attachées.",
    weightGrams: 4000, lengthCm: 40, widthCm: 30, heightCm: 20, quantity: 1, declaredValue: 10000, isFragile: false, budget: 4000, currency: "EUR" as const,
    recipient: { name: "Yasmine B.", phone: "+213550123456", email: "destinataire@test.local", city: "Béjaïa" },
    ...overrides,
  };
}

export async function tripInput(overrides: Record<string, unknown> = {}) {
  return {
    originCityId: await cityId("marseille-fr"), destCityId: await cityId("bejaia-dz"), departureDate: inDays(11), transportMode: "PLANE" as const,
    capacityGrams: 10000, pricePerKg: 800, minPrice: 1500, currency: "EUR" as const, acceptsFragile: false, ...overrides,
  };
}

/** Code OTP extrait du dernier email envoyé (mode outbox). */
export async function lastCodeSentTo(email: string) {
  await drainJobs();
  const m = await db.emailLog.findFirst({ where: { to: email, template: { in: ["pickupCode", "deliveryCode"] } }, orderBy: { createdAt: "desc" } });
  const code = m?.text.match(/Code : (\d{6})/)?.[1];
  if (!code) throw new Error(`Aucun code envoyé à ${email}`);
  return code;
}
