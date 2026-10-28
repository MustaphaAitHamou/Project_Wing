import "server-only";
import { db, type Tx } from "@/server/db/client";
import { notify } from "@/server/services/notifications";
import { rateLimit } from "@/server/security/rate-limit";
import { forbidden, invalid, notFound } from "@/server/security/errors";
import { putObject, signedUrl, validateUpload } from "@/server/storage";
import { audit } from "@/server/audit";

/** Canal PostgreSQL LISTEN/NOTIFY utilisé pour pousser les messages en temps réel (SSE). */
export const REALTIME_CHANNEL = "tamurt_realtime";

export async function ensureConversation(tx: Tx, userIds: [string, string], ctx: { parcelId: string; tripId?: string }) {
  const [a, b] = [...userIds].sort() as [string, string];
  const contextKey = `parcel:${ctx.parcelId}:${a}:${b}`;
  const conv = await tx.conversation.upsert({
    where: { contextKey },
    create: { contextKey, parcelId: ctx.parcelId, tripId: ctx.tripId, participants: { create: [{ userId: a }, { userId: b }] } },
    update: ctx.tripId ? { tripId: ctx.tripId } : {},
  });
  return conv;
}

async function signalRealtime(tx: Tx | typeof db, payload: { kind: "message"; conversationId: string; userIds: string[] }) {
  await tx.$executeRaw`SELECT pg_notify(${REALTIME_CHANNEL}, ${JSON.stringify(payload)})`;
}

/** Message posté au nom d'un utilisateur dans une transaction métier (ex. message joint à une proposition). */
export async function postSystemlessMessage(tx: Tx, conversationId: string, senderId: string, body: string) {
  const now = new Date();
  await tx.message.create({ data: { conversationId, senderId, body } });
  await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } });
  await tx.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId: senderId } }, data: { lastReadAt: now } });
  const parts = await tx.conversationParticipant.findMany({ where: { conversationId }, select: { userId: true } });
  await signalRealtime(tx, { kind: "message", conversationId, userIds: parts.map((p) => p.userId) });
}

async function assertParticipant(userId: string, conversationId: string) {
  const p = await db.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
  if (!p) throw notFound();
  return p;
}

export async function listConversations(userId: string) {
  const parts = await db.conversationParticipant.findMany({
    where: { userId },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    take: 100,
    include: {
      conversation: {
        include: {
          participants: { include: { user: { select: { id: true, firstName: true, lastName: true, image: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, where: { isHidden: false } },
          booking: { select: { id: true, reference: true, status: true } },
        },
      },
    },
  });
  const parcelIds = [...new Set(parts.map((p) => p.conversation.parcelId).filter(Boolean))] as string[];
  const parcels = await db.parcel.findMany({ where: { id: { in: parcelIds } }, select: { id: true, title: true } });
  const titles = new Map(parcels.map((p) => [p.id, p.title]));
  return parts.map((p) => {
    const other = p.conversation.participants.find((x) => x.userId !== userId)?.user;
    const last = p.conversation.messages[0];
    return {
      id: p.conversationId,
      other: other ? { id: other.id, name: `${other.firstName} ${other.lastName.slice(0, 1)}.`, image: other.image } : null,
      parcelTitle: p.conversation.parcelId ? titles.get(p.conversation.parcelId) ?? null : null,
      booking: p.conversation.booking,
      lastMessage: last ? { body: last.body, at: last.createdAt, mine: last.senderId === userId, hasAttachment: !!last.attachmentKey } : null,
      unread: !!last && last.senderId !== userId && (!p.lastReadAt || p.lastReadAt < last.createdAt),
      lastMessageAt: p.conversation.lastMessageAt,
    };
  });
}

export async function getConversation(userId: string, conversationId: string, before?: string) {
  await assertParticipant(userId, conversationId);
  const conv = await db.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { participants: { include: { user: { select: { id: true, firstName: true, lastName: true, image: true } } } }, booking: { select: { id: true, reference: true, status: true } } },
  });
  const messages = await db.message.findMany({
    where: { conversationId, ...(before ? { createdAt: { lt: (await db.message.findUnique({ where: { id: before } }))?.createdAt ?? new Date() } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const other = conv.participants.find((p) => p.userId !== userId);
  const otherLastRead = other?.lastReadAt ?? null;
  const blocked = other ? await db.userBlock.findFirst({ where: { OR: [{ blockerId: userId, blockedId: other.userId }, { blockerId: other.userId, blockedId: userId }] } }) : null;
  const parcel = conv.parcelId ? await db.parcel.findUnique({ where: { id: conv.parcelId }, select: { id: true, title: true } }) : null;
  return {
    id: conv.id,
    parcel,
    booking: conv.booking,
    other: other ? { id: other.user.id, name: `${other.user.firstName} ${other.user.lastName.slice(0, 1)}.`, image: other.user.image } : null,
    blockedByMe: !!blocked && blocked.blockerId === userId,
    blockedByOther: !!blocked && blocked.blockerId !== userId,
    messages: await Promise.all(
      messages.reverse().map(async (m) => ({
        id: m.id,
        body: m.isHidden ? "Message masqué par la modération." : m.body,
        hidden: m.isHidden,
        mine: m.senderId === userId,
        at: m.createdAt.toISOString(),
        read: m.senderId === userId && !!otherLastRead && otherLastRead >= m.createdAt,
        attachment: m.attachmentKey && !m.isHidden ? { url: await signedUrl(m.attachmentKey, 900), name: m.attachmentName ?? "pièce jointe", mime: m.attachmentMime ?? "" } : null,
      })),
    ),
    hasMore: messages.length === 50,
  };
}

export async function sendMessage(userId: string, conversationId: string, body: string, file?: File | null) {
  await assertParticipant(userId, conversationId);
  await rateLimit(`msg:${userId}`, 30, 60);
  const text = body.trim();
  if (!text && !file) throw invalid("Message vide.");
  if (text.length > 4000) throw invalid("Message trop long (4000 caractères maximum).");
  const others = await db.conversationParticipant.findMany({ where: { conversationId, userId: { not: userId } }, select: { userId: true } });
  const otherId = others[0]?.userId;
  if (otherId) {
    const blocked = await db.userBlock.count({ where: { OR: [{ blockerId: userId, blockedId: otherId }, { blockerId: otherId, blockedId: userId }] } });
    if (blocked) throw forbidden("Vous ne pouvez plus échanger avec cet utilisateur.");
  }
  let attachment: { key: string; mime: string; name: string } | null = null;
  if (file && file.size > 0) {
    const { bytes, mime } = await validateUpload(file, "document");
    attachment = { key: await putObject("messages", bytes, mime), mime, name: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 100) || "fichier" };
  }
  const me = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { firstName: true } });
  return db.$transaction(async (tx) => {
    const now = new Date();
    const msg = await tx.message.create({ data: { conversationId, senderId: userId, body: text, attachmentKey: attachment?.key, attachmentMime: attachment?.mime, attachmentName: attachment?.name } });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } });
    await tx.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: now } });
    if (otherId) {
      // Une seule notification tant que les messages précédents ne sont pas lus.
      const pendingNotif = await tx.notification.count({ where: { userId: otherId, type: "NEW_MESSAGE", readAt: null, data: { path: ["conversationId"], equals: conversationId } } });
      if (!pendingNotif) await notify(tx, { userId: otherId, type: "NEW_MESSAGE", title: `Nouveau message de ${me.firstName}`, body: text ? text.slice(0, 140) : "Pièce jointe", link: `/tableau-de-bord/messages/${conversationId}`, data: { conversationId } });
    }
    await signalRealtime(tx, { kind: "message", conversationId, userIds: [userId, ...(otherId ? [otherId] : [])] });
    return msg;
  });
}

export async function markConversationRead(userId: string, conversationId: string) {
  await assertParticipant(userId, conversationId);
  const now = new Date();
  await db.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: now } });
  await db.notification.updateMany({ where: { userId, type: "NEW_MESSAGE", readAt: null, data: { path: ["conversationId"], equals: conversationId } }, data: { readAt: now } });
}

export async function unreadConversations(userId: string) {
  const rows = await db.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n FROM "conversation_participant" cp JOIN "conversation" c ON c.id = cp."conversationId"
    WHERE cp."userId" = ${userId} AND EXISTS (
      SELECT 1 FROM "message" m WHERE m."conversationId" = c.id AND m."senderId" <> ${userId} AND m."isHidden" = false
        AND (cp."lastReadAt" IS NULL OR m."createdAt" > cp."lastReadAt"))`;
  return Number(rows[0]?.n ?? 0);
}

export async function setBlock(userId: string, targetId: string, block: boolean) {
  if (userId === targetId) throw invalid("Action impossible.");
  const exists = await db.user.count({ where: { id: targetId } });
  if (!exists) throw notFound();
  if (block) await db.userBlock.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } }, create: { blockerId: userId, blockedId: targetId }, update: {} });
  else await db.userBlock.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
}

/** Lecture modérée d'une conversation (staff) : uniquement dans le cadre d'un signalement ou d'un litige, et journalisée. */
export async function staffReadConversation(staffId: string, conversationId: string, justification: { reportId?: string; disputeId?: string }) {
  if (!justification.reportId && !justification.disputeId) throw forbidden("Une justification (signalement ou litige) est requise.");
  const conv = await db.conversation.findUnique({ where: { id: conversationId }, include: { participants: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, messages: { orderBy: { createdAt: "asc" }, take: 500 } } });
  if (!conv) throw notFound();
  await audit({ actorId: staffId, action: "conversation.staff_read", targetType: "Conversation", targetId: conversationId, metadata: justification });
  return conv;
}

export async function hideMessage(staffId: string, messageId: string, hidden: boolean) {
  await db.message.update({ where: { id: messageId }, data: { isHidden: hidden } });
  await audit({ actorId: staffId, action: hidden ? "message.hide" : "message.unhide", targetType: "Message", targetId: messageId });
}
