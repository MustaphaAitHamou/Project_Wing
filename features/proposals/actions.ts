"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action } from "@/server/security/action";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";
import { acceptProposal, createProposal, createProposalSchema, rejectProposal, updateProposal, withdrawProposal } from "@/server/services/proposals";
import { idSchema, moneyInput } from "@/features/shared/schemas";

export const createProposalAction = action(createProposalSchema, async (input) => {
  const user = await requireUser();
  await rateLimit(`proposal:${user.id}`, 30, 3600);
  const p = await createProposal(user, input);
  revalidatePath("/tableau-de-bord");
  return { id: p.id };
});

export const updateProposalAction = action(z.object({ id: idSchema, price: moneyInput("Prix", { min: 500, max: 500_000 }), message: z.string().trim().max(1000).optional() }), async ({ id, price, message }) => {
  const user = await requireUser();
  await updateProposal(user.id, id, { price, message });
  revalidatePath("/tableau-de-bord");
});

export const withdrawProposalAction = action(z.object({ id: idSchema }), async ({ id }) => {
  const user = await requireUser();
  await withdrawProposal(user.id, id);
  revalidatePath("/tableau-de-bord");
});

export const rejectProposalAction = action(z.object({ id: idSchema }), async ({ id }) => {
  const user = await requireUser();
  await rejectProposal(user.id, id);
  revalidatePath("/tableau-de-bord");
});

export const acceptProposalAction = action(z.object({ id: idSchema }), async ({ id }) => {
  const user = await requireUser();
  const b = await acceptProposal(user, id);
  revalidatePath("/tableau-de-bord");
  return { bookingId: b.id };
});
