/**
 * Seed de développement.
 * - Données de référence : toujours (idempotent).
 * - Comptes et annonces de démonstration : uniquement hors production, avec SEED_DEMO=true.
 *   Les annonces de démonstration sont marquées `isDemo` et signalées comme telles dans l'interface.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../generated/prisma/client";
import { seedReferenceData } from "./reference-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function createUser(o: { id: string; email: string; firstName: string; lastName: string; role?: "USER" | "ADMIN" | "MODERATOR"; kyc?: boolean; password: string; country: string }) {
  const existing = await db.user.findUnique({ where: { email: o.email } });
  if (existing) return existing;
  const user = await db.user.create({
    data: {
      id: o.id, email: o.email, name: `${o.firstName} ${o.lastName}`, firstName: o.firstName, lastName: o.lastName, emailVerified: true, role: o.role ?? "USER",
      countryCode: o.country, phone: o.country === "FR" ? "+33600000000" : "+213550000000", termsAcceptedAt: new Date(),
      profile: { create: { kycStatus: o.kyc ? "VERIFIED" : "UNVERIFIED", city: o.country === "FR" ? "Marseille" : "Béjaïa" } },
    },
  });
  await db.account.create({ data: { id: `acc_${o.id}`, accountId: o.id, providerId: "credential", userId: o.id, password: await hashPassword(o.password) } });
  return user;
}

async function main() {
  await seedReferenceData(db);
  console.log("✓ Données de référence");

  if (process.env.NODE_ENV === "production" || process.env.SEED_DEMO !== "true") {
    console.log("Démo ignorée (SEED_DEMO=true requis, interdit en production).");
    return;
  }
  const pwd = process.env.SEED_DEMO_PASSWORD ?? "DemoTamurt2026!";
  const admin = await createUser({ id: "demo_admin", email: "admin@demo.tamurt.local", firstName: "Admin", lastName: "Démo", role: "ADMIN", kyc: true, password: pwd, country: "FR" });
  const sender = await createUser({ id: "demo_sender", email: "expediteur@demo.tamurt.local", firstName: "Lila", lastName: "Démo", password: pwd, country: "FR" });
  const traveler = await createUser({ id: "demo_traveler", email: "voyageur@demo.tamurt.local", firstName: "Amar", lastName: "Démo", kyc: true, password: pwd, country: "FR" });

  const city = async (slug: string) => (await db.city.findUniqueOrThrow({ where: { slug } })).id;
  const cat = async (slug: string) => (await db.parcelCategory.findUniqueOrThrow({ where: { slug } })).id;
  const inDays = (n: number) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + n); return d; };

  if ((await db.trip.count({ where: { isDemo: true } })) === 0) {
    await db.trip.createMany({
      data: [
        { travelerId: traveler.id, originCityId: await city("marseille-fr"), destCityId: await city("bejaia-dz"), departureDate: inDays(12), arrivalDate: inDays(12), transportMode: "PLANE", capacityGrams: 10_000, pricePerKg: 800, minPrice: 1500, currency: "EUR", acceptsFragile: true, description: "Vol direct, je peux récupérer le colis la veille à Marseille centre.", isDemo: true },
        { travelerId: traveler.id, originCityId: await city("paris-fr"), destCityId: await city("tizi-ouzou-dz"), departureDate: inDays(20), transportMode: "FERRY", capacityGrams: 20_000, pricePerKg: 600, minPrice: 1000, currency: "EUR", description: "Traversée Marseille–Alger en voiture puis route vers Tizi Ouzou.", isDemo: true },
        { travelerId: traveler.id, originCityId: await city("bejaia-dz"), destCityId: await city("lyon-fr"), departureDate: inDays(30), transportMode: "PLANE", capacityGrams: 5_000, pricePerKg: 1000, minPrice: 1500, currency: "EUR", isDemo: true },
      ],
    });
  }
  if ((await db.parcel.count({ where: { isDemo: true } })) === 0) {
    const base = { senderId: sender.id, currency: "EUR", status: "PUBLISHED" as const, honorDeclarationAt: new Date(), rulesAcceptedAt: new Date(), publishedAt: new Date(), isDemo: true };
    const p1 = await db.parcel.create({ data: { ...base, originCityId: await city("marseille-fr"), destCityId: await city("bejaia-dz"), desiredDate: inDays(14), dateFlexDays: 3, title: "Vêtements pour enfants", categoryId: await cat("vetements"), description: "Un sac de vêtements neufs pour enfants (4 et 7 ans), étiquettes encore attachées.", weightGrams: 4000, lengthCm: 50, widthCm: 35, heightCm: 20, declaredValue: 12000, budget: 4000, expiresAt: inDays(80) } });
    const p2 = await db.parcel.create({ data: { ...base, originCityId: await city("lyon-fr"), destCityId: await city("tizi-ouzou-dz"), desiredDate: inDays(25), dateFlexDays: 7, title: "Livres scolaires", categoryId: await cat("livres-documents"), description: "Cinq livres scolaires de lycée et deux dictionnaires, bien emballés.", weightGrams: 3500, lengthCm: 35, widthCm: 25, heightCm: 20, declaredValue: 8000, budget: 3000, expiresAt: inDays(90) } });
    await db.parcelRecipient.createMany({ data: [{ parcelId: p1.id, name: "Destinataire Démo", phone: "+213550000001", city: "Béjaïa" }, { parcelId: p2.id, name: "Destinataire Démo", phone: "+213550000002", city: "Tizi Ouzou" }] });
  }
  console.log(`✓ Démo : ${admin.email}, ${sender.email}, ${traveler.email} (mot de passe : SEED_DEMO_PASSWORD ou valeur par défaut documentée)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
