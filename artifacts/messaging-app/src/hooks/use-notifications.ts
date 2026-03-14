import { useEffect, useRef, useCallback, useState } from "react";
import { useLocation } from "wouter";

interface LastMessage {
  id: number;
  senderId: string;
  content: string;
  createdAt: string;
  senderFirstName: string;
  senderLastName: string;
}

interface Conversation {
  id: number;
  name?: string | null;
  participants: { userId: string; firstName: string; lastName: string }[];
  lastMessage: LastMessage | null;
}

export function useNotifications(
  conversations: Conversation[] | undefined,
  currentUserId: string | null | undefined,
  activeConversationId: number | null,
) {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );

  // seenMsgId tracks the last message ID we have notified/seen per conversation.
  // Pre-seeded on first load so we don't blast old messages.
  const seenMsgId = useRef<Map<number, number>>(new Map());
  const seeded = useRef(false);

  // unread: convId → count of unseen messages
  const [unread, setUnread] = useState<Map<number, number>>(new Map());

  const [, setLocation] = useLocation();

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  // Seed seen state on first conversations load so existing messages
  // don't trigger spurious notifications.
  useEffect(() => {
    if (!conversations || seeded.current) return;
    seeded.current = true;
    const map = new Map<number, number>();
    for (const conv of conversations) {
      if (conv.lastMessage) map.set(conv.id, conv.lastMessage.id);
    }
    seenMsgId.current = map;
  }, [conversations]);

  // Detect new messages and fire notifications / update unread counts.
  useEffect(() => {
    if (!conversations || !seeded.current || !currentUserId) return;

    const newUnread = new Map(unread);
    let changed = false;

    for (const conv of conversations) {
      const msg = conv.lastMessage;
      if (!msg) continue;

      const lastSeen = seenMsgId.current.get(conv.id) ?? -1;
      if (msg.id <= lastSeen) continue;
      if (msg.senderId === currentUserId) {
        // Own message — mark seen, clear unread
        seenMsgId.current.set(conv.id, msg.id);
        if (newUnread.get(conv.id)) { newUnread.set(conv.id, 0); changed = true; }
        continue;
      }

      // New message from someone else
      seenMsgId.current.set(conv.id, msg.id);

      // Increment unread only when not actively viewing this conversation
      if (conv.id !== activeConversationId) {
        newUnread.set(conv.id, (newUnread.get(conv.id) ?? 0) + 1);
        changed = true;
      }

      // Browser notification when window is not focused or different chat is open
      const windowFocused = document.hasFocus();
      const isActiveConv = conv.id === activeConversationId;
      if (permission === "granted" && (!windowFocused || !isActiveConv)) {
        const title =
          conv.name ||
          conv.participants
            .filter((p) => p.userId !== currentUserId)
            .map((p) => p.firstName)
            .join(", ") ||
          "New message";

        const body =
          msg.content.length > 80 ? `${msg.content.slice(0, 80)}…` : msg.content;

        const notification = new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: `conv-${conv.id}`,   // collapses duplicate notifications per conversation
          renotify: true,
        });

        notification.onclick = () => {
          window.focus();
          setLocation(`/c/${conv.id}`);
          notification.close();
        };
      }
    }

    if (changed) setUnread(new Map(newUnread));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, currentUserId, permission]);

  // Clear unread count when user opens a conversation
  useEffect(() => {
    if (!activeConversationId) return;
    setUnread((prev) => {
      if (!prev.get(activeConversationId)) return prev;
      const next = new Map(prev);
      next.set(activeConversationId, 0);
      return next;
    });
  }, [activeConversationId]);

  return { permission, requestPermission, unread };
}
