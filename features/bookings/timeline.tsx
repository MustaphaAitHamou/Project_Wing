import { CheckCircle2, Circle, CircleDot, TriangleAlert } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

const STEPS = [
  { key: "PARCEL_CREATED", label: "Annonce créée" },
  { key: "TRAVELER_SELECTED", label: "Voyageur sélectionné" },
  { key: "BOOKING_CONFIRMED", label: "Réservation confirmée" },
  { key: "PAYMENT_CONFIRMED", label: "Paiement validé" },
  { key: "PICKED_UP", label: "Colis remis au voyageur" },
  { key: "IN_TRANSIT", label: "Transport en cours" },
  { key: "ARRIVED", label: "Colis arrivé" },
  { key: "DELIVERED", label: "Livraison confirmée" },
  { key: "COMPLETED", label: "Transaction clôturée" },
] as const;

const EXTRA: Record<string, string> = { PICKUP_CODE_SENT: "Code de remise envoyé à l'expéditeur", DELIVERY_CODE_SENT: "Code de réception envoyé", INCIDENT_REPORTED: "Incident signalé", CANCELLED: "Réservation annulée", REFUNDED: "Remboursement effectué", OUT_FOR_DELIVERY: "En cours de livraison" };

/** Frise de suivi : uniquement des événements réellement enregistrés (aucune position GPS). */
export function Timeline({ events }: { events: { id: string; type: string; createdAt: Date }[] }) {
  const byType = new Map<string, Date>();
  for (const e of events) if (!byType.has(e.type)) byType.set(e.type, e.createdAt);
  const lastDone = STEPS.reduce((acc, s, i) => (byType.has(s.key) ? i : acc), -1);
  const extras = events.filter((e) => e.type in EXTRA);
  return (
    <div className="grid gap-6">
      <ol className="grid gap-0">
        {STEPS.map((s, i) => {
          const at = byType.get(s.key);
          const current = i === lastDone + 1;
          return (
            <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
              {i < STEPS.length - 1 && <span className={cn("absolute left-[9px] top-6 h-[calc(100%-18px)] w-0.5", at ? "bg-primary" : "bg-border")} aria-hidden />}
              {at ? <CheckCircle2 className="relative size-5 shrink-0 text-primary" aria-hidden /> : current ? <CircleDot className="relative size-5 shrink-0 text-accent" aria-hidden /> : <Circle className="relative size-5 shrink-0 text-border" aria-hidden />}
              <div className="grid">
                <span className={cn("text-sm font-medium", !at && !current && "text-muted-foreground")}>{s.label}{current && <span className="sr-only"> (étape en cours)</span>}</span>
                {at && <time className="text-xs text-muted-foreground tabular" dateTime={new Date(at).toISOString()}>{formatDateTime(at)}</time>}
              </div>
            </li>
          );
        })}
      </ol>
      {extras.length > 0 && (
        <div className="grid gap-1.5 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Journal</p>
          {extras.map((e) => (
            <p key={e.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              {e.type === "INCIDENT_REPORTED" || e.type === "CANCELLED" ? <TriangleAlert className="size-3.5" aria-hidden /> : <Circle className="size-2 fill-current" aria-hidden />}
              {EXTRA[e.type]} · {formatDateTime(e.createdAt)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
