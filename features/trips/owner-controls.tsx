"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { useAction } from "@/lib/hooks/use-action";
import { cancelTripAction } from "./actions";

export function TripOwnerActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const cancel = useAction(cancelTripAction, { success: "Trajet annulé", onSuccess: () => router.push("/tableau-de-bord/trajets") });
  if (!["PUBLISHED", "FULL", "DRAFT", "EXPIRED"].includes(status)) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "EXPIRED" && <Button asChild variant="outline"><Link href={`/tableau-de-bord/trajets/${id}/modifier`}><Pencil />Modifier</Link></Button>}
      <ConfirmAction label={<><Trash2 />Annuler le trajet</>} variant="ghost" destructive title="Annuler ce trajet ?" description="Impossible si des réservations sont en cours. Les demandes en attente seront clôturées." onConfirm={() => cancel.run({ id })} />
    </div>
  );
}
