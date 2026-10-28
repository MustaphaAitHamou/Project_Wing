"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action, toActionError } from "@/server/security/action";
import { requireUser } from "@/server/auth/session";
import { addParcelPhoto, cancelParcel, removeParcelPhoto, saveParcel } from "@/server/services/parcels";
import { rateLimit } from "@/server/security/rate-limit";
import { saveParcelSchema } from "./schemas";
import { idSchema } from "@/features/shared/schemas";

export const saveParcelAction = action(saveParcelSchema, async (input) => {
  const user = await requireUser();
  await rateLimit(`parcel.save:${user.id}`, 30, 3600);
  const p = await saveParcel(user, input);
  revalidatePath("/tableau-de-bord/colis");
  return { id: p.id, status: p.status };
});

export const cancelParcelAction = action(z.object({ id: idSchema }), async ({ id }) => {
  const user = await requireUser();
  const r = await cancelParcel(user.id, id);
  revalidatePath("/tableau-de-bord/colis");
  return r;
});

export async function uploadParcelPhotoAction(formData: FormData) {
  try {
    const user = await requireUser();
    await rateLimit(`upload:${user.id}`, 40, 3600);
    const id = idSchema.parse(formData.get("parcelId"));
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false as const, error: "Fichier manquant." };
    const photo = await addParcelPhoto(user.id, id, file);
    revalidatePath(`/tableau-de-bord/colis/${id}`);
    return { ok: true as const, data: { id: photo.id } };
  } catch (e) {
    return toActionError(e);
  }
}

export const removeParcelPhotoAction = action(z.object({ photoId: idSchema }), async ({ photoId }) => {
  const user = await requireUser();
  await removeParcelPhoto(user.id, photoId);
});
