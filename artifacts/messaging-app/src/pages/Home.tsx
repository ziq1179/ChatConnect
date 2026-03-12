import { useRoute } from "wouter";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [match, params] = useRoute("/c/:id");
  const activeConversationId = match ? Number(params.id) : null;

  return (
    <div className="flex h-screen w-full bg-[#f8f9fc] dark:bg-[#09090b] overflow-hidden font-sans">
      {/* Sidebar - Hidden on mobile if a chat is active */}
      <div className={cn(
        "h-full shrink-0 transition-all duration-300 ease-in-out",
        match ? "hidden md:block" : "block w-full md:w-auto"
      )}>
        <Sidebar />
      </div>

      {/* Main Chat Area - Hidden on mobile if NO chat is active */}
      <main className={cn(
        "flex-1 h-full py-0 md:py-2 md:pr-2 transition-all duration-300 ease-in-out",
        !match ? "hidden md:flex" : "flex w-full"
      )}>
        {activeConversationId ? (
          <ChatArea conversationId={activeConversationId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-950/50 rounded-l-3xl shadow-[rgba(17,_17,_26,_0.1)_0px_0px_16px] h-full">
            <div className="bg-primary/5 p-8 rounded-full mb-6 relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }}></div>
              <MessageSquare className="h-16 w-16 text-primary relative z-10" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Your Messages</h2>
            <p className="text-muted-foreground max-w-sm text-center">
              Select a conversation from the sidebar or start a new one to connect with friends and colleagues.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
