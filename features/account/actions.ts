"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action, toActionError } from "@/server/security/action";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { startIdentityVerification } from "@/server/kyc";
import { startPayoutOnboarding } from "@/server/payments/service";
import { putObject, deleteObject, validateUpload } from "@/server/storage";
import { phoneSchema } from "@/features/auth/schemas";

export const updateProfileAction = action(
  z.object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    phone: phoneSchema,
    bio: z.string().trim().max(600).optional(),
    city: z.string().trim().max(120).optional(),
  }),
  async (d) => {
    const user = await requireUser();
    await db.user.update({ where: { id: user.id }, data: { firstName: d.firstName, lastName: d.lastName, name: `${d.firstName} ${d.lastName}`, phone: d.phone } });
    await db.userProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, bio: d.bio, city: d.city }, update: { bio: d.bio ?? null, city: d.city ?? null } });
    revalidatePath("/tableau-de-bord", "layout");
  },
);

export async function uploadAvatarAction(formData: FormData) {
  try {
    const user = await requireUser();
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false as const, error: "Fichier manquant." };
    const { bytes, mime } = await validateUpload(file, "image");
    if (bytes.byteLength > 2 * 1024 * 1024) return { ok: false as const, error: "Image trop lourde (2 Mo maximum)." };
    const key = await putObject("avatars", bytes, mime);
    const prev = await db.userProfile.findUnique({ where: { userId: user.id }, select: { avatarKey: true } });
    // Les avatars sont publics : servis via une route dédiée et stable.
    await db.userProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, avatarKey: key }, update: { avatarKey: key } });
    await db.user.update({ where: { id: user.id }, data: { image: `/api/avatars/${user.id}?v=${Date.now().toString(36)}` } });
    if (prev?.avatarKey) await deleteObject(prev.avatarKey).catch(() => undefined);
    revalidatePath("/tableau-de-bord", "layout");
    return { ok: true as const, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export const startKycAction = action(z.object({}), async () => {
  const user = await requireUser();
  return startIdentityVerification(user.id);
});

export const startPayoutOnboardingAction = action(z.object({ countryCode: z.string().length(2) }), async ({ countryCode }) => {
  const user = await requireUser();
  return startPayoutOnboarding(user.id, countryCode);
});
