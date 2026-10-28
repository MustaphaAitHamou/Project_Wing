import type { Metadata } from "next";
import { db } from "@/server/db/client";
import { getSetting } from "@/server/settings";
import { requireUserPage } from "@/server/auth/session";
import { PageHeader, Alert } from "@/components/ui/misc";
import { ParcelWizard } from "@/features/parcels/parcel-wizard";

export const metadata: Metadata = { title: "Publier un colis" };

export default async function NewParcelPage() {
  const user = await requireUserPage("/tableau-de-bord/colis/nouveau");
  const [categories, rateBps, feeModel, maxWeight] = await Promise.all([
    db.parcelCategory.findMany({ where: { isActive: true, isProhibited: false }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, description: true, requiresReview: true } }),
    getSetting("commission.rateBps"),
    getSetting("commission.feeModel"),
    getSetting("parcel.maxWeightGrams"),
  ]);
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Publier un colis" description="Cinq étapes rapides. Vous pourrez enregistrer un brouillon à tout moment." />
      {!user.emailVerified && <Alert tone="warning">Confirmez votre adresse email pour pouvoir publier (vous pouvez déjà enregistrer un brouillon une fois l&apos;email confirmé).</Alert>}
      <ParcelWizard categories={categories} rateBps={rateBps} feeModel={feeModel} maxWeightKg={maxWeight / 1000} />
    </div>
  );
}
