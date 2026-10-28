import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { getSetting } from "@/server/settings";
import { requireUserPage } from "@/server/auth/session";
import { getOwnParcel } from "@/server/services/parcels";
import { PageHeader } from "@/components/ui/misc";
import { ParcelWizard } from "@/features/parcels/parcel-wizard";
import { toDateInput } from "@/lib/utils";

export const metadata: Metadata = { title: "Modifier un colis" };

export default async function EditParcelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/tableau-de-bord/colis/${id}/modifier`);
  const p = await getOwnParcel(user.id, id);
  if (!p) notFound();
  if (!["DRAFT", "PUBLISHED", "PENDING_REVIEW"].includes(p.status)) redirect(`/tableau-de-bord/colis/${id}`);
  const [categories, rateBps, feeModel, maxWeight] = await Promise.all([
    db.parcelCategory.findMany({ where: { isActive: true, isProhibited: false }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, description: true, requiresReview: true } }),
    getSetting("commission.rateBps"),
    getSetting("commission.feeModel"),
    getSetting("parcel.maxWeightGrams"),
  ]);
  const city = (c: typeof p.originCity) => ({ id: c.id, name: c.name, slug: c.slug, countryCode: c.countryCode, countryName: c.country.name });
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Modifier l'annonce" description={p.title} />
      <ParcelWizard
        categories={categories}
        rateBps={rateBps}
        feeModel={feeModel}
        maxWeightKg={maxWeight / 1000}
        initial={{
          id: p.id,
          published: p.status !== "DRAFT",
          origin: city(p.originCity),
          dest: city(p.destCity),
          values: {
            originCityId: p.originCityId, destCityId: p.destCityId, desiredDate: toDateInput(p.desiredDate) as never, dateFlexDays: p.dateFlexDays, title: p.title, categoryId: p.categoryId, description: p.description,
            weightGrams: (p.weightGrams / 1000) as never, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm, quantity: p.quantity, declaredValue: String(p.declaredValue / 100), isFragile: p.isFragile,
            specialConditions: p.specialConditions ?? "", budget: String(p.budget / 100), currency: "EUR",
            recipient: { name: p.recipient?.name ?? "", phone: p.recipient?.phone ?? "", email: p.recipient?.email ?? "", city: p.recipient?.city ?? "", instructions: p.recipient?.instructions ?? "" },
          },
        }}
      />
    </div>
  );
}
