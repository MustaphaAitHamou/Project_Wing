import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import { resolveCity } from "@/server/services/geo";
import { TRANSPORT_MODES } from "@/features/shared/schemas";
import { todayUtc } from "@/features/shared/schemas";

/**
 * Recherche paginée côté serveur sur PostgreSQL. Les paramètres proviennent de
 * l'URL (recherches partageables) et sont validés avant toute requête.
 * Toutes les valeurs sont injectées via des paramètres liés (Prisma.sql).
 */
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined);
const optNum = z.coerce.number().positive().max(1_000_000).optional().catch(undefined);

export const searchParamsSchema = z.object({
  mode: z.enum(["trajets", "colis"]).catch("trajets"),
  from: z.string().max(80).optional().catch(undefined),
  to: z.string().max(80).optional().catch(undefined),
  fromCountry: z.string().length(2).toUpperCase().optional().catch(undefined),
  toCountry: z.string().length(2).toUpperCase().optional().catch(undefined),
  date: optDate,
  dateFrom: optDate,
  dateTo: optDate,
  maxPrice: optNum, // trajets : prix max au kg (€) ; colis : budget min (€)
  minBudget: optNum,
  weight: optNum, // kg
  category: z.string().max(80).optional().catch(undefined),
  transport: z.enum(TRANSPORT_MODES).optional().catch(undefined),
  verified: z.enum(["1"]).optional().catch(undefined),
  sort: z.enum(["relevance", "date", "price_asc", "price_desc"]).catch("relevance"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});
export type SearchParams = z.infer<typeof searchParamsSchema>;

export const PAGE_SIZE = 12;

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

async function resolveEndpoints(p: SearchParams) {
  const [fromCity, toCity] = await Promise.all([resolveCity(p.from), resolveCity(p.to)]);
  return { fromCity, toCity };
}

function dateWindow(p: SearchParams): { start: Date; end: Date | null; target: Date | null } {
  const today = todayUtc();
  if (p.dateFrom || p.dateTo) {
    const s = p.dateFrom ? day(p.dateFrom) : today;
    return { start: s < today ? today : s, end: p.dateTo ? day(p.dateTo) : null, target: p.dateFrom ? day(p.dateFrom) : null };
  }
  if (p.date) {
    const t = day(p.date);
    const s = new Date(t.getTime() - 3 * 86_400_000);
    return { start: s < today ? today : s, end: new Date(t.getTime() + 7 * 86_400_000), target: t };
  }
  return { start: today, end: null, target: null };
}

export async function searchTrips(p: SearchParams) {
  const { fromCity, toCity } = await resolveEndpoints(p);
  const w = dateWindow(p);
  const conds: Prisma.Sql[] = [Prisma.sql`t.status = 'PUBLISHED'`, Prisma.sql`t."departureDate" >= ${w.start}`];
  if (w.end) conds.push(Prisma.sql`t."departureDate" <= ${w.end}`);
  if (fromCity) conds.push(Prisma.sql`t."originCityId" = ${fromCity.id}`);
  else if (p.fromCountry) conds.push(Prisma.sql`oc."countryCode" = ${p.fromCountry}`);
  if (toCity) conds.push(Prisma.sql`t."destCityId" = ${toCity.id}`);
  else if (p.toCountry) conds.push(Prisma.sql`dc."countryCode" = ${p.toCountry}`);
  if (p.maxPrice) conds.push(Prisma.sql`t."pricePerKg" <= ${Math.round(p.maxPrice * 100)}`);
  if (p.weight) conds.push(Prisma.sql`(t."capacityGrams" - t."reservedGrams") >= ${Math.round(p.weight * 1000)}`);
  if (p.transport) conds.push(Prisma.sql`t."transportMode" = ${p.transport}::"TransportMode"`);
  if (p.verified) conds.push(Prisma.sql`up."kycStatus" = 'VERIFIED'`);
  conds.push(Prisma.sql`u.status = 'ACTIVE'`);

  const order =
    p.sort === "price_asc" ? Prisma.sql`t."pricePerKg" ASC, t."departureDate" ASC`
    : p.sort === "price_desc" ? Prisma.sql`t."pricePerKg" DESC, t."departureDate" ASC`
    : p.sort === "date" || !w.target ? Prisma.sql`t."departureDate" ASC, t."createdAt" DESC`
    : Prisma.sql`ABS(t."departureDate" - ${w.target}::date) ASC, (up."kycStatus" = 'VERIFIED') DESC, t."pricePerKg" ASC`;

  const where = Prisma.join(conds, " AND ");
  const from = Prisma.sql`FROM "trip" t JOIN "city" oc ON oc.id = t."originCityId" JOIN "city" dc ON dc.id = t."destCityId" JOIN "user" u ON u.id = t."travelerId" LEFT JOIN "user_profile" up ON up."userId" = u.id`;
  const [ids, count] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`SELECT t.id ${from} WHERE ${where} ORDER BY ${order} LIMIT ${PAGE_SIZE} OFFSET ${(p.page - 1) * PAGE_SIZE}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n ${from} WHERE ${where}`,
  ]);
  const items = await hydrateTrips(ids.map((r) => r.id));
  return { items, total: Number(count[0]?.n ?? 0), page: p.page, pageSize: PAGE_SIZE, fromCity, toCity };
}

export async function hydrateTrips(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db.trip.findMany({
    where: { id: { in: ids } },
    include: {
      originCity: { include: { country: true } },
      destCity: { include: { country: true } },
      traveler: { select: { id: true, firstName: true, image: true, profile: { select: { kycStatus: true, ratingSum: true, ratingCount: true, deliveriesCount: true } } } },
    },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
}

export async function searchParcels(p: SearchParams) {
  const { fromCity, toCity } = await resolveEndpoints(p);
  const w = dateWindow(p);
  const conds: Prisma.Sql[] = [Prisma.sql`pa.status = 'PUBLISHED'`, Prisma.sql`(pa."desiredDate" + pa."dateFlexDays") >= ${w.start}::date`];
  if (w.end) conds.push(Prisma.sql`(pa."desiredDate" - pa."dateFlexDays") <= ${w.end}::date`);
  if (fromCity) conds.push(Prisma.sql`pa."originCityId" = ${fromCity.id}`);
  else if (p.fromCountry) conds.push(Prisma.sql`oc."countryCode" = ${p.fromCountry}`);
  if (toCity) conds.push(Prisma.sql`pa."destCityId" = ${toCity.id}`);
  else if (p.toCountry) conds.push(Prisma.sql`dc."countryCode" = ${p.toCountry}`);
  if (p.minBudget) conds.push(Prisma.sql`pa.budget >= ${Math.round(p.minBudget * 100)}`);
  if (p.weight) conds.push(Prisma.sql`pa."weightGrams" <= ${Math.round(p.weight * 1000)}`);
  if (p.category) conds.push(Prisma.sql`cat.slug = ${p.category}`);
  if (p.verified) conds.push(Prisma.sql`up."kycStatus" = 'VERIFIED'`);
  conds.push(Prisma.sql`u.status = 'ACTIVE'`);

  const order =
    p.sort === "price_desc" ? Prisma.sql`pa.budget DESC, pa."desiredDate" ASC`
    : p.sort === "price_asc" ? Prisma.sql`pa.budget ASC, pa."desiredDate" ASC`
    : p.sort === "date" || !w.target ? Prisma.sql`pa."desiredDate" ASC, pa."publishedAt" DESC`
    : Prisma.sql`ABS(pa."desiredDate" - ${w.target}::date) ASC, pa."publishedAt" DESC`;

  const where = Prisma.join(conds, " AND ");
  const from = Prisma.sql`FROM "parcel" pa JOIN "city" oc ON oc.id = pa."originCityId" JOIN "city" dc ON dc.id = pa."destCityId" JOIN "parcel_category" cat ON cat.id = pa."categoryId" JOIN "user" u ON u.id = pa."senderId" LEFT JOIN "user_profile" up ON up."userId" = u.id`;
  const [ids, count] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`SELECT pa.id ${from} WHERE ${where} ORDER BY ${order} LIMIT ${PAGE_SIZE} OFFSET ${(p.page - 1) * PAGE_SIZE}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n ${from} WHERE ${where}`,
  ]);
  const items = await hydrateParcels(ids.map((r) => r.id));
  return { items, total: Number(count[0]?.n ?? 0), page: p.page, pageSize: PAGE_SIZE, fromCity, toCity };
}

export async function hydrateParcels(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db.parcel.findMany({
    where: { id: { in: ids } },
    include: {
      originCity: { include: { country: true } },
      destCity: { include: { country: true } },
      category: true,
      sender: { select: { id: true, firstName: true, image: true, profile: { select: { kycStatus: true, ratingSum: true, ratingCount: true } } } },
      _count: { select: { photos: true } },
    },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
}

/** Suggestions quand une recherche ne renvoie rien : mêmes pays, dates élargies. */
export async function nearbySuggestions(p: SearchParams, fromCountry?: string | null, toCountry?: string | null) {
  if (!fromCountry && !toCountry) return [];
  const relaxed: SearchParams = { ...p, from: undefined, to: undefined, fromCountry: fromCountry ?? undefined, toCountry: toCountry ?? undefined, date: undefined, dateFrom: undefined, dateTo: undefined, page: 1, sort: "date" };
  const r = p.mode === "colis" ? await searchParcels(relaxed) : await searchTrips(relaxed);
  return r.items.slice(0, 6);
}

export async function latestTrips(limit = 6) {
  const rows = await db.trip.findMany({ where: { status: "PUBLISHED", departureDate: { gte: todayUtc() }, traveler: { status: "ACTIVE" } }, orderBy: { createdAt: "desc" }, take: limit, select: { id: true } });
  return hydrateTrips(rows.map((r) => r.id));
}

export async function latestParcels(limit = 6) {
  const rows = await db.parcel.findMany({ where: { status: "PUBLISHED", sender: { status: "ACTIVE" } }, orderBy: { publishedAt: "desc" }, take: limit, select: { id: true } });
  return hydrateParcels(rows.map((r) => r.id));
}

/** Destinations les plus présentes dans les annonces actives (données réelles uniquement). */
export async function popularDestinations(limit = 6) {
  return db.$queryRaw<{ id: string; name: string; slug: string; countryName: string; n: bigint }[]>`
    SELECT c.id, c.name, c.slug, k.name AS "countryName", COUNT(*)::bigint AS n FROM (
      SELECT "destCityId" AS cid FROM "trip" WHERE status = 'PUBLISHED' AND "departureDate" >= CURRENT_DATE
      UNION ALL SELECT "destCityId" FROM "parcel" WHERE status = 'PUBLISHED'
    ) x JOIN "city" c ON c.id = x.cid JOIN "country" k ON k.code = c."countryCode"
    GROUP BY c.id, c.name, c.slug, k.name ORDER BY n DESC, c.name ASC LIMIT ${limit}`;
}
