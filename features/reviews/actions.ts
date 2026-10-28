"use server";
import { revalidatePath } from "next/cache";
import { action } from "@/server/security/action";
import { requireUser } from "@/server/auth/session";
import { createReview, reviewSchema } from "@/server/services/reviews";

export const createReviewAction = action(reviewSchema, async (input) => {
  const user = await requireUser();
  await createReview(user.id, input);
  revalidatePath(`/tableau-de-bord/reservations/${input.bookingId}`);
});
