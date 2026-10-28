import "server-only";
import { db } from "@/server/db/client";
import { normalizeSearch } from "@/lib/domain/text";
import { invalid, unavailable } from "@/server/security/errors";
import type { TransportMode } from "@/generated/prisma/client";
import { isTestMode } from "@/lib/test-mode";

export interface CityOption {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  countryName: string;
}

/** Autocomplétion tolérante aux accents et aux variantes (Béjaïa / Bejaia / Bgayet). */
export async function searchCities(q: string, countryCode?: string, limit = 8): Promise<CityOption[]> {
  const n = normalizeSearch(q);
  if (n.length < 1) {
    const popular = await db.city.findMany({ where: { isPopular: true, country: { isActive: true }, ...(countryCode ? { countryCode } : {}) }, include: { country: true }, take: limit, orderBy: { name: "asc" } });
    return popular.map(toOption);
  }
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT c.id FROM "city" c JOIN "country" k ON k.code = c."countryCode"
    WHERE k."isActive" = true
      AND (${countryCode ?? null}::text IS NULL OR c."countryCode" = ${countryCode ?? null})
      AND EXISTS (SELECT 1 FROM unnest(c."searchNames") s WHERE s LIKE ${n + "%"} OR s LIKE ${"% " + n + "%"})
    ORDER BY (EXISTS (SELECT 1 FROM unnest(c."searchNames") s WHERE s = ${n})) DESC, c."isPopular" DESC, c.name ASC
    LIMIT ${limit}`;
  if (rows.length === 0) return [];
  const cities = await db.city.findMany({ where: { id: { in: rows.map((r) => r.id) } }, include: { country: true } });
  const order = new Map(rows.map((r, i) => [r.id, i]));
  return cities.sort((a, b) => order.get(a.id)! - order.get(b.id)!).map(toOption);
}

function toOption(c: { id: string; name: string; slug: string; countryCode: string; country: { name: string } }): CityOption {
  return { id: c.id, name: c.name, slug: c.slug, countryCode: c.countryCode, countryName: c.country.name };
}

/** Résout une ville à partir de son slug, de son id ou d'un nom saisi librement. */
export async function resolveCity(input: string | undefined | null) {
  if (!input) return null;
  const bySlug = await db.city.findFirst({ where: { OR: [{ slug: input }, { id: input }] }, include: { country: true } });
  if (bySlug) return bySlug;
  const n = normalizeSearch(input);
  if (!n) return null;
  return db.city.findFirst({ where: { searchNames: { has: n } }, include: { country: true } });
}

export async function listActiveCountries() {
  return db.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

/**
 * Vérifie qu'un corridor pays → pays est ouvert. En production seuls les corridors LIVE
 * sont utilisables ; TEST_ONLY est accepté hors production.
 */
export async function assertCorridorOpen(originCountry: string, destCountry: string, mode?: TransportMode) {
  const c = await db.corridor.findUnique({ where: { originCountry_destCountry: { originCountry, destCountry } } });
  const allowTest = isTestMode();
  if (!c || c.status === "DISABLED" || (c.status === "TEST_ONLY" && !allowTest))
    throw unavailable("Ce trajet entre ces deux pays n'est pas encore ouvert sur Tamurt Sending.");
  if (mode && c.allowedModes.length > 0 && !c.allowedModes.includes(mode))
    throw invalid("Ce moyen de transport n'est pas autorisé sur ce trajet.");
  return c;
}

export async function getOpenCorridors() {
  const allowTest = isTestMode();
  return db.corridor.findMany({ where: { status: { in: allowTest ? ["LIVE", "TEST_ONLY"] : ["LIVE"] } }, include: { origin: true, destination: true } });
}
