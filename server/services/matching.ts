import "server-only";
import { db } from "@/server/db/client";
import { scoreMatch, type MatchResult } from "@/lib/domain/matching";
import { notify } from "@/server/services/notifications";
import { formatMoney } from "@/lib/domain/money";

const WINDOW_DAYS = 7;
const NOTIFY_MIN_SCORE = 60;
const DAY = 86_400_000;

type ParcelForMatch = NonNullable<Awaited<ReturnType<typeof loadParcel>>>;
const loadParcel = (id: string) => db.parcel.findUnique({ where: { id }, include: { originCity: true, destCity: true, category: true } });

function parcelInput(p: ParcelForMatch) {
  return {
    originCityId: p.originCityId, destCityId: p.destCityId, originCountry: p.originCity.countryCode, destCountry: p.destCity.countryCode,
    desiredDate: p.desiredDate, dateFlexDays: p.dateFlexDays, weightGrams: p.weightGrams, volumeCm3: p.lengthCm * p.widthCm * p.heightCm,
    isFragile: p.isFragile, budget: p.budget, currency: p.currency, allowedModes: p.category.allowedModes,
  };
}

/** Trajets compatibles avec un colis, triés par score décroissant. */
export async function matchesForParcel(parcelId: string, { page = 1, pageSize = 10 } = {}) {
  const p = await loadParcel(parcelId);
  if (!p) return { items: [], total: 0 };
  const from = new Date(p.desiredDate.getTime() - (p.dateFlexDays + WINDOW_DAYS) * DAY);
  const to = new Date(p.desiredDate.getTime() + (p.dateFlexDays + WINDOW_DAYS) * DAY);
  const trips = await db.trip.findMany({
    where: {
      status: "PUBLISHED",
      travelerId: { not: p.senderId },
      traveler: { status: "ACTIVE" },
      departureDate: { gte: from, lte: to },
      originCity: { countryCode: p.originCity.countryCode },
      destCity: { countryCode: p.destCity.countryCode },
    },
    include: { originCity: true, destCity: true, traveler: { select: { id: true, firstName: true, image: true, profile: { select: { kycStatus: true, ratingSum: true, ratingCount: true, deliveriesCount: true } } } } },
    take: 500,
  });
  const scored = trips
    .map((t) => ({
      trip: t,
      match: scoreMatch(parcelInput(p), {
        originCityId: t.originCityId, destCityId: t.destCityId, originCountry: t.originCity.countryCode, destCountry: t.destCity.countryCode,
        departureDate: t.departureDate, transportMode: t.transportMode, availableGrams: t.capacityGrams - t.reservedGrams,
        availableVolumeCm3: t.capacityVolumeCm3 == null ? null : t.capacityVolumeCm3 - t.reservedVolumeCm3, acceptsFragile: t.acceptsFragile,
        pricePerKg: t.pricePerKg, minPrice: t.minPrice, currency: t.currency,
        travelerVerified: t.traveler.profile?.kycStatus === "VERIFIED",
        travelerRating: t.traveler.profile?.ratingCount ? t.traveler.profile.ratingSum / t.traveler.profile.ratingCount : null,
      }),
    }))
    .filter((x) => x.match.compatible)
    .sort((a, b) => b.match.score - a.match.score || a.trip.departureDate.getTime() - b.trip.departureDate.getTime());
  return { items: scored.slice((page - 1) * pageSize, page * pageSize), total: scored.length };
}

/** Colis compatibles avec un trajet. */
export async function matchesForTrip(tripId: string, { page = 1, pageSize = 10 } = {}) {
  const t = await db.trip.findUnique({ where: { id: tripId }, include: { originCity: true, destCity: true, traveler: { select: { profile: true } } } });
  if (!t) return { items: [] as { parcel: ParcelForMatch & { sender: { id: string; firstName: string } }; match: MatchResult }[], total: 0 };
  const parcels = await db.parcel.findMany({
    where: {
      status: "PUBLISHED",
      senderId: { not: t.travelerId },
      sender: { status: "ACTIVE" },
      desiredDate: { gte: new Date(t.departureDate.getTime() - 37 * DAY), lte: new Date(t.departureDate.getTime() + 37 * DAY) },
      originCity: { countryCode: t.originCity.countryCode },
      destCity: { countryCode: t.destCity.countryCode },
      weightGrams: { lte: t.capacityGrams - t.reservedGrams },
    },
    include: { originCity: true, destCity: true, category: true, sender: { select: { id: true, firstName: true } } },
    take: 500,
  });
  const profile = t.traveler.profile;
  const scored = parcels
    .map((p) => ({
      parcel: p,
      match: scoreMatch(parcelInput(p), {
        originCityId: t.originCityId, destCityId: t.destCityId, originCountry: t.originCity.countryCode, destCountry: t.destCity.countryCode,
        departureDate: t.departureDate, transportMode: t.transportMode, availableGrams: t.capacityGrams - t.reservedGrams,
        availableVolumeCm3: t.capacityVolumeCm3 == null ? null : t.capacityVolumeCm3 - t.reservedVolumeCm3, acceptsFragile: t.acceptsFragile,
        pricePerKg: t.pricePerKg, minPrice: t.minPrice, currency: t.currency, travelerVerified: profile?.kycStatus === "VERIFIED",
        travelerRating: profile?.ratingCount ? profile.ratingSum / profile.ratingCount : null,
      }),
    }))
    .filter((x) => x.match.compatible)
    .sort((a, b) => b.match.score - a.match.score);
  return { items: scored.slice((page - 1) * pageSize, page * pageSize), total: scored.length };
}

async function alreadyNotified(userId: string, pair: string) {
  return (await db.notification.count({ where: { userId, data: { path: ["pair"], equals: pair } } })) > 0;
}

/** Job : nouveau colis publié → prévenir les voyageurs dont le trajet correspond. */
export async function notifyMatchesForParcel(parcelId: string) {
  const p = await loadParcel(parcelId);
  if (!p || p.status !== "PUBLISHED") return 0;
  const { items } = await matchesForParcel(parcelId, { pageSize: 20 });
  let sent = 0;
  for (const { trip, match } of items) {
    if (match.score < NOTIFY_MIN_SCORE) continue;
    const pair = `${parcelId}:${trip.id}`;
    if (await alreadyNotified(trip.travelerId, pair)) continue;
    await notify(db, {
      userId: trip.travelerId, type: "MATCHING_PARCEL",
      title: `Nouveau colis compatible : ${p.originCity.name} → ${p.destCity.name}`,
      body: `${p.title} (${p.weightGrams / 1000} kg), budget ${formatMoney(p.budget, p.currency)}. Compatibilité ${match.score}/100.`,
      link: `/colis/${p.id}`, data: { pair },
    });
    sent++;
  }
  // Et l'expéditeur : s'il existe déjà des trajets compatibles.
  if (items.length > 0 && !(await alreadyNotified(p.senderId, `parcel:${parcelId}`))) {
    await notify(db, { userId: p.senderId, type: "MATCHING_TRIP", title: `${items.length} trajet(s) compatible(s) avec votre colis`, body: "Consultez les voyageurs qui font déjà ce trajet et contactez-les.", link: `/tableau-de-bord/colis/${p.id}`, data: { pair: `parcel:${parcelId}` } });
  }
  return sent;
}

/** Job : nouveau trajet publié → prévenir les expéditeurs dont le colis correspond. */
export async function notifyMatchesForTrip(tripId: string) {
  const t = await db.trip.findUnique({ where: { id: tripId }, include: { originCity: true, destCity: true } });
  if (!t || t.status !== "PUBLISHED") return 0;
  const { items } = await matchesForTrip(tripId, { pageSize: 20 });
  let sent = 0;
  for (const { parcel, match } of items) {
    if (match.score < NOTIFY_MIN_SCORE) continue;
    const pair = `${parcel.id}:${tripId}`;
    if (await alreadyNotified(parcel.senderId, pair)) continue;
    await notify(db, {
      userId: parcel.senderId, type: "MATCHING_TRIP",
      title: `Un voyageur fait ${t.originCity.name} → ${t.destCity.name}`,
      body: `Départ le ${t.departureDate.toLocaleDateString("fr-FR", { timeZone: "UTC" })}, compatible avec « ${parcel.title} » (${match.score}/100).`,
      link: `/trajets/${tripId}`, data: { pair },
    });
    sent++;
  }
  return sent;
}
