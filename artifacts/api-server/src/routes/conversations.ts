import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, conversationsTable, conversationParticipantsTable, messagesTable, usersTable } from "@workspace/db";
import {
  CreateConversationBody,
  GetConversationParams,
  ListMessagesParams,
  SendMessageBody,
  SendMessageParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

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
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    participants: participants.map((p) => ({
      userId: p.userId,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
    })),
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          conversationId: lastMessage.conversationId,
          senderId: lastMessage.senderId,
          content: lastMessage.content,
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

  const { name, participantIds } = parsed.data;
  const currentUserId = req.user.id;
  const allParticipantIds = Array.from(new Set([currentUserId, ...participantIds]));

  const [conversation] = await db
    .insert(conversationsTable)
    .values({ name: name ?? null })
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

  const messages = await db
    .select({
      id: messagesTable.id,
      conversationId: messagesTable.conversationId,
      senderId: messagesTable.senderId,
      content: messagesTable.content,
      createdAt: messagesTable.createdAt,
      senderFirstName: usersTable.firstName,
      senderLastName: usersTable.lastName,
    })
    .from(messagesTable)
    .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);

  res.json(messages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    senderFirstName: m.senderFirstName ?? "",
    senderLastName: m.senderLastName ?? "",
  })));
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
    .values({ conversationId, senderId: userId, content: body.data.content })
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

export default router;
