import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MessageSquare, Phone, ShieldCheck } from "lucide-react";
import { requireUserPage } from "@/server/auth/session";
import { getBookingDetail } from "@/server/services/bookings";
import { paymentSummary } from "@/server/payments/service";
import { AppError } from "@/server/security/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Avatar, PageHeader, Stars } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/components/dashboard/status";
import { Timeline } from "@/features/bookings/timeline";
import { CancelBookingButton, CodeEntry, ConfirmReceipt, PaymentReturnNotice, PayButton, PickupQr, ResendCode, TravelerStepButton } from "@/features/bookings/booking-actions";
import { ReviewForm } from "@/features/reviews/review-form";
import { OpenDisputeButton } from "@/features/disputes/open-dispute";
import { CANCELLABLE_STATES, DISPUTABLE_STATES } from "@/lib/domain/booking-state";
import { formatMoney } from "@/lib/domain/money";
import { gramsToKgLabel } from "@/lib/domain/units";
import { formatDate, formatDateTime } from "@/lib/utils";
import { usesLocalSandbox } from "@/lib/env";

export const metadata: Metadata = { title: "Réservation" };

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paiement?: string }> }) {
  const { id } = await params;
  const { paiement } = await searchParams;
  const user = await requireUserPage(`/tableau-de-bord/reservations/${id}`);
  let b;
  try {
    b = await getBookingDetail(user.id, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const isSender = b.role === "SENDER";
  const other = isSender ? b.traveler : b.sender;
  const otherRating = other.profile?.ratingCount ? other.profile.ratingSum / other.profile.ratingCount : null;
  const payments = isSender ? await paymentSummary(user.id, id) : null;
  const paid = !!payments?.some((p) => p.status === "SUCCEEDED");
  const s = b.status;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><BookingStatusBadge status={s} /><span className="font-mono">{b.reference}</span></div>}
        title={b.parcel.title}
        description={`${b.parcel.originCity.name} → ${b.parcel.destCity.name} · départ du voyageur le ${formatDate(b.trip.departureDate, { day: "numeric", month: "long" })}`}
        actions={b.conversation ? <Button asChild variant="outline"><Link href={`/tableau-de-bord/messages/${b.conversation.id}`}><MessageSquare />Messagerie</Link></Button> : null}
      />
      <PaymentReturnNotice status={paiement} />

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="grid content-start gap-6">
          {/* Prochaine étape */}
          <Card className="border-primary/30">
            <CardHeader><CardTitle>Prochaine étape</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm">
              {s === "AWAITING_VERIFICATION" && (
                <Alert tone="warning" title="Vérification d'identité requise">
                  {user.kycStatus !== "VERIFIED" ? <>Vérifiez votre identité pour débloquer cette réservation : <Link href="/tableau-de-bord/parametres/verification">lancer la vérification</Link>.</> : "Nous attendons la vérification d'identité de l'autre partie. Vous serez notifié."}
                </Alert>
              )}
              {(s === "ACCEPTED" || s === "AWAITING_PAYMENT") && (isSender ? (
                <div className="grid gap-3">
                  <p>Réglez la réservation pour la confirmer. Le voyageur ne sera rémunéré qu&apos;après la livraison confirmée par le code du destinataire.</p>
                  {usesLocalSandbox && <Alert tone="warning">Environnement de test : le paiement est simulé, aucune carte n&apos;est débitée.</Alert>}
                  <div><PayButton bookingId={b.id} label={`Payer ${formatMoney(b.totalCharged, b.currency)}`} /></div>
                </div>
              ) : <p>En attente du paiement de l&apos;expéditeur. Vous serez notifié dès sa confirmation.</p>)}
              {s === "READY_FOR_PICKUP" && (isSender ? (
                <div className="grid gap-3">
                  <p>Vous avez reçu par email votre <strong>code de remise</strong>. Rencontrez le voyageur, vérifiez ensemble le contenu, puis donnez-lui le code (ou montrez le QR code). Le code expire le {b.otp.pickup ? formatDateTime(b.otp.pickup.expiresAt) : "-"}.</p>
                  <div className="flex flex-wrap gap-2"><PickupQr bookingId={b.id} />{b.otp.pickup && b.otp.pickup.sendsLeft > 0 && <ResendCode bookingId={b.id} purpose="PICKUP" label="Renvoyer le code par email" />}</div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <p>Au moment de la remise, vérifiez le contenu avec l&apos;expéditeur. Refusez tout objet interdit ou non conforme. Saisissez ensuite le code qu&apos;il vous communique, ou scannez son QR code avec l&apos;appareil photo de votre téléphone.</p>
                  <CodeEntry bookingId={b.id} purpose="PICKUP" />
                  {b.otp.pickup && <p className="text-xs text-muted-foreground">{b.otp.pickup.attemptsLeft} essai(s) restant(s).</p>}
                </div>
              ))}
              {s === "PICKED_UP" && (isSender ? <p>Le voyageur a récupéré votre colis. Il indiquera son départ puis son arrivée.</p> : <div className="grid gap-3"><p>Indiquez votre départ lorsque vous êtes en route.</p><div><TravelerStepButton bookingId={b.id} step="transit" /></div></div>)}
              {s === "IN_TRANSIT" && (isSender ? <p>Votre colis est en route.</p> : <div className="grid gap-3"><p>Une fois arrivé, confirmez votre arrivée : le destinataire recevra son code de réception.</p><div><TravelerStepButton bookingId={b.id} step="arrived" /></div></div>)}
              {s === "OUT_FOR_DELIVERY" && (isSender ? (
                <div className="grid gap-3">
                  <p>Le voyageur est arrivé. Le destinataire a reçu son code de réception{b.parcel.recipient?.email ? " par email" : " (envoyé à votre adresse, car aucun email destinataire n'a été fourni : transmettez-le-lui)"}.</p>
                  {b.otp.delivery && b.otp.delivery.sendsLeft > 0 && <div><ResendCode bookingId={b.id} purpose="DELIVERY" label="Renvoyer le code de réception" /></div>}
                </div>
              ) : (
                <div className="grid gap-3"><p>Remettez le colis au destinataire, puis saisissez le code qu&apos;il vous donne.</p><CodeEntry bookingId={b.id} purpose="DELIVERY" />{b.otp.delivery && b.otp.delivery.sendsLeft > 0 && <div><ResendCode bookingId={b.id} purpose="DELIVERY" label="Le destinataire n'a pas reçu le code" /></div>}</div>
              ))}
              {s === "DELIVERED" && (isSender ? <div className="grid gap-3"><p>Le destinataire a confirmé la réception. Confirmez que tout est en ordre pour clôturer, ou signalez un problème. Sans action de votre part, la transaction sera clôturée automatiquement après quelques jours.</p><div><ConfirmReceipt bookingId={b.id} /></div></div> : <p>Livraison confirmée. La transaction sera clôturée par l&apos;expéditeur ou automatiquement, puis votre versement sera déclenché.</p>)}
              {s === "COMPLETED" && (b.myReview ? <Alert tone="success">Transaction terminée. Merci pour votre avis ({b.myReview.rating}/5).</Alert> : <ReviewForm bookingId={b.id} subjectName={other.firstName} />)}
              {s === "DISPUTED" && <Alert tone="danger" title="Litige en cours">La transaction est gelée. <Link href={`/tableau-de-bord/litiges/${b.disputes[0]?.id}`}>Suivre le litige</Link>.</Alert>}
              {s === "CANCELLED" && <Alert tone="info">Réservation annulée{b.cancelReason ? ` : ${b.cancelReason}` : ""}.{paid ? " Le remboursement est en cours auprès du prestataire de paiement." : ""}</Alert>}
              {s === "REFUNDED" && <Alert tone="info">Réservation annulée et remboursée.</Alert>}

              <div className="flex flex-wrap gap-2 border-t pt-4">
                {(CANCELLABLE_STATES as readonly string[]).includes(s) && <CancelBookingButton bookingId={b.id} paid={paid} />}
                {(DISPUTABLE_STATES as readonly string[]).includes(s) && <OpenDisputeButton bookingId={b.id} />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Suivi</CardTitle></CardHeader>
            <CardContent><Timeline events={b.events} /></CardContent>
          </Card>

          {b.theirReview && (
            <Card>
              <CardHeader><CardTitle>Avis reçu</CardTitle></CardHeader>
              <CardContent className="grid gap-1 text-sm"><Stars value={b.theirReview.rating} />{b.theirReview.comment && <p>« {b.theirReview.comment} »</p>}</CardContent>
            </Card>
          )}
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader><CardTitle>{isSender ? "Votre voyageur" : "Votre expéditeur"}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Link href={`/profil/${other.id}`} className="flex items-center gap-3 hover:opacity-80">
                <Avatar name={other.firstName} src={other.image} />
                <div className="grid">
                  <span className="flex items-center gap-1.5 font-semibold">{other.firstName} {other.lastName.slice(0, 1)}.{other.profile?.kycStatus === "VERIFIED" && <BadgeCheck className="size-4 text-primary" aria-label="Identité vérifiée" />}</span>
                  <Stars value={otherRating} count={other.profile?.ratingCount} />
                </div>
              </Link>
              {other.phone ? <p className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{other.phone}</p> : <p className="text-xs text-muted-foreground">Le numéro de téléphone est partagé après le paiement.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Montants</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-1.5 text-sm tabular">
                <div className="flex justify-between"><dt>Prix du transport</dt><dd>{formatMoney(b.transportPrice, b.currency)}</dd></div>
                <div className="flex justify-between text-muted-foreground"><dt>Frais de plateforme ({b.commissionRateBps / 100} %)</dt><dd>{formatMoney(b.platformFee, b.currency)}</dd></div>
                {isSender ? (
                  <div className="flex justify-between border-t pt-1.5 font-semibold"><dt>Total payé par vous</dt><dd>{formatMoney(b.totalCharged, b.currency)}</dd></div>
                ) : (
                  <>
                    <div className="flex justify-between border-t pt-1.5 font-semibold"><dt>Montant net estimé</dt><dd>{formatMoney(b.travelerNet, b.currency)}</dd></div>
                    <p className="text-xs text-muted-foreground">Hors éventuels frais du prestataire de paiement. Versement : {b.payout ? { PENDING: "en attente", BLOCKED: `bloqué (${b.payout.blockedReason})`, PROCESSING: "en cours", PAID: "effectué", FAILED: "échec, nouvel essai prévu", CANCELLED: "annulé" }[b.payout.status] : "après clôture"}.</p>
                  </>
                )}
              </dl>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" />Montants figés à l&apos;acceptation de la proposition.</p>
              {payments && payments.length > 0 && (
                <div className="mt-4 grid gap-1 border-t pt-3 text-xs text-muted-foreground">
                  {payments.map((p) => <p key={p.id}>{formatDateTime(p.createdAt)} · {formatMoney(p.amount, p.currency)} · {{ REQUIRES_PAYMENT: "en attente", PROCESSING: "en cours", SUCCEEDED: "payé", FAILED: "échoué", CANCELLED: "abandonné", REFUNDED: "remboursé", PARTIALLY_REFUNDED: "partiellement remboursé" }[p.status]}{p.receiptNumber ? ` · reçu ${p.receiptNumber}` : ""}</p>)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Colis</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p>{b.parcel.category.name} · {gramsToKgLabel(b.parcel.weightGrams)} · {b.parcel.lengthCm}×{b.parcel.widthCm}×{b.parcel.heightCm} cm{b.parcel.isFragile ? " · fragile" : ""}</p>
              <p className="text-muted-foreground">{b.parcel.description}</p>
              {b.parcel.recipient ? (
                <div className="mt-2 grid gap-0.5 rounded-lg bg-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinataire</p>
                  <p className="font-medium">{b.parcel.recipient.name}</p>
                  <p>{b.parcel.recipient.city} · {b.parcel.recipient.phone}</p>
                  {b.parcel.recipient.instructions && <p className="text-muted-foreground">{b.parcel.recipient.instructions}</p>}
                </div>
              ) : <p className="text-xs text-muted-foreground">Les coordonnées du destinataire seront visibles après le paiement.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
