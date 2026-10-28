import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { getKycState } from "@/server/kyc";
import { Alert, PageHeader } from "@/components/ui/misc";
import { StartKycButton } from "@/features/account/start-kyc";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Vérification d'identité" };

export default async function VerificationPage() {
  const user = await requireUserPage("/tableau-de-bord/parametres/verification");
  const { status, last, provider } = await getKycState(user.id);
  return (
    <div className="grid max-w-2xl gap-6">
      <PageHeader title="Vérification d'identité" description="Obligatoire pour transporter des colis, et pour expédier des colis de valeur élevée." />
      {status === "VERIFIED" && <Alert tone="success" title="Identité vérifiée">{last?.expiresAt ? `Valable jusqu'au ${formatDate(last.expiresAt)}.` : null}</Alert>}
      {status === "PENDING" && <Alert tone="info" title="Vérification en cours">Le prestataire traite votre demande. Vous serez notifié du résultat. Si vous avez quitté la page du prestataire avant la fin, relancez la vérification.</Alert>}
      {status === "REJECTED" && <Alert tone="danger" title="Vérification refusée">{last?.failureReason ?? "Le document n'a pas pu être validé."} Vous pouvez recommencer avec un document lisible et en cours de validité.</Alert>}
      {status === "EXPIRED" && <Alert tone="warning" title="Vérification expirée">Merci de vérifier à nouveau votre identité.</Alert>}
      {status !== "VERIFIED" && (
        <div className="grid gap-4 rounded-2xl border bg-card p-6 text-sm">
          <p className="flex items-center gap-2 font-semibold"><BadgeCheck className="size-5 text-primary" />Comment ça se passe ?</p>
          <ol className="grid list-decimal gap-1 pl-5 text-muted-foreground">
            <li>Vous êtes redirigé vers notre prestataire de vérification ({provider === "stripe_identity" ? "Stripe Identity" : "simulateur de test"}).</li>
            <li>Vous photographiez une pièce d&apos;identité officielle puis prenez un selfie.</li>
            <li>Le prestataire nous transmet uniquement le résultat. Tamurt Sending ne stocke pas vos documents.</li>
          </ol>
          <StartKycButton label={status === "PENDING" ? "Relancer la vérification" : "Commencer la vérification"} />
        </div>
      )}
    </div>
  );
}
