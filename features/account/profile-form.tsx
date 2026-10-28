"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { useAction } from "@/lib/hooks/use-action";
import { updateProfileAction, uploadAvatarAction } from "./actions";

export function ProfileForm({ initial }: { initial: { firstName: string; lastName: string; phone: string; bio: string; city: string; image: string | null; email: string } }) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [uploading, setUploading] = React.useState(false);
  const save = useAction(updateProfileAction, { success: "Profil enregistré" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const fe = save.fieldErrors;
  return (
    <form className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-7" onSubmit={(e) => { e.preventDefault(); void save.run({ firstName: v.firstName, lastName: v.lastName, phone: v.phone, bio: v.bio || undefined, city: v.city || undefined }); }}>
      <div className="flex items-center gap-4">
        <Avatar name={`${v.firstName} ${v.lastName}`} src={initial.image} size={64} />
        <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border px-4 text-sm font-semibold hover:bg-muted">
          {uploading ? "Envoi…" : "Changer la photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setUploading(true);
            const fd = new FormData();
            fd.set("file", f);
            const r = await uploadAvatarAction(fd);
            setUploading(false);
            if (r.ok) { toast.success("Photo mise à jour"); router.refresh(); } else toast.error(r.error);
          }} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="firstName" label="Prénom" error={fe.firstName?.[0]}><Input value={v.firstName} onChange={set("firstName")} autoComplete="given-name" /></Field>
        <Field id="lastName" label="Nom" error={fe.lastName?.[0]}><Input value={v.lastName} onChange={set("lastName")} autoComplete="family-name" /></Field>
        <Field id="email" label="Email" hint="Pour changer d'email, contactez le support."><Input value={initial.email} disabled /></Field>
        <Field id="phone" label="Téléphone" error={fe.phone?.[0]}><Input type="tel" value={v.phone} onChange={set("phone")} autoComplete="tel" /></Field>
        <Field id="city" label="Ville (approximative)" optional className="sm:col-span-2" error={fe.city?.[0]}><Input value={v.city} onChange={set("city")} placeholder="ex. Marseille" /></Field>
        <Field id="bio" label="Présentation" optional className="sm:col-span-2" error={fe.bio?.[0]}><Textarea rows={4} maxLength={600} value={v.bio} onChange={set("bio")} placeholder="Quelques mots sur vous, vos trajets habituels…" /></Field>
      </div>
      <div className="flex justify-end"><Button type="submit" loading={save.pending}>Enregistrer</Button></div>
    </form>
  );
}
