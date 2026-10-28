"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/hooks/use-action";
import { disputeMessageAction, uploadEvidenceAction } from "./actions";

export function DisputeComposer({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [note, setNote] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const m = useAction(disputeMessageAction, { success: "Message ajouté", onSuccess: () => setNote("") });
  return (
    <div className="grid gap-3 border-t pt-4">
      <Field id="dispute-note" label="Ajouter un message"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="flex flex-wrap gap-2">
        <Button loading={m.pending} disabled={note.trim().length < 2} onClick={() => m.run({ disputeId, note })}>Envoyer</Button>
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-semibold hover:bg-muted">
          <Paperclip className="size-4" />{uploading ? "Envoi…" : "Ajouter une photo ou un PDF"}
          <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={uploading} onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setUploading(true);
            const fd = new FormData();
            fd.set("disputeId", disputeId);
            fd.set("file", f);
            const r = await uploadEvidenceAction(fd);
            setUploading(false);
            if (r.ok) { toast.success("Pièce ajoutée"); router.refresh(); } else toast.error(r.error);
          }} />
        </label>
      </div>
    </div>
  );
}
