"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, KeyRound, MapPinCheck, PackageCheck, QrCode, RefreshCw, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { useAction } from "@/lib/hooks/use-action";
import { cancelBookingAction, confirmReceiptAction, markArrivedAction, markInTransitAction, payBookingAction, pickupQrAction, resendCodeAction, verifyCodeAction } from "./actions";

export function PayButton({ bookingId, label }: { bookingId: string; label: string }) {
  const pay = useAction(payBookingAction, { refresh: false, onSuccess: (d) => { window.location.href = d.url; } });
  return <Button size="lg" loading={pay.pending} onClick={() => pay.run({ bookingId })}><CreditCard />{label}</Button>;
}

export function CancelBookingButton({ bookingId, paid }: { bookingId: string; paid: boolean }) {
  const c = useAction(cancelBookingAction, { success: paid ? "Réservation annulée, remboursement demandé" : "Réservation annulée" });
  return (
    <ConfirmAction label={<><XCircle />Annuler la réservation</>} variant="ghost" destructive title="Annuler la réservation ?" description={paid ? "Le remboursement intégral sera demandé au prestataire de paiement. Le délai d'apparition dépend de votre banque." : "Le colis redeviendra disponible pour d'autres voyageurs."} reason={{ label: "Motif", required: true }} confirmLabel="Annuler la réservation" onConfirm={(reason) => c.run({ bookingId, reason })} />
  );
}

export function CodeEntry({ bookingId, purpose }: { bookingId: string; purpose: "PICKUP" | "DELIVERY" }) {
  const [code, setCode] = React.useState("");
  const v = useAction(verifyCodeAction, { success: purpose === "PICKUP" ? "Remise confirmée" : "Livraison confirmée" });
  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); void v.run({ bookingId, purpose, code }).then((r) => r !== null && setCode("")); }}>
      <Field id={`code-${purpose}`} label={purpose === "PICKUP" ? "Code de remise donné par l'expéditeur" : "Code de réception donné par le destinataire"} error={v.fieldErrors.code?.[0]}>
        <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="text-center font-mono text-xl tracking-[0.5em]" />
      </Field>
      <Button type="submit" size="lg" loading={v.pending} disabled={code.length !== 6}><KeyRound />Valider le code</Button>
    </form>
  );
}

export function ResendCode({ bookingId, purpose, label }: { bookingId: string; purpose: "PICKUP" | "DELIVERY"; label: string }) {
  const r = useAction(resendCodeAction, { success: "Nouveau code envoyé" });
  return <Button variant="outline" size="sm" loading={r.pending} onClick={() => r.run({ bookingId, purpose })}><RefreshCw />{label}</Button>;
}

export function PickupQr({ bookingId }: { bookingId: string }) {
  const [svg, setSvg] = React.useState<string | null>(null);
  const qr = useAction(pickupQrAction, { refresh: false, onSuccess: (d) => setSvg(d.svg) });
  return (
    <Dialog onOpenChange={(o) => { if (o) void qr.run({ bookingId }); else setSvg(null); }}>
      <DialogTrigger asChild><Button variant="outline"><QrCode />Afficher le QR code de remise</Button></DialogTrigger>
      <DialogContent title="QR code de remise" description="Le voyageur le scanne avec son téléphone au moment de la remise. Il remplace la saisie du code.">
        {svg ? <div className="mx-auto w-64 rounded-xl bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="mx-auto size-64 animate-pulse rounded-xl bg-muted" />}
        <Alert tone="warning">Ne montrez ce QR code qu&apos;au moment de remettre le colis, après vérification du contenu avec le voyageur.</Alert>
      </DialogContent>
    </Dialog>
  );
}

export function TravelerStepButton({ bookingId, step }: { bookingId: string; step: "transit" | "arrived" }) {
  const t = useAction(markInTransitAction, { success: "Statut mis à jour : en transport" });
  const a = useAction(markArrivedAction, { success: "Arrivée enregistrée. Le destinataire reçoit son code." });
  if (step === "transit") return <Button size="lg" loading={t.pending} onClick={() => t.run({ bookingId })}><Truck />Je suis en route</Button>;
  return <ConfirmAction label={<><MapPinCheck />Je suis arrivé, prêt à livrer</>} variant="default" title="Confirmer votre arrivée ?" description="Le code de réception sera envoyé au destinataire. Vous le saisirez lors de la remise." onConfirm={() => a.run({ bookingId })} />;
}

export function ConfirmReceipt({ bookingId }: { bookingId: string }) {
  const c = useAction(confirmReceiptAction, { success: "Transaction terminée. Merci !" });
  return <ConfirmAction label={<><PackageCheck />Confirmer la bonne réception</>} variant="default" title="Tout s'est bien passé ?" description="La transaction sera clôturée et le voyageur sera payé. En cas de problème, ouvrez plutôt un litige." confirmLabel="Oui, clôturer" onConfirm={() => c.run({ bookingId })} />;
}

export function PaymentReturnNotice({ status }: { status: string | undefined }) {
  const router = useRouter();
  React.useEffect(() => {
    if (status === "retour") {
      toast.info("Paiement en cours de confirmation par le prestataire…");
      const t = setInterval(() => router.refresh(), 2500);
      const stop = setTimeout(() => clearInterval(t), 30_000);
      return () => { clearInterval(t); clearTimeout(stop); };
    }
  }, [status, router]);
  if (status === "annule") return <Alert tone="warning">Paiement interrompu. Vous pouvez réessayer quand vous voulez.</Alert>;
  return null;
}
