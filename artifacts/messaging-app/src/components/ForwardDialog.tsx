import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check, Send, Loader2, Forward } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

interface Conversation {
  id: number;
  name?: string | null;
  avatarUrl?: string | null;
  participants: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  }>;
}

interface ForwardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  conversations: Conversation[];
  currentUserId: string;
}

export function ForwardDialog({
  isOpen,
  onClose,
  messageContent,
  conversations,
  currentUserId,
}: ForwardDialogProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [done, setDone] = useState(false);

  const getConvName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const others = conv.participants.filter(p => p.userId !== currentUserId);
    if (others.length === 0) return "Just you";
    if (others.length === 1) return `${others[0].firstName} ${others[0].lastName}`;
    return others.map(o => o.firstName).join(", ");
  };

  const getConvAvatar = (conv: Conversation): string | null => {
    if (conv.avatarUrl) return conv.avatarUrl;
    const others = conv.participants.filter(p => p.userId !== currentUserId);
    if (others.length !== 1) return null;
    return others[0].avatarUrl ?? null;
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return conversations.filter(c => getConvName(c).toLowerCase().includes(q));
  }, [conversations, query]);

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setQuery("");
    setSelected(new Set());
    setDone(false);
    onClose();
  };

  const handleForward = async () => {
    if (selected.size === 0 || isSending) return;
    setIsSending(true);
    try {
      await Promise.all(
        [...selected].map(convId =>
          fetch(`/api/conversations/${convId}/messages`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: messageContent }),
          })
        )
      );
      setDone(true);
      setTimeout(handleClose, 900);
    } finally {
      setIsSending(false);
    }
  };

  // Truncate preview of message for display
  const isImage = messageContent.startsWith("data:image/");
  const isGif = /^https:\/\/(media\d*\.giphy\.com|media\.tenor\.com)\//.test(messageContent);
  const preview = isImage ? "📷 Photo" : isGif ? "GIF" : messageContent.length > 80 ? messageContent.slice(0, 80) + "…" : messageContent;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border flex flex-col max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Forward className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold text-foreground">Forward message</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message preview */}
            <div className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Forwarding</p>
              <p className="text-sm text-foreground line-clamp-2 italic">"{preview}"</p>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-border shrink-0">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search conversations…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-secondary/60 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No conversations found</p>
              )}
              {filtered.map(conv => {
                const name = getConvName(conv);
                const isSelected = selected.has(conv.id);
                return (
                  <button
                    key={conv.id}
                    onClick={() => toggle(conv.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors text-left"
                  >
                    <Avatar name={name} src={getConvAvatar(conv)} size="md" />
                    <span className="flex-1 text-sm font-medium text-foreground truncate">{name}</span>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                      isSelected ? "bg-primary border-primary" : "border-border"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border shrink-0">
              <button
                onClick={handleForward}
                disabled={selected.size === 0 || isSending || done}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-semibold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {done ? (
                  <><Check className="w-4 h-4" /> Forwarded!</>
                ) : isSending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Forward{selected.size > 0 ? ` to ${selected.size} chat${selected.size > 1 ? "s" : ""}` : ""}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
