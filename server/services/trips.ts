import "server-only";
import { db } from "@/server/db/client";
import { assertCorridorOpen } from "@/server/services/geo";
import { getSetting } from "@/server/settings";
import { enqueue } from "@/server/jobs/queue";
import { audit } from "@/server/audit";
import { conflict, forbidden, invalid, notFound } from "@/server/security/errors";
import { todayUtc } from "@/features/shared/schemas";
import type { TripInput } from "@/features/trips/schemas";
import type { CurrentUser } from "@/server/auth/session";
import type { TripStatus } from "@/generated/prisma/client";

const publicUserSelect = {
  id: true,
  firstName: true,
  image: true,
  createdAt: true,
  profile: { select: { kycStatus: true, ratingSum: true, ratingCount: true, deliveriesCount: true, city: true } },
} as const;

function toData(d: TripInput) {
  const { capacityVolumeL, ...rest } = d;
  return { ...rest, arrivalDate: d.arrivalDate ?? null, capacityVolumeCm3: capacityVolumeL ? Math.round(capacityVolumeL * 1000) : null };
}

export async function saveTrip(user: CurrentUser, input: { id?: string; data: TripInput }) {
  if (!user.emailVerified) throw forbidden("Confirmez votre adresse email avant de publier.");
  const d = input.data;
  const [origin, dest] = await Promise.all([db.city.findUnique({ where: { id: d.originCityId } }), db.city.findUnique({ where: { id: d.destCityId } })]);
  if (!origin || !dest) throw invalid("Ville inconnue.", { originCityId: ["Choisissez une ville dans la liste"] });
  if (d.departureDate < todayUtc()) throw invalid("La date de départ est passée.", { departureDate: ["Choisissez une date à venir"] });
  const corridor = await assertCorridorOpen(origin.countryCode, dest.countryCode, d.transportMode);
  if (d.capacityGrams > corridor.maxWeightGrams) throw invalid(`Capacité maximale sur ce trajet : ${corridor.maxWeightGrams / 1000} kg.`);

  return db.$transaction(async (tx) => {
    let id = input.id;
    if (id) {
      const t = await tx.trip.findUnique({ where: { id } });
      if (!t || t.travelerId !== user.id) throw notFound();
      if (!["PUBLISHED", "FULL", "DRAFT"].includes(t.status)) throw conflict("Ce trajet ne peut plus être modifié.");
      const data = toData(d);
      // Les engagements existants priment : on ne peut pas réduire la capacité sous le déjà-réservé
      // ni modifier l'itinéraire ou la date lorsqu'une réservation existe.
      if (data.capacityGrams < t.reservedGrams) throw conflict(`Capacité inférieure au poids déjà réservé (${t.reservedGrams / 1000} kg).`);
      if (data.capacityVolumeCm3 != null && data.capacityVolumeCm3 < t.reservedVolumeCm3) throw conflict("Volume inférieur au volume déjà réservé.");
      if (t.reservedGrams > 0 && (data.originCityId !== t.originCityId || data.destCityId !== t.destCityId || data.departureDate.getTime() !== t.departureDate.getTime()))
        throw conflict("Itinéraire et date ne sont plus modifiables : des colis sont déjà réservés sur ce trajet.");
      await tx.trip.update({ where: { id }, data: { ...data, status: data.capacityGrams > t.reservedGrams ? "PUBLISHED" : "FULL" } });
    } else {
      const created = await tx.trip.create({ data: { ...toData(d), travelerId: user.id, status: "PUBLISHED" } });
      id = created.id;
    }
    await enqueue(tx, "match.trip", { tripId: id }, { dedupeKey: `match.trip:${id}:${new Date().toISOString().slice(0, 16)}` });
    return tx.trip.findUniqueOrThrow({ where: { id } });
  });
}

export async function cancelTrip(userId: string, tripId: string) {
  return db.$transaction(async (tx) => {
    const t = await tx.trip.findUnique({ where: { id: tripId } });
    if (!t || t.travelerId !== userId) throw notFound();
    const active = await tx.booking.count({ where: { tripId, status: { notIn: ["CANCELLED", "REFUNDED", "COMPLETED"] } } });
    if (active > 0) throw conflict("Annulez d'abord les réservations en cours sur ce trajet.");
    if (!["PUBLISHED", "FULL", "DRAFT", "EXPIRED"].includes(t.status)) throw conflict("Ce trajet ne peut pas être annulé.");
    await tx.trip.update({ where: { id: tripId }, data: { status: "CANCELLED" } });
    await tx.proposal.updateMany({ where: { tripId, status: "PENDING" }, data: { status: "WITHDRAWN", respondedAt: new Date() } });
  });
}

export async function getPublicTrip(id: string) {
  const t = await db.trip.findUnique({
    where: { id },
    include: { originCity: { include: { country: true } }, destCity: { include: { country: true } }, traveler: { select: publicUserSelect } },
  });
  if (!t || !["PUBLISHED", "FULL"].includes(t.status)) return null;
  return t;
}

export async function getOwnTrip(userId: string, id: string) {
  const t = await db.trip.findUnique({
    where: { id },
    include: {
      originCity: { include: { country: true } },
      destCity: { include: { country: true } },
      proposals: { orderBy: { createdAt: "desc" }, include: { parcel: { include: { originCity: true, destCity: true, category: true } } } },
      bookings: { orderBy: { createdAt: "desc" }, include: { parcel: { select: { title: true } } } },
    },
  });
  if (!t || t.travelerId !== userId) return null;
  return t;
}

export async function listMyTrips(userId: string, status?: TripStatus[]) {
  return db.trip.findMany({
    where: { travelerId: userId, ...(status ? { status: { in: status } } : {}) },
    orderBy: { departureDate: "desc" },
    include: { originCity: true, destCity: true, _count: { select: { proposals: { where: { status: "PENDING" } }, bookings: true } } },
    take: 100,
  });
}

export async function expireTrips() {
  const res = await db.trip.updateMany({ where: { status: { in: ["PUBLISHED", "FULL"] }, departureDate: { lt: todayUtc() } }, data: { status: "EXPIRED" } });
  await db.proposal.updateMany({ where: { status: "PENDING", trip: { status: "EXPIRED" } }, data: { status: "EXPIRED" } });
  return res.count;
}

export async function moderateTrip(actorId: string, tripId: string, action: "suspend" | "restore", note?: string) {
  return db.$transaction(async (tx) => {
    const t = await tx.trip.findUnique({ where: { id: tripId } });
    if (!t) throw notFound();
    if (action === "suspend" && !["PUBLISHED", "FULL"].includes(t.status)) throw conflict("Trajet non publié.");
    if (action === "restore" && t.status !== "SUSPENDED") throw conflict("Trajet non suspendu.");
    const status: TripStatus = action === "suspend" ? "SUSPENDED" : t.reservedGrams >= t.capacityGrams ? "FULL" : "PUBLISHED";
    await tx.trip.update({ where: { id: tripId }, data: { status, moderationNote: note ?? null } });
    if (action === "suspend") await tx.proposal.updateMany({ where: { tripId, status: "PENDING" }, data: { status: "EXPIRED" } });
    await audit({ actorId, action: `trip.${action}`, targetType: "Trip", targetId: tripId, metadata: { from: t.status, to: status, note: note ?? null } }, tx);
  });
}

export async function requireTravelerVerified(userId: string) {
  if (!(await getSetting("kyc.travelerRequired"))) return;
  const p = await db.userProfile.findUnique({ where: { userId }, select: { kycStatus: true } });
  if (p?.kycStatus !== "VERIFIED") throw forbidden("Vérifiez votre identité pour transporter des colis (Paramètres > Vérification d'identité).");
}
