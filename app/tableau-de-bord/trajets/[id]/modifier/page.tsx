import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUserPage } from "@/server/auth/session";
import { getOwnTrip } from "@/server/services/trips";
import { getSetting } from "@/server/settings";
import { db } from "@/server/db/client";
import { PageHeader } from "@/components/ui/misc";
import { TripForm } from "@/features/trips/trip-form";
import { toDateInput } from "@/lib/utils";

export const metadata: Metadata = { title: "Modifier un trajet" };

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/tableau-de-bord/trajets/${id}/modifier`);
  const t = await getOwnTrip(user.id, id);
  if (!t) notFound();
  const [rateBps, feeModel, o, d] = await Promise.all([getSetting("commission.rateBps"), getSetting("commission.feeModel"), db.city.findUniqueOrThrow({ where: { id: t.originCityId }, include: { country: true } }), db.city.findUniqueOrThrow({ where: { id: t.destCityId }, include: { country: true } })]);
  const opt = (c: typeof o) => ({ id: c.id, name: c.name, slug: c.slug, countryCode: c.countryCode, countryName: c.country.name });
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Modifier le trajet" />
      <TripForm rateBps={rateBps} feeModel={feeModel} initial={{ id: t.id, origin: opt(o), dest: opt(d), values: {
        originCityId: t.originCityId, destCityId: t.destCityId, departureDate: toDateInput(t.departureDate), arrivalDate: t.arrivalDate ? toDateInput(t.arrivalDate) : "", transportMode: t.transportMode,
        capacityGrams: (t.capacityGrams / 1000) as never, capacityVolumeL: t.capacityVolumeCm3 ? ((t.capacityVolumeCm3 / 1000) as never) : "", pricePerKg: String(t.pricePerKg / 100), minPrice: String(t.minPrice / 100),
        acceptsFragile: t.acceptsFragile, description: t.description ?? "", conditions: t.conditions ?? "",
      } }} />
    </div>
  );
}
