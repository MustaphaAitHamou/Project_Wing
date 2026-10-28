import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { db } from "@/server/db/client";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL;
  const statics = ["", "/comment-ca-marche", "/envoyer-un-colis", "/devenir-transporteur", "/rechercher", "/trajets", "/colis", "/tarifs", "/securite", "/faq", "/contact", "/a-propos", "/objets-interdits", "/conditions-generales", "/confidentialite", "/cookies", "/mentions-legales"];
  const [trips, parcels] = await Promise.all([
    db.trip.findMany({ where: { status: "PUBLISHED", isDemo: false }, select: { id: true, updatedAt: true }, take: 5000 }),
    db.parcel.findMany({ where: { status: "PUBLISHED", isDemo: false }, select: { id: true, updatedAt: true }, take: 5000 }),
  ]);
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...trips.map((t) => ({ url: `${base}/trajets/${t.id}`, lastModified: t.updatedAt, changeFrequency: "daily" as const, priority: 0.5 })),
    ...parcels.map((p) => ({ url: `${base}/colis/${p.id}`, lastModified: p.updatedAt, changeFrequency: "daily" as const, priority: 0.5 })),
  ];
}
