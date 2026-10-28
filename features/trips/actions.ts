"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action } from "@/server/security/action";
import { requireUser } from "@/server/auth/session";
import { cancelTrip, saveTrip } from "@/server/services/trips";
import { rateLimit } from "@/server/security/rate-limit";
import { saveTripSchema } from "./schemas";
import { idSchema } from "@/features/shared/schemas";

export const saveTripAction = action(saveTripSchema, async (input) => {
  const user = await requireUser();
  await rateLimit(`trip.save:${user.id}`, 30, 3600);
  const t = await saveTrip(user, input);
  revalidatePath("/tableau-de-bord/trajets");
  return { id: t.id };
});

export const cancelTripAction = action(z.object({ id: idSchema }), async ({ id }) => {
  const user = await requireUser();
  await cancelTrip(user.id, id);
  revalidatePath("/tableau-de-bord/trajets");
});
