import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, conversationsTable, conversationParticipantsTable, messagesTable, usersTable, messageReactionsTable } from "@workspace/db";
import {
  CreateConversationBody,
  DeleteMessageParams,
  GetConversationParams,
  ListMessagesParams,
  SendMessageBody,
  SendMessageParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// In-memory typing store: conversationId -> userId -> { firstName, timestamp }
// No DB needed — typing state is transient (expires after 4 seconds)
const typingStore = new Map<number, Map<string, { firstName: string; timestamp: number }>>();
const TYPING_TTL_MS = 4000;

function setTyping(conversationId: number, userId: string, firstName: string) {
  if (!typingStore.has(conversationId)) {
    typingStore.set(conversationId, new Map());
  }
  typingStore.get(conversationId)!.set(userId, { firstName, timestamp: Date.now() });
}

function getTypingUsers(conversationId: number, excludeUserId: string): string[] {
  const conv = typingStore.get(conversationId);
  if (!conv) return [];
  const now = Date.now();
  const result: string[] = [];
  for (const [uid, { firstName, timestamp }] of conv.entries()) {
    if (uid !== excludeUserId && now - timestamp < TYPING_TTL_MS) {
      result.push(firstName);
    }
  }
  return result;
}

async function buildConversationResponse(convId: number) {
  const conversation = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .then((rows) => rows[0]);

  if (!conversation) return null;

  const participants = await db
    .select({
      userId: conversationParticipantsTable.userId,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(conversationParticipantsTable)
    .leftJoin(usersTable, eq(conversationParticipantsTable.userId, usersTable.id))
    .where(eq(conversationParticipantsTable.conversationId, convId));

  const lastMessages = await db
    .select({
      id: messagesTable.id,
      conversationId: messagesTable.conversationId,
      senderId: messagesTable.senderId,
      content: messagesTable.content,
      deletedAt: messagesTable.deletedAt,
      createdAt: messagesTable.createdAt,
      senderFirstName: usersTable.firstName,
      senderLastName: usersTable.lastName,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(1);

  const lastMessage = lastMessages[0] ?? null;

  return {
    id: conversation.id,
    name: conversation.name,
    avatarUrl: conversation.avatarUrl ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    participants: participants.map((p) => ({
      userId: p.userId,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      avatarUrl: p.avatarUrl ?? null,
    })),
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          conversationId: lastMessage.conversationId,
          senderId: lastMessage.senderId,
          content: lastMessage.deletedAt ? "" : lastMessage.content,
          deleted: !!lastMessage.deletedAt,
          createdAt: lastMessage.createdAt.toISOString(),
          senderFirstName: lastMessage.senderFirstName ?? "",
          senderLastName: lastMessage.senderLastName ?? "",
        }
      : null,
  };
}

router.get("/conversations", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;

  const participations = await db
    .select({ conversationId: conversationParticipantsTable.conversationId })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.userId, userId));

  const conversationIds = participations.map((p) => p.conversationId);

  if (conversationIds.length === 0) {
    res.json([]);
    return;
  }

  const results = await Promise.all(conversationIds.map((id) => buildConversationResponse(id)));

  const conversations = results
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a!.lastMessage?.createdAt ?? a!.updatedAt;
      const bTime = b!.lastMessage?.createdAt ?? b!.updatedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  res.json(conversations);
});

router.post("/conversations", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, avatarUrl, participantIds } = parsed.data;
  const currentUserId = req.user.id;
  const allParticipantIds = Array.from(new Set([currentUserId, ...participantIds]));

  const [conversation] = await db
    .insert(conversationsTable)
    .values({ name: name ?? null, avatarUrl: avatarUrl ?? null })
    .returning();

  await db.insert(conversationParticipantsTable).values(
    allParticipantIds.map((userId) => ({ conversationId: conversation.id, userId }))
  );

  const result = await buildConversationResponse(conversation.id);
  res.status(201).json(result);
});

router.get("/conversations/:conversationId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { conversationId } = params.data;
  const userId = req.user.id;

  const participation = await db
    .select()
    .from(conversationParticipantsTable)
    .where(and(
      eq(conversationParticipantsTable.conversationId, conversationId),
      eq(conversationParticipantsTable.userId, userId)
    ))
    .then((rows) => rows[0]);

  if (!participation) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const result = await buildConversationResponse(conversationId);
  if (!result) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.json(result);
});

router.patch("/conversations/:conversationId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const conversationId = parseInt(req.params.conversationId, 10);
  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversationId" });
    return;
  }

  const userId = req.user.id;

  const participation = await db
    .select()
    .from(conversationParticipantsTable)
    .where(and(
      eq(conversationParticipantsTable.conversationId, conversationId),
      eq(conversationParticipantsTable.userId, userId)
    ))
    .then((rows) => rows[0]);

  if (!participation) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { name, avatarUrl } = req.body as { name?: string; avatarUrl?: string | null };
  const updates: Partial<{ name: string | null; avatarUrl: string | null }> = {};

  if (name !== undefined) updates.name = name ?? null;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl ?? null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  await db.update(conversationsTable).set(updates).where(eq(conversationsTable.id, conversationId));

  const result = await buildConversationResponse(conversationId);
  res.json(result);
});

router.get("/conversations/:conversationId/messages", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { conversationId } = params.data;
  const userId = req.user.id;

  const participation = await db
    .select()
    .from(conversationParticipantsTable)
    .where(and(
      eq(conversationParticipantsTable.conversationId, conversationId),
      eq(conversationParticipantsTable.userId, userId)
    ))
    .then((rows) => rows[0]);

  if (!participation) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const repliedMessage = alias(messagesTable, "replied_message");
  const repliedSender = alias(usersTable, "replied_sender");

  const messages = await db
    .select({
      id: messagesTable.id,
      conversationId: messagesTable.conversationId,
      senderId: messagesTable.senderId,
      content: messagesTable.content,
      createdAt: messagesTable.createdAt,
      deletedAt: messagesTable.deletedAt,
      senderFirstName: usersTable.firstName,
      senderLastName: usersTable.lastName,
      replyToId: messagesTable.replyToId,
      replyToContent: repliedMessage.content,
      replyToDeletedAt: repliedMessage.deletedAt,
      replyToSenderFirstName: repliedSender.firstName,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .leftJoin(repliedMessage, eq(messagesTable.replyToId, repliedMessage.id))
    .leftJoin(repliedSender, eq(repliedMessage.senderId, repliedSender.id))
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);

  const messageIds = messages.map((m) => m.id);
  let allReactions: { messageId: number; userId: string; emoji: string }[] = [];
  if (messageIds.length > 0) {
    try {
      allReactions = await db
        .select({
          messageId: messageReactionsTable.messageId,
          userId: messageReactionsTable.userId,
          emoji: messageReactionsTable.emoji,
        })
        .from(messageReactionsTable)
        .where(inArray(messageReactionsTable.messageId, messageIds));
    } catch {
      // table may not exist yet in older deployments — skip reactions gracefully
    }
  }

  // Group reactions by messageId → emoji → { count, userIds }
  const reactionsByMessage = new Map<number, Map<string, { count: number; userIds: string[] }>>();
  for (const r of allReactions) {
    if (!reactionsByMessage.has(r.messageId)) reactionsByMessage.set(r.messageId, new Map());
    const byEmoji = reactionsByMessage.get(r.messageId)!;
    if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, { count: 0, userIds: [] });
    const entry = byEmoji.get(r.emoji)!;
    entry.count++;
    entry.userIds.push(r.userId);
  }

  res.json(messages.map((m) => {
    const emojiMap = reactionsByMessage.get(m.id);
    const reactions = emojiMap
      ? Array.from(emojiMap.entries()).map(([emoji, { count, userIds }]) => ({ emoji, count, userIds }))
      : [];
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.deletedAt ? "" : m.content,
      deleted: !!m.deletedAt,
      createdAt: m.createdAt.toISOString(),
      senderFirstName: m.senderFirstName ?? "",
      senderLastName: m.senderLastName ?? "",
      replyToId: m.replyToId ?? null,
      replyToContent: m.replyToDeletedAt ? null : (m.replyToContent ?? null),
      replyToSenderFirstName: m.replyToSenderFirstName ?? null,
      reactions,
    };
  }));
});

router.post("/conversations/:conversationId/messages", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { conversationId } = params.data;
  const userId = req.user.id;

  const participation = await db
    .select()
    .from(conversationParticipantsTable)
    .where(and(
      eq(conversationParticipantsTable.conversationId, conversationId),
      eq(conversationParticipantsTable.userId, userId)
    ))
    .then((rows) => rows[0]);

  if (!participation) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({ conversationId, senderId: userId, content: body.data.content, replyToId: body.data.replyToId ?? null })
    .returning();

  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  const sender = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .then((rows) => rows[0]);

  res.status(201).json({
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    senderFirstName: sender?.firstName ?? "",
    senderLastName: sender?.lastName ?? "",
  });
});

// DELETE /api/conversations/:conversationId/messages/:messageId — soft-delete a message (sender only)
router.delete("/conversations/:conversationId/messages/:messageId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { conversationId, messageId } = params.data;
  const userId = req.user.id;

  const message = await db
    .select()
    .from(messagesTable)
    .where(and(
      eq(messagesTable.id, messageId),
      eq(messagesTable.conversationId, conversationId),
    ))
    .then((rows) => rows[0]);

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (message.senderId !== userId) {
    res.status(403).json({ error: "You can only delete your own messages" });
    return;
  }

  if (message.deletedAt) {
    res.status(409).json({ error: "Message already deleted" });
    return;
  }

  await db
    .update(messagesTable)
    .set({ deletedAt: new Date() })
    .where(eq(messagesTable.id, messageId));

  res.json({ ok: true });
});

// POST /api/conversations/:conversationId/messages/:messageId/reactions — toggle an emoji reaction
router.post("/conversations/:conversationId/messages/:messageId/reactions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const conversationId = parseInt(req.params.conversationId, 10);
  const messageId = parseInt(req.params.messageId, 10);
  if (isNaN(conversationId) || isNaN(messageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { emoji } = req.body as { emoji?: string };
  if (!emoji || typeof emoji !== "string" || emoji.length > 10) {
    res.status(400).json({ error: "Invalid emoji" }); return;
  }

  const userId = req.user.id;

  const participation = await db
    .select()
    .from(conversationParticipantsTable)
    .where(and(
      eq(conversationParticipantsTable.conversationId, conversationId),
      eq(conversationParticipantsTable.userId, userId)
    ))
    .then((rows) => rows[0]);
  if (!participation) { res.status(403).json({ error: "Forbidden" }); return; }

  try {
    const existing = await db
      .select()
      .from(messageReactionsTable)
      .where(and(
        eq(messageReactionsTable.messageId, messageId),
        eq(messageReactionsTable.userId, userId),
        eq(messageReactionsTable.emoji, emoji)
      ))
      .then((rows) => rows[0]);

    if (existing) {
      await db.delete(messageReactionsTable).where(eq(messageReactionsTable.id, existing.id));
      res.json({ action: "removed" });
    } else {
      await db.insert(messageReactionsTable).values({ messageId, userId, emoji });
      res.json({ action: "added" });
    }
  } catch {
    // table may not exist yet in older deployments
    res.status(503).json({ error: "Reactions unavailable until next deployment" });
  }
});

// POST /api/conversations/:id/participants — add members to a group (participants only)
router.post("/conversations/:id/participants", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const conversationId = parseInt(req.params.id, 10);
  if (isNaN(conversationId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { userIds } = req.body as { userIds?: string[] };
  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.status(400).json({ error: "userIds must be a non-empty array" }); return;
  }

  const userId = req.user.id;

  // Verify conversation exists and is a group
  const conversation = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .then((rows) => rows[0]);

  if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return; }

  // Verify caller is a participant
  const participation = await db
    .select()
    .from(conversationParticipantsTable)
    .where(and(
      eq(conversationParticipantsTable.conversationId, conversationId),
      eq(conversationParticipantsTable.userId, userId),
    ))
    .then((rows) => rows[0]);

  if (!participation) { res.status(403).json({ error: "Forbidden" }); return; }

  // Get existing participant IDs to skip duplicates
  const existing = await db
    .select({ userId: conversationParticipantsTable.userId })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.conversationId, conversationId));

  const existingIds = new Set(existing.map((p) => p.userId));
  const newIds = userIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    await db.insert(conversationParticipantsTable).values(
      newIds.map((uid) => ({ conversationId, userId: uid }))
    );
  }

  const result = await buildConversationResponse(conversationId);
  res.json(result);
});

// POST /api/conversations/:id/typing — called while the user is typing
router.post("/conversations/:id/typing", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const conversationId = parseInt(req.params.id, 10);
  if (isNaN(conversationId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const participant = await db
    .select()
    .from(conversationParticipantsTable)
    .where(and(
      eq(conversationParticipantsTable.conversationId, conversationId),
      eq(conversationParticipantsTable.userId, userId),
    ))
    .then((rows) => rows[0]);

  if (!participant) { res.status(403).json({ error: "Forbidden" }); return; }

  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .then((rows) => rows[0]);

  if (user) setTyping(conversationId, userId, user.firstName);

  res.json({ ok: true });
});

// GET /api/conversations/:id/typing — returns names of users currently typing (excluding caller)
router.get("/conversations/:id/typing", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const conversationId = parseInt(req.params.id, 10);
  if (isNaN(conversationId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const typingUsers = getTypingUsers(conversationId, userId);
  res.json({ typing: typingUsers });
});

export default router;
