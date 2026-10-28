import "server-only";
import { db } from "@/server/db/client";
import { assertCorridorOpen } from "@/server/services/geo";
import { getSetting } from "@/server/settings";
import { enqueue } from "@/server/jobs/queue";
import { audit } from "@/server/audit";
import { conflict, forbidden, invalid, notFound } from "@/server/security/errors";
import { todayUtc } from "@/features/shared/schemas";
import type { ParcelInput } from "@/features/parcels/schemas";
import type { CurrentUser } from "@/server/auth/session";
import { deleteObject, putObject, signedUrl, validateUpload } from "@/server/storage";
import type { ParcelStatus } from "@/generated/prisma/client";

const EDITABLE: ParcelStatus[] = ["DRAFT", "PUBLISHED", "PENDING_REVIEW"];
export const MAX_PHOTOS = 6;

async function validateBusinessRules(userId: string, d: ParcelInput, publishing: boolean) {
  const [origin, dest, category] = await Promise.all([
    db.city.findUnique({ where: { id: d.originCityId } }),
    db.city.findUnique({ where: { id: d.destCityId } }),
    db.parcelCategory.findUnique({ where: { id: d.categoryId } }),
  ]);
  if (!origin || !dest) throw invalid("Ville inconnue.", { originCityId: ["Choisissez une ville dans la liste"] });
  if (!category || !category.isActive) throw invalid("Catégorie inconnue.", { categoryId: ["Choisissez une catégorie"] });
  if (category.isProhibited) throw invalid(`La catégorie « ${category.name} » fait partie des objets interdits au transport.`);
  if (d.desiredDate < todayUtc()) throw invalid("La date souhaitée est passée.", { desiredDate: ["Choisissez une date à venir"] });

  const [maxWeight, maxValue] = await Promise.all([getSetting("parcel.maxWeightGrams"), getSetting("parcel.maxDeclaredValue")]);
  if (d.weightGrams > maxWeight) throw invalid(`Poids maximal autorisé : ${maxWeight / 1000} kg.`, { weightGrams: [`Maximum ${maxWeight / 1000} kg`] });
  if (d.declaredValue > maxValue) throw invalid(`Valeur déclarée maximale : ${maxValue / 100} €.`, { declaredValue: [`Maximum ${maxValue / 100} €`] });

  if (publishing) {
    const corridor = await assertCorridorOpen(origin.countryCode, dest.countryCode);
    if (d.weightGrams > corridor.maxWeightGrams) throw invalid(`Poids maximal sur ce trajet : ${corridor.maxWeightGrams / 1000} kg.`);
    const threshold = await getSetting("kyc.senderRequiredAboveValue");
    if (d.declaredValue > threshold) {
      const p = await db.userProfile.findUnique({ where: { userId }, select: { kycStatus: true } });
      if (p?.kycStatus !== "VERIFIED")
        throw forbidden(`Pour un colis d'une valeur supérieure à ${threshold / 100} €, vérifiez d'abord votre identité (Paramètres > Vérification).`);
    }
  }
  return { origin, dest, category };
}

function toData(d: ParcelInput) {
  const { recipient: _r, ...rest } = d;
  return rest;
}

export async function saveParcel(user: CurrentUser, input: { id?: string; data: ParcelInput; publish: boolean; declarations?: { honorDeclaration: true; rulesAccepted: true } }) {
  if (!user.emailVerified) throw forbidden("Confirmez votre adresse email avant de publier.");
  if (input.publish && !input.declarations) throw invalid("Acceptez la déclaration sur l'honneur et les règles de transport.");
  const { category } = await validateBusinessRules(user.id, input.data, input.publish);
  const expireDays = await getSetting("parcel.expireAfterDays");
  const now = new Date();

  const status: ParcelStatus = input.publish ? (category.requiresReview ? "PENDING_REVIEW" : "PUBLISHED") : "DRAFT";
  const publishFields = input.publish
    ? { honorDeclarationAt: now, rulesAcceptedAt: now, publishedAt: status === "PUBLISHED" ? now : null, expiresAt: new Date(input.data.desiredDate.getTime() + (input.data.dateFlexDays + expireDays) * 86_400_000) }
    : {};

  const parcel = await db.$transaction(async (tx) => {
    let id = input.id;
    if (id) {
      const existing = await tx.parcel.findUnique({ where: { id }, select: { senderId: true, status: true } });
      if (!existing || existing.senderId !== user.id) throw notFound();
      if (!EDITABLE.includes(existing.status)) throw conflict("Cette annonce ne peut plus être modifiée.");
      // Une annonce déjà publiée ne repasse pas en brouillon.
      const nextStatus = existing.status !== "DRAFT" && !input.publish ? existing.status : status;
      await tx.parcel.update({ where: { id }, data: { ...toData(input.data), status: nextStatus, ...publishFields } });
    } else {
      const created = await tx.parcel.create({ data: { ...toData(input.data), senderId: user.id, status, ...publishFields } });
      id = created.id;
    }
    await tx.parcelRecipient.upsert({ where: { parcelId: id }, create: { parcelId: id, ...input.data.recipient }, update: input.data.recipient });
    if (status === "PUBLISHED") await enqueue(tx, "match.parcel", { parcelId: id }, { dedupeKey: `match.parcel:${id}:${now.toISOString().slice(0, 16)}` });
    return tx.parcel.findUniqueOrThrow({ where: { id } });
  });
  return parcel;
}

export async function cancelParcel(userId: string, parcelId: string) {
  return db.$transaction(async (tx) => {
    const p = await tx.parcel.findUnique({ where: { id: parcelId } });
    if (!p || p.senderId !== userId) throw notFound();
    if (p.status === "DRAFT") {
      const photos = await tx.parcelPhoto.findMany({ where: { parcelId } });
      await tx.parcel.delete({ where: { id: parcelId } });
      for (const ph of photos) await deleteObject(ph.storageKey).catch(() => undefined);
      return { deleted: true };
    }
    if (!["PUBLISHED", "PENDING_REVIEW", "EXPIRED"].includes(p.status))
      throw conflict("Une annonce réservée s'annule depuis la réservation correspondante.");
    await tx.parcel.update({ where: { id: parcelId }, data: { status: "CANCELLED" } });
    await tx.proposal.updateMany({ where: { parcelId, status: "PENDING" }, data: { status: "EXPIRED", respondedAt: new Date() } });
    return { deleted: false };
  });
}

export async function addParcelPhoto(userId: string, parcelId: string, file: File) {
  const p = await db.parcel.findUnique({ where: { id: parcelId }, select: { senderId: true, status: true, _count: { select: { photos: true } } } });
  if (!p || p.senderId !== userId) throw notFound();
  if (!EDITABLE.includes(p.status)) throw conflict("Cette annonce ne peut plus être modifiée.");
  if (p._count.photos >= MAX_PHOTOS) throw invalid(`${MAX_PHOTOS} photos maximum.`);
  const { bytes, mime } = await validateUpload(file, "image");
  const key = await putObject("parcels", bytes, mime);
  return db.parcelPhoto.create({ data: { parcelId, storageKey: key, mimeType: mime, sizeBytes: bytes.byteLength, sortOrder: p._count.photos } });
}

export async function removeParcelPhoto(userId: string, photoId: string) {
  const ph = await db.parcelPhoto.findUnique({ where: { id: photoId }, include: { parcel: { select: { senderId: true, status: true } } } });
  if (!ph || ph.parcel.senderId !== userId) throw notFound();
  if (!EDITABLE.includes(ph.parcel.status)) throw conflict("Cette annonce ne peut plus être modifiée.");
  await db.parcelPhoto.delete({ where: { id: photoId } });
  await deleteObject(ph.storageKey).catch(() => undefined);
}

export async function photoUrls(photos: { id: string; storageKey: string }[]) {
  return Promise.all(photos.map(async (p) => ({ id: p.id, url: await signedUrl(p.storageKey, 3600) })));
}

const publicUserSelect = {
  id: true,
  firstName: true,
  image: true,
  createdAt: true,
  profile: { select: { kycStatus: true, ratingSum: true, ratingCount: true, deliveriesCount: true, shipmentsCount: true, city: true } },
} as const;

/** Vue publique d'une annonce : jamais les coordonnées du destinataire ni le nom complet. */
export async function getPublicParcel(id: string) {
  const p = await db.parcel.findUnique({
    where: { id },
    include: { originCity: { include: { country: true } }, destCity: { include: { country: true } }, category: true, photos: { orderBy: { sortOrder: "asc" } }, sender: { select: publicUserSelect } },
  });
  if (!p || !["PUBLISHED", "RESERVED", "IN_TRANSIT", "DELIVERED"].includes(p.status)) return null;
  return { ...p, photos: await photoUrls(p.photos) };
}

/** Vue propriétaire : tout, y compris le destinataire. */
export async function getOwnParcel(userId: string, id: string) {
  const p = await db.parcel.findUnique({
    where: { id },
    include: {
      originCity: { include: { country: true } },
      destCity: { include: { country: true } },
      category: true,
      recipient: true,
      photos: { orderBy: { sortOrder: "asc" } },
      proposals: { orderBy: { createdAt: "desc" }, include: { trip: { include: { originCity: true, destCity: true } }, traveler: { select: publicUserSelect } } },
      bookings: { orderBy: { createdAt: "desc" }, select: { id: true, reference: true, status: true } },
    },
  });
  if (!p || p.senderId !== userId) return null;
  return { ...p, photos: await photoUrls(p.photos) };
}

export async function listMyParcels(userId: string, status?: ParcelStatus[]) {
  return db.parcel.findMany({
    where: { senderId: userId, ...(status ? { status: { in: status } } : {}) },
    orderBy: { createdAt: "desc" },
    include: { originCity: true, destCity: true, category: true, _count: { select: { proposals: { where: { status: "PENDING" } } } } },
    take: 100,
  });
}

/** Expiration des annonces (tâche planifiée). */
export async function expireParcels() {
  const now = new Date();
  const res = await db.parcel.updateMany({ where: { status: { in: ["PUBLISHED", "PENDING_REVIEW"] }, expiresAt: { lt: now } }, data: { status: "EXPIRED" } });
  await db.proposal.updateMany({ where: { status: "PENDING", parcel: { status: "EXPIRED" } }, data: { status: "EXPIRED" } });
  return res.count;
}

/** Modération (staff). */
export async function moderateParcel(actorId: string, parcelId: string, action: "approve" | "suspend" | "restore", note?: string) {
  return db.$transaction(async (tx) => {
    const p = await tx.parcel.findUnique({ where: { id: parcelId } });
    if (!p) throw notFound();
    let status: ParcelStatus;
    if (action === "approve") {
      if (p.status !== "PENDING_REVIEW") throw conflict("Seule une annonce en attente peut être validée.");
      status = "PUBLISHED";
    } else if (action === "suspend") {
      if (!["PUBLISHED", "PENDING_REVIEW", "EXPIRED"].includes(p.status)) throw conflict("Cette annonce est engagée dans une réservation : traitez la réservation.");
      status = "SUSPENDED";
      await tx.proposal.updateMany({ where: { parcelId, status: "PENDING" }, data: { status: "EXPIRED" } });
    } else {
      if (p.status !== "SUSPENDED") throw conflict("Annonce non suspendue.");
      status = "PUBLISHED";
    }
    await tx.parcel.update({ where: { id: parcelId }, data: { status, moderationNote: note ?? null, ...(status === "PUBLISHED" && !p.publishedAt ? { publishedAt: new Date() } : {}) } });
    await audit({ actorId, action: `parcel.${action}`, targetType: "Parcel", targetId: parcelId, metadata: { from: p.status, to: status, note: note ?? null } }, tx);
    if (status === "PUBLISHED") await enqueue(tx, "match.parcel", { parcelId });
  });
}
