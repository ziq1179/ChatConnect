import * as React from "react";
import { Link, useLocation } from "wouter";
import { Edit, LogOut, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppConversations } from "@/hooks/use-chat";
import { useAuth } from "@workspace/replit-auth-web";
import { getInitials } from "@/lib/utils";
import { NewConversationDialog } from "./NewConversationDialog";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { data: conversations, isLoading } = useAppConversations();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [newChatOpen, setNewChatOpen] = React.useState(false);

  // Extract ID from /c/:id or undefined
  const activeId = location.startsWith("/c/") ? Number(location.split("/")[2]) : undefined;

  const getChatDetails = (conv: any) => {
    // If it's a 1-1, find the other person
    if (!conv.name && conv.participants.length > 0) {
      const other = conv.participants.find((p: any) => p.userId !== user?.id) || conv.participants[0];
      return {
        name: `${other.firstName} ${other.lastName}`,
        image: other.profileImageUrl,
      };
    }
    // Group chat or named conversation
    return {
      name: conv.name || "Group Chat",
      image: null, // Could add a group icon here
    };
  };

  return (
    <div className="w-full md:w-[360px] h-full flex flex-col bg-background/50 border-r border-border/50">
      <div className="p-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shadow-md ring-2 ring-background">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(`${user?.firstName} ${user?.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold tracking-tight">Chats</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setNewChatOpen(true)} className="rounded-full bg-muted/50 hover:bg-primary hover:text-primary-foreground">
            <Edit className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={logout} className="rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
              <div className="h-14 w-14 rounded-full bg-muted/60 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted/60 rounded w-1/2" />
                <div className="h-3 bg-muted/60 rounded w-3/4" />
              </div>
            </div>
          ))
        ) : conversations?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 opacity-60">
            <MessageSquare className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="font-medium text-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">Start a new chat to begin messaging.</p>
            <Button className="mt-6 rounded-full" onClick={() => setNewChatOpen(true)}>Start Chat</Button>
          </div>
        ) : (
          conversations?.map((conv) => {
            const { name, image } = getChatDetails(conv);
            const isActive = activeId === conv.id;
            const lastMsg = conv.lastMessage;

            return (
              <Link key={conv.id} href={`/c/${conv.id}`}>
                <div
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-200 border border-transparent",
                    isActive 
                      ? "bg-white shadow-lg shadow-black/5 border-border/50 ring-1 ring-black/5 dark:bg-zinc-900" 
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  <Avatar className="h-14 w-14 shrink-0 shadow-sm border-none bg-muted/50">
                    <AvatarImage src={image || undefined} />
                    <AvatarFallback className="text-muted-foreground text-lg">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={cn("font-semibold truncate", isActive ? "text-foreground" : "text-foreground/80")}>
                        {name}
                      </h3>
                      {lastMsg && (
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {new Date(lastMsg.createdAt).toLocaleDateString(undefined, { weekday: 'short' })}
                        </span>
                      )}
                    </div>
                    <p className={cn("text-sm truncate", isActive ? "text-muted-foreground font-medium" : "text-muted-foreground/80")}>
                      {lastMsg ? (
                        <>
                          {lastMsg.senderId === user?.id ? "You: " : ""}
                          {lastMsg.content}
                        </>
                      ) : (
                        "Say hi! 👋"
                      )}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <NewConversationDialog open={newChatOpen} onOpenChange={setNewChatOpen} />
    </div>
  );
}
