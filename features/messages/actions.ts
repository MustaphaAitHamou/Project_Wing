"use server";
import { z } from "zod";
import { action, toActionError } from "@/server/security/action";
import { requireUser } from "@/server/auth/session";
import { getConversation, markConversationRead, sendMessage, setBlock } from "@/server/services/messaging";
import { idSchema } from "@/features/shared/schemas";

export async function sendMessageAction(formData: FormData) {
  try {
    const user = await requireUser();
    const conversationId = idSchema.parse(formData.get("conversationId"));
    const body = String(formData.get("body") ?? "");
    const file = formData.get("file");
    await sendMessage(user.id, conversationId, body, file instanceof File && file.size > 0 ? file : null);
    return { ok: true as const, data: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export const loadConversationAction = action(z.object({ id: idSchema, before: idSchema.optional() }), async ({ id, before }) => {
  const user = await requireUser();
  return getConversation(user.id, id, before);
});

export const markReadAction = action(z.object({ id: idSchema }), async ({ id }) => {
  const user = await requireUser();
  await markConversationRead(user.id, id);
});

export const blockUserAction = action(z.object({ userId: idSchema, block: z.boolean() }), async ({ userId, block }) => {
  const user = await requireUser();
  await setBlock(user.id, userId, block);
});
