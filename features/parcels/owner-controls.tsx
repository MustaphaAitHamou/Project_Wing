"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { useAction } from "@/lib/hooks/use-action";
import { cancelParcelAction, removeParcelPhotoAction, uploadParcelPhotoAction } from "./actions";

export function ParcelOwnerActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const cancel = useAction(cancelParcelAction, { success: (d) => (d.deleted ? "Brouillon supprimé" : "Annonce annulée"), onSuccess: (d) => d.deleted && router.push("/tableau-de-bord/colis") });
  const editable = ["DRAFT", "PUBLISHED", "PENDING_REVIEW"].includes(status);
  const cancellable = ["DRAFT", "PUBLISHED", "PENDING_REVIEW", "EXPIRED"].includes(status);
  return (
    <div className="flex flex-wrap gap-2">
      {editable && <Button asChild variant="outline"><Link href={`/tableau-de-bord/colis/${id}/modifier`}><Pencil />{status === "DRAFT" ? "Compléter et publier" : "Modifier"}</Link></Button>}
      {cancellable && (
        <ConfirmAction label={<><Trash2 />{status === "DRAFT" ? "Supprimer" : "Annuler l'annonce"}</>} variant="ghost" destructive title={status === "DRAFT" ? "Supprimer ce brouillon ?" : "Annuler cette annonce ?"} description="Les propositions en attente seront clôturées." confirmLabel="Confirmer" onConfirm={() => cancel.run({ id })} />
      )}
    </div>
  );
}

export function ParcelPhotosManager({ parcelId, photos, editable }: { parcelId: string; photos: { id: string; url: string }[]; editable: boolean }) {
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);
  const remove = useAction(removeParcelPhotoAction, { success: "Photo supprimée" });
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p, i) => (
        <div key={p.id} className="relative size-24 overflow-hidden rounded-lg border">
          <a href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={`Photo ${i + 1} du colis`} className="size-full object-cover" /></a>
          {editable && <button type="button" onClick={() => remove.run({ photoId: p.id })} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" aria-label={`Supprimer la photo ${i + 1}`}><X className="size-3.5" /></button>}
        </div>
      ))}
      {editable && photos.length < 6 && (
        <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted">
          <ImagePlus className="size-5" aria-hidden />{uploading ? "Envoi…" : "Ajouter"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setUploading(true);
            const fd = new FormData();
            fd.set("parcelId", parcelId);
            fd.set("file", f);
            const r = await uploadParcelPhotoAction(fd);
            setUploading(false);
            if (r.ok) { toast.success("Photo ajoutée"); router.refresh(); } else toast.error(r.error);
          }} />
        </label>
      )}
      {!editable && photos.length === 0 && <p className="text-sm text-muted-foreground">Aucune photo.</p>}
    </div>
  );
}
