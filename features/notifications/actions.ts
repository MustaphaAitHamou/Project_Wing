"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action } from "@/server/security/action";
import { requireUser } from "@/server/auth/session";
import { markRead, notificationPrefsSchema, updatePrefs } from "@/server/services/notifications";
import { idSchema } from "@/features/shared/schemas";

export const markNotificationsReadAction = action(z.object({ ids: z.union([z.literal("all"), z.array(idSchema).max(100)]) }), async ({ ids }) => {
  const user = await requireUser();
  await markRead(user.id, ids);
  revalidatePath("/tableau-de-bord", "layout");
});

export const updateNotificationPrefsAction = action(z.object({ prefs: notificationPrefsSchema }), async ({ prefs }) => {
  const user = await requireUser();
  await updatePrefs(user.id, prefs);
});
