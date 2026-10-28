import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUserPage } from "@/server/auth/session";
import { getConversation } from "@/server/services/messaging";
import { AppError } from "@/server/security/errors";
import { ChatThread } from "@/features/messages/chat-thread";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/tableau-de-bord/messages/${id}`);
  try {
    const conv = await getConversation(user.id, id);
    return <ChatThread conv={conv} />;
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}
