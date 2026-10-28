import { notFound } from "next/navigation";
import { requireUserPage } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { formatMoney } from "@/lib/domain/money";
import { CheckoutSimulator } from "@/features/dev-buttons";

export default async function SandboxCheckoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireUserPage(`/dev/paiement/${sessionId}`);
  const p = await db.payment.findUnique({ where: { providerSessionId: sessionId }, include: { booking: { include: { parcel: { select: { title: true } } } } } });
  if (!p || p.booking.senderId !== user.id) notFound();
  return (
    <div className="grid gap-5 rounded-2xl border bg-card p-6">
      <h1 className="text-2xl font-bold">Paiement simulé</h1>
      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between"><dt>Réservation</dt><dd className="font-mono">{p.booking.reference}</dd></div>
        <div className="flex justify-between"><dt>Objet</dt><dd>{p.booking.parcel.title}</dd></div>
        <div className="flex justify-between text-base font-bold"><dt>Montant</dt><dd>{formatMoney(p.amount, p.currency)}</dd></div>
      </dl>
      {p.status !== "REQUIRES_PAYMENT" ? <p className="text-sm text-muted-foreground">Cette session n&apos;est plus active ({p.status}).</p> : <CheckoutSimulator sessionId={sessionId} />}
      <p className="text-xs text-muted-foreground">L&apos;issue choisie est transmise au même traitement que les webhooks du prestataire réel (idempotence, contrôle du montant, transitions d&apos;état).</p>
    </div>
  );
}
