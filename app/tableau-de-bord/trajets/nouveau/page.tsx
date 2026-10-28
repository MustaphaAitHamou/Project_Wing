import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/server/auth/session";
import { getSetting } from "@/server/settings";
import { Alert, PageHeader } from "@/components/ui/misc";
import { TripForm } from "@/features/trips/trip-form";

export const metadata: Metadata = { title: "Publier un trajet" };

export default async function NewTripPage() {
  const user = await requireUserPage("/tableau-de-bord/trajets/nouveau");
  const [rateBps, feeModel] = await Promise.all([getSetting("commission.rateBps"), getSetting("commission.feeModel")]);
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Publier un trajet" description="Indiquez votre itinéraire et la place disponible. Les expéditeurs compatibles seront prévenus." />
      {user.kycStatus !== "VERIFIED" && <Alert tone="info">Vous pouvez publier votre trajet dès maintenant, mais vous devrez <Link href="/tableau-de-bord/parametres/verification">vérifier votre identité</Link> avant de proposer vos services ou d&apos;accepter un colis.</Alert>}
      <TripForm rateBps={rateBps} feeModel={feeModel} />
    </div>
  );
}
