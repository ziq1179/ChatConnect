import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  useListConversations, 
  useListMessages, 
  useSendMessage,
  getListMessagesQueryKey,
  getListConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { format, isToday, isYesterday } from "date-fns";
import { Send, LogOut, Edit, MessageSquare, Loader2, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/Avatar";
import { NewChatDialog } from "@/components/NewChatDialog";
import { cn } from "@/lib/utils";

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

export default function Home() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const activeConversationId = params.id ? parseInt(params.id, 10) : null;
  
  const queryClient = useQueryClient();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversationId) return;
    sendMessage.mutate({ 
      conversationId: activeConversationId, 
      data: { content: messageText } 
    });
  };

  const activeConversation = conversations?.find(c => c.id === activeConversationId);
  const getConversationName = (conv: any) => {
    if (conv.name) return conv.name;
    const others = conv.participants.filter((p: any) => p.userId !== user?.id);
    if (others.length === 0) return "Just you";
    if (others.length === 1) return `${others[0].firstName} ${others[0].lastName}`;
    return others.map((o: any) => o.firstName).join(", ");
  };
  
  const getConversationAvatar = (conv: any) => {
    const others = conv.participants.filter((p: any) => p.userId !== user?.id);
    return others.length === 1 ? others[0].profileImageUrl : null;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div 
        className={cn(
          "h-full flex-shrink-0 flex-col border-r border-border bg-card transition-all duration-300 absolute md:relative z-20 w-full md:w-80 lg:w-96",
          isSidebarOpen ? "flex left-0" : "-left-full md:left-0"
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Avatar name={`${user?.firstName} ${user?.lastName}`} size="sm" />
            <div className="font-display font-semibold text-foreground">Messages</div>
          </div>
          <div className="flex items-center gap-1">
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
                      <div className="font-medium truncate text-foreground text-sm">{name}</div>
                      {conv.lastMessage && (
                        <div className="text-[10px] whitespace-nowrap ml-2 opacity-60">
                          {formatMessageTime(conv.lastMessage.createdAt)}
                        </div>
                      )}
                    </div>
                    <div className="text-xs truncate opacity-70">
                      {conv.lastMessage ? (
                        <>
                          {conv.lastMessage.senderId === user?.id ? "You: " : ""}
                          {conv.lastMessage.content}
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background relative z-10">
        {activeConversationId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 flex items-center border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              <button 
                className="md:hidden p-2 -ml-2 mr-2 rounded-full hover:bg-secondary text-foreground"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              {activeConversation && (
                <div className="flex items-center gap-3">
                  <Avatar name={getConversationName(activeConversation)} src={getConversationAvatar(activeConversation)} size="sm" />
                  <div className="font-display font-semibold text-foreground">
                    {getConversationName(activeConversation)}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      className={cn("flex w-full", isOwn ? "justify-end" : "justify-start")}
                    >
                      <div className={cn("flex max-w-[75%] gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
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
                        
                        <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                          {showAvatar && (
                            <span className="text-xs text-muted-foreground ml-1 mb-1">{msg.senderFirstName}</span>
                          )}
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
            <div className="p-4 bg-background border-t border-border">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full pl-5 pr-14 py-4 bg-secondary/50 border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sendMessage.isPending}
                  className="absolute right-2 p-2.5 bg-primary text-white rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-md"
                >
                  {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                </button>
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
    </div>
  );
}
