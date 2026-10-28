import { notFound } from "next/navigation";
import { requireUserPage } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { PayoutAccountSimulator } from "@/features/dev-buttons";

export default async function SandboxPayoutAccountPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const user = await requireUserPage(`/dev/compte-versement/${accountId}`);
  const a = await db.payoutAccount.findUnique({ where: { providerAccountId: accountId } });
  if (!a || a.userId !== user.id) notFound();
  return (
    <div className="grid gap-5 rounded-2xl border bg-card p-6">
      <h1 className="text-2xl font-bold">Compte de versement simulé</h1>
      <p className="text-sm text-muted-foreground">En production, le voyageur renseigne son identité et son IBAN sur le formulaire hébergé de Stripe Connect. Pays du compte : {a.countryCode}.</p>
      {a.payoutsEnabled ? <p className="text-sm">Compte déjà activé.</p> : <PayoutAccountSimulator accountId={accountId} />}
    </div>
  );
}
