import * as React from "react";
import { Send, ArrowLeft, Loader2, Info } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppMessages, useAppConversation, useAppSendMessage } from "@/hooks/use-chat";
import { useAuth } from "@workspace/replit-auth-web";
import { formatTime, getInitials, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  conversationId: number;
}

export function ChatArea({ conversationId }: Props) {
  const { data: messages, isLoading: isLoadingMessages } = useAppMessages(conversationId);
  const { data: conversation, isLoading: isLoadingConv } = useAppConversation(conversationId);
  const sendMessageMutation = useAppSendMessage();
  const { user } = useAuth();
  
  const [content, setContent] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessageMutation.mutate({
      conversationId,
      data: { content: content.trim() }
    });
    setContent(""); // optimistic clear
  };

  const getChatDetails = () => {
    if (!conversation) return { name: "Loading...", image: null };
    if (!conversation.name && conversation.participants.length > 0) {
      const other = conversation.participants.find((p: any) => p.userId !== user?.id) || conversation.participants[0];
      return {
        name: `${other.firstName} ${other.lastName}`,
        image: other.profileImageUrl,
      };
    }
    return {
      name: conversation.name || "Group Chat",
      image: null,
    };
  };

  const details = getChatDetails();

  if (isLoadingConv) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950/50 rounded-l-none md:rounded-l-3xl shadow-[rgba(17,_17,_26,_0.1)_0px_0px_16px] relative overflow-hidden">
      {/* Header */}
      <header className="h-20 border-b border-border/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl flex items-center px-4 shrink-0 z-10">
        <div className="md:hidden mr-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        
        <Avatar className="h-11 w-11 mr-4 border-none shadow-sm">
          <AvatarImage src={details.image || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(details.name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h2 className="font-bold text-lg leading-tight">{details.name}</h2>
          <p className="text-xs text-primary font-medium">Online</p>
        </div>
        
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground">
          <Info className="h-5 w-5" />
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed" ref={scrollRef}>
        {isLoadingMessages ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <p>Start the conversation</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages?.map((msg, index) => {
              const isMine = msg.senderId === user?.id;
              const showAvatar = !isMine && (index === messages.length - 1 || messages[index + 1]?.senderId !== msg.senderId);

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex max-w-[80%] w-fit",
                    isMine ? "ml-auto" : "mr-auto"
                  )}
                >
                  {!isMine && (
                    <div className="w-8 shrink-0 mr-2 flex flex-col justify-end">
                      {showAvatar && (
                        <Avatar className="h-8 w-8 mb-1 border-none shadow-sm">
                          <AvatarImage src={msg.senderProfileImageUrl || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(`${msg.senderFirstName} ${msg.senderLastName}`)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col relative group">
                    <div
                      className={cn(
                        "px-5 py-3 shadow-sm relative",
                        isMine 
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm shadow-primary/20" 
                          : "bg-muted/80 text-foreground rounded-2xl rounded-bl-sm"
                      )}
                    >
                      <p className="text-[15px] leading-relaxed break-words">{msg.content}</p>
                    </div>
                    <span 
                      className={cn(
                        "text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5",
                        isMine ? "right-1" : "left-1"
                      )}
                    >
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-border/50 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto relative">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full h-14 pl-6 pr-14 bg-muted/30 border-transparent shadow-inner focus-visible:ring-primary/20 focus-visible:bg-background transition-all text-base"
          />
          <Button 
            type="submit" 
            disabled={!content.trim() || sendMessageMutation.isPending}
            className="absolute right-1.5 top-1.5 h-11 w-11 rounded-full p-0 shadow-lg shadow-primary/20"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 ml-0.5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

// Just importing this up top for the empty state
import { MessageSquare } from "lucide-react";
