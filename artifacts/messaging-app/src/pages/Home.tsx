import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { 
  useListConversations, 
  useListMessages, 
  useSendMessage,
  getListMessagesQueryKey,
  getListConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { format, isToday, isYesterday } from "date-fns";
import { Send, LogOut, Edit, MessageSquare, Loader2, Menu, Bell, Smile, Video, Trash2, ImagePlus, UserPlus, Copy, Check, X, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Avatar } from "@/components/Avatar";
import { AvatarUpload } from "@/components/AvatarUpload";
import { NewChatDialog } from "@/components/NewChatDialog";
import { GifPicker } from "@/components/GifPicker";
import { VideoMessage, isVideoUrl } from "@/components/VideoMessage";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { GroupEditDialog } from "@/components/GroupEditDialog";
import { cn } from "@/lib/utils";

import { compressImage } from "@/lib/compress-image";

const GIF_URL_PATTERN = /^https:\/\/(media\d*\.giphy\.com|media\.tenor\.com)\//;
const IMAGE_DATA_URL_PATTERN = /^data:image\//;

// Matches strings that contain only emoji characters (and whitespace between them)
function isEmojiOnly(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed) return false;
  // Strip ZWJ, variation selectors, combining enclosing keycap, skin tone modifiers
  const stripped = trimmed.replace(/[\u200D\uFE0F\u20E3\u{1F3FB}-\u{1F3FF}]/gu, "");
  return /^[\p{Extended_Pictographic}\s]+$/u.test(stripped);
}

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

export default function Home() {
  const { user, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const activeConversationId = params.id ? parseInt(params.id, 10) : null;
  
  const queryClient = useQueryClient();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastPingSentAt = useRef<number>(0);
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Close sidebar on mobile when a conversation is selected
  useEffect(() => {
    if (activeConversationId && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [activeConversationId]);

  const { data: conversations, isLoading: isConversationsLoading } = useListConversations({
    query: { refetchInterval: 5000 }
  });

  const { data: messages, isLoading: isMessagesLoading } = useListMessages(
    activeConversationId as number,
    {
      query: { 
        enabled: !!activeConversationId,
        refetchInterval: 3000 // Poll every 3 seconds
      }
    }
  );

  const sendMessage = useSendMessage({
    mutation: {
      onSuccess: () => {
        setMessageText("");
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeConversationId as number) });
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setTimeout(() => scrollToBottom(), 50);
      }
    }
  });

  const deleteMessage = useMutation({
    mutationFn: async ({ conversationId, messageId }: { conversationId: number; messageId: number }) => {
      const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete message");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeConversationId as number) });
      queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeConversationId) return;
    if (!file.type.startsWith("image/")) return;
    setIsCompressing(true);
    try {
      const dataUrl = await compressImage(file);
      sendMessage.mutate({ conversationId: activeConversationId, data: { content: dataUrl } });
    } finally {
      setIsCompressing(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for who's typing every 2 seconds when a conversation is active
  useEffect(() => {
    if (!activeConversationId) { setTypingUsers([]); return; }
    const poll = async () => {
      try {
        const res = await fetch(`/api/conversations/${activeConversationId}/typing`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setTypingUsers(data.typing ?? []);
        }
      } catch { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [activeConversationId]);

  // Reset typing state when switching conversations
  useEffect(() => { setTypingUsers([]); }, [activeConversationId]);

  const sendTypingPing = useCallback(async (convId: number) => {
    const now = Date.now();
    // Rate-limit: send at most once every 2 seconds
    if (now - lastPingSentAt.current < 2000) return;
    lastPingSentAt.current = now;
    try {
      await fetch(`/api/conversations/${convId}/typing`, {
        method: "POST",
        credentials: "include",
      });
    } catch { /* ignore */ }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    if (activeConversationId && e.target.value.trim()) {
      sendTypingPing(activeConversationId);
      // Clear any pending stop-typing timer and restart it
      if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
      stopTypingTimer.current = setTimeout(() => {
        lastPingSentAt.current = 0; // Allow next keystroke to ping immediately
      }, 3000);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversationId) return;
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    lastPingSentAt.current = 0;
    const text = messageText;
    setMessageText("");
    sendMessage.mutate({ 
      conversationId: activeConversationId, 
      data: { content: text } 
    });
    inputRef.current?.focus();
  };

  const handleGifSelect = (url: string) => {
    if (!activeConversationId) return;
    setShowGifPicker(false);
    sendMessage.mutate({
      conversationId: activeConversationId,
      data: { content: url },
    });
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const typingLabel = typingUsers.length === 1
    ? `${typingUsers[0]} is typing`
    : typingUsers.length === 2
    ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
    : typingUsers.length > 2
    ? "Several people are typing"
    : null;

  const { permission, requestPermission, unread } = useNotifications(
    conversations as any,
    user?.id,
    activeConversationId,
  );

  // Update browser tab title with total unread count
  useEffect(() => {
    const total = Array.from(unread.values()).reduce((a, b) => a + b, 0);
    document.title = total > 0 ? `(${total}) Connect` : "Connect";
    return () => { document.title = "Connect"; };
  }, [unread]);

  const activeConversation = conversations?.find(c => c.id === activeConversationId);
  const getConversationName = (conv: any) => {
    if (conv.name) return conv.name;
    const others = conv.participants.filter((p: any) => p.userId !== user?.id);
    if (others.length === 0) return "Just you";
    if (others.length === 1) return `${others[0].firstName} ${others[0].lastName}`;
    return others.map((o: any) => o.firstName).join(", ");
  };
  
  const getConversationAvatar = (conv: any) => {
    if (conv.avatarUrl) return conv.avatarUrl;
    const others = conv.participants.filter((p: any) => p.userId !== user?.id);
    if (others.length !== 1) return null;
    return others[0].avatarUrl ?? null;
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Sidebar — on mobile: occupies full screen and toggles with the chat area.
           No absolute positioning to avoid iOS Safari touch-event clipping. */}
      <div 
        className={cn(
          "flex-shrink-0 flex-col border-r border-border bg-card w-full md:w-80 lg:w-96 min-h-0 overflow-hidden",
          isSidebarOpen ? "flex" : "hidden md:flex"
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <AvatarUpload
              name={`${user?.firstName} ${user?.lastName}`}
              currentAvatarUrl={user?.avatarUrl}
              size="sm"
              onUploaded={() => refreshUser()}
            />
            <div className="font-display font-semibold text-foreground">Messages</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowInviteModal(true)}
              className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
              title="Invite people"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsNewChatOpen(true)}
              className="p-2 rounded-full hover:bg-secondary text-foreground transition-colors"
              title="New Chat"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button 
              onClick={() => logout()}
              className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification permission nudge */}
        {permission === "default" && (
          <div className="mx-3 mt-2 mb-1 flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2">
            <Bell className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-foreground flex-1">Get notified about new messages</span>
            <button
              onClick={requestPermission}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              Enable
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isConversationsLoading ? (
            <div className="p-4 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : conversations?.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
              <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">No conversations yet.<br/>Start one!</p>
            </div>
          ) : (
            conversations?.map((conv) => {
              const name = getConversationName(conv);
              const isActive = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setLocation(`/c/${conv.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                    isActive ? "bg-primary/10 text-foreground" : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Avatar name={name} src={getConversationAvatar(conv)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <div className={cn(
                        "font-medium truncate text-sm",
                        unread.get(conv.id) ? "text-foreground" : "text-foreground"
                      )}>
                        {name}
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {conv.lastMessage && (
                          <div className="text-[10px] whitespace-nowrap opacity-60">
                            {formatMessageTime(conv.lastMessage.createdAt)}
                          </div>
                        )}
                        {(unread.get(conv.id) ?? 0) > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold">
                            {(unread.get(conv.id) ?? 0) > 99 ? "99+" : unread.get(conv.id)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "text-xs truncate",
                      (unread.get(conv.id) ?? 0) > 0 ? "font-medium text-foreground" : "opacity-70"
                    )}>
                      {conv.lastMessage ? (
                        <>
                          {conv.lastMessage.senderId === user?.id ? "You: " : ""}
                          {conv.lastMessage.deleted
                            ? "Message deleted"
                            : IMAGE_DATA_URL_PATTERN.test(conv.lastMessage.content)
                            ? "📷 Photo"
                            : GIF_URL_PATTERN.test(conv.lastMessage.content)
                            ? "GIF"
                            : isVideoUrl(conv.lastMessage.content)
                            ? "🎬 Video"
                            : conv.lastMessage.content}
                        </>
                      ) : (
                        "No messages yet"
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area — on mobile: only shown when sidebar is closed */}
      <div className={cn(
        "flex-1 flex-col min-h-0 min-w-0 bg-background overflow-hidden",
        isSidebarOpen ? "hidden md:flex" : "flex"
      )}>
        {activeConversationId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 flex items-center border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
              <button 
                className="md:hidden p-2 -ml-2 mr-2 rounded-full hover:bg-secondary text-foreground"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              {activeConversation && (
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={getConversationName(activeConversation)}
                    src={getConversationAvatar(activeConversation)}
                    size="md"
                    onClick={() => { const s = getConversationAvatar(activeConversation); if (s) setLightboxSrc(s); }}
                  />
                  <div className="font-display font-semibold text-foreground truncate">
                    {getConversationName(activeConversation)}
                  </div>
                  {/* Edit button — only for groups (conversations with a name) */}
                  {activeConversation.name && (
                    <button
                      onClick={() => setShowGroupEdit(true)}
                      title="Edit group"
                      className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {isMessagesLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : messages?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                  <p>Send a message to start the conversation.</p>
                </div>
              ) : (
                messages?.map((msg, index) => {
                  const isOwn = msg.senderId === user?.id;
                  const showAvatar = !isOwn && (index === 0 || messages[index - 1].senderId !== msg.senderId);
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id} 
                      className={cn("flex w-full group/msg", isOwn ? "justify-end" : "justify-start")}
                      onMouseEnter={() => isOwn && !msg.deleted && setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div className={cn("flex items-end max-w-[75%] gap-1.5", isOwn ? "flex-row-reverse" : "flex-row")}>
                        {!isOwn && (
                          <div className="w-8 flex-shrink-0 flex items-end">
                            {showAvatar ? (
                              <Avatar 
                                name={`${msg.senderFirstName} ${msg.senderLastName}`} 
                                src={null} 
                                size="sm" 
                              />
                            ) : <div className="w-8" />}
                          </div>
                        )}

                        {/* Delete button — visible on hover for own non-deleted messages */}
                        {isOwn && !msg.deleted && (
                          <button
                            className={cn(
                              "p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0",
                              hoveredMessageId === msg.id ? "opacity-100" : "opacity-0 pointer-events-none"
                            )}
                            title="Delete message"
                            onClick={() => {
                              if (confirm("Delete this message for everyone?")) {
                                deleteMessage.mutate({ conversationId: msg.conversationId, messageId: msg.id });
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        
                        <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                          {showAvatar && (
                            <span className="text-xs text-muted-foreground ml-1 mb-1">{msg.senderFirstName}</span>
                          )}
                          {msg.deleted ? (
                            <div className={cn(
                              "px-4 py-2.5 rounded-2xl text-[14px] italic text-muted-foreground border border-dashed",
                              isOwn ? "rounded-br-sm border-border/60" : "rounded-bl-sm border-border/60"
                            )}>
                              Message deleted
                            </div>
                          ) : IMAGE_DATA_URL_PATTERN.test(msg.content) ? (
                            <div className={cn("rounded-2xl overflow-hidden shadow-sm", isOwn ? "rounded-br-sm" : "rounded-bl-sm")}>
                              <img
                                src={msg.content}
                                alt="Photo"
                                className="max-w-[260px] w-full object-cover block cursor-pointer hover:brightness-90 transition-all"
                                loading="lazy"
                                onClick={() => setLightboxSrc(msg.content)}
                              />
                            </div>
                          ) : GIF_URL_PATTERN.test(msg.content) ? (
                            <div className={cn("rounded-2xl overflow-hidden shadow-sm", isOwn ? "rounded-br-sm" : "rounded-bl-sm")}>
                              <img
                                src={msg.content}
                                alt="GIF"
                                className="max-w-[220px] w-full object-cover block"
                                loading="lazy"
                              />
                            </div>
                          ) : isVideoUrl(msg.content) ? (
                            <VideoMessage url={msg.content} isOwn={isOwn} />
                          ) : isEmojiOnly(msg.content) ? (
                            <div className="text-5xl leading-none select-text py-1">
                              {msg.content}
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed break-words",
                                isOwn 
                                  ? "bg-gradient-to-br from-primary to-violet-500 text-white rounded-br-sm shadow-sm" 
                                  : "bg-secondary text-secondary-foreground rounded-bl-sm border border-white/5"
                              )}
                            >
                              {msg.content}
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground mt-1 px-1">
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="px-4 pb-4 bg-background border-t border-border pt-2">
              {/* Typing indicator */}
              <div className="h-5 mb-1 px-1">
                <AnimatePresence>
                  {typingLabel && (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="inline-block w-1 h-1 rounded-full bg-muted-foreground"
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                          />
                        ))}
                      </span>
                      <span>{typingLabel}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* GIF picker popup */}
              <AnimatePresence>
                {showGifPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="mb-2"
                  >
                    <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSend} className="flex items-center gap-2">
                {/* Emoji button */}
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => { setShowEmojiPicker(p => !p); setShowGifPicker(false); }}
                    className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 z-50">
                      <EmojiPicker
                        theme={Theme.DARK}
                        onEmojiClick={(emojiData) => {
                          setMessageText(prev => prev + emojiData.emoji);
                          inputRef.current?.focus();
                        }}
                        width={300}
                        height={380}
                      />
                    </div>
                  )}
                </div>

                {/* GIF button */}
                <button
                  type="button"
                  onClick={() => { setShowGifPicker(p => !p); setShowEmojiPicker(false); }}
                  className={cn(
                    "px-2 py-1 rounded-lg text-xs font-bold border transition-colors",
                    showGifPicker
                      ? "bg-primary text-white border-primary"
                      : "text-muted-foreground border-border hover:text-foreground hover:border-foreground"
                  )}
                  title="Send a GIF"
                >
                  GIF
                </button>

                {/* Hidden image file input */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelected}
                />

                {/* Image button */}
                <button
                  type="button"
                  disabled={isCompressing || !activeConversationId}
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                  title="Send a photo"
                >
                  {isCompressing
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <ImagePlus className="w-5 h-5" />}
                </button>

                {/* Video link button */}
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt("Paste a YouTube, Vimeo, or direct video link:");
                    if (url?.trim() && activeConversationId) {
                      sendMessage.mutate({ conversationId: activeConversationId, data: { content: url.trim() } });
                    }
                  }}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Share a video link"
                >
                  <Video className="w-5 h-5" />
                </button>

                {/* Text input */}
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageText}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    className="w-full pl-5 pr-14 py-3.5 bg-secondary/50 border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendMessage.isPending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-primary text-white rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-md"
                  >
                    {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="hidden md:flex h-full flex-col items-center justify-center text-muted-foreground bg-gradient-to-b from-background to-secondary/20">
            <div className="w-20 h-20 bg-secondary/80 rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/5 transform -rotate-6">
              <MessageSquare className="w-10 h-10 text-primary/80" />
            </div>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-2">Welcome to Connect</h2>
            <p>Select a conversation or start a new one.</p>
            <button 
              onClick={() => setIsNewChatOpen(true)}
              className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all"
            >
              Start New Chat
            </button>
          </div>
        )}
      </div>

      <NewChatDialog 
        isOpen={isNewChatOpen} 
        onClose={() => setIsNewChatOpen(false)} 
        onSelectConversation={(id) => {
          setLocation(`/c/${id}`);
          setIsSidebarOpen(false);
        }} 
      />

      {/* Invite modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-base">Invite people</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Share this link with anyone</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Link box */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary border border-border">
                <span className="flex-1 text-sm text-foreground font-mono truncate select-all">
                  {`${window.location.origin}/invite?from=${encodeURIComponent(user?.firstName ?? "")}`}
                </span>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/invite?from=${encodeURIComponent(user?.firstName ?? "")}`;
                    navigator.clipboard.writeText(link).then(() => {
                      setCopiedInviteLink(true);
                      setTimeout(() => setCopiedInviteLink(false), 2500);
                    });
                  }}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    copiedInviteLink
                      ? "bg-green-500/15 text-green-500 border border-green-500/30"
                      : "bg-primary text-white hover:opacity-90"
                  )}
                >
                  {copiedInviteLink ? (
                    <><Check className="w-3.5 h-3.5" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy</>
                  )}
                </button>
              </div>

              {/* What they'll see */}
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Anyone with this link can create a free account and start chatting with you on Connect.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeConversation?.name && (
        <GroupEditDialog
          isOpen={showGroupEdit}
          onClose={() => setShowGroupEdit(false)}
          conversationId={activeConversation.id}
          currentName={activeConversation.name}
          currentAvatarUrl={activeConversation.avatarUrl ?? null}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          }}
        />
      )}

      <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
