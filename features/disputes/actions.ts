"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action, toActionError } from "@/server/security/action";
import { requireUser } from "@/server/auth/session";
import { addDisputeEvidence, addDisputeMessage, openDispute, openDisputeSchema } from "@/server/services/disputes";
import { rateLimit } from "@/server/security/rate-limit";
import { idSchema } from "@/features/shared/schemas";

export const openDisputeAction = action(openDisputeSchema, async (input) => {
  const user = await requireUser();
  await rateLimit(`dispute:${user.id}`, 5, 3600);
  const d = await openDispute(user.id, input);
  revalidatePath(`/tableau-de-bord/reservations/${input.bookingId}`);
  return { id: d.id };
});

export const disputeMessageAction = action(z.object({ disputeId: idSchema, note: z.string().trim().min(2).max(4000) }), async ({ disputeId, note }) => {
  const user = await requireUser();
  await addDisputeMessage(user.id, disputeId, note);
  revalidatePath(`/tableau-de-bord/litiges/${disputeId}`);
});

export async function uploadEvidenceAction(formData: FormData) {
  try {
    const user = await requireUser();
    await rateLimit(`upload:${user.id}`, 40, 3600);
    const disputeId = idSchema.parse(formData.get("disputeId"));
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false as const, error: "Fichier manquant." };
    await addDisputeEvidence(user.id, disputeId, file);
    revalidatePath(`/tableau-de-bord/litiges/${disputeId}`);
    return { ok: true as const, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}
