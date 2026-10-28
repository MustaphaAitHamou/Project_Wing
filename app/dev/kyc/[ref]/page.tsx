import { notFound } from "next/navigation";
import { requireUserPage } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { KycSimulator } from "@/features/dev-buttons";

export default async function SandboxKycPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const user = await requireUserPage(`/dev/kyc/${ref}`);
  const v = await db.identityVerification.findUnique({ where: { providerRef: ref } });
  if (!v || v.userId !== user.id) notFound();
  return (
    <div className="grid gap-5 rounded-2xl border bg-card p-6">
      <h1 className="text-2xl font-bold">Vérification d&apos;identité simulée</h1>
      <p className="text-sm text-muted-foreground">En production, cette étape est réalisée sur la page sécurisée du prestataire (Stripe Identity) : photo d&apos;une pièce d&apos;identité et selfie. Tamurt Sending ne reçoit que le résultat.</p>
      {v.status === "PENDING" ? <KycSimulator refId={ref} /> : <p className="text-sm">Statut actuel : {v.status}</p>}
    </div>
  );
}
