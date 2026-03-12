import React, { useState } from "react";
import { Search, X, Users, Loader2 } from "lucide-react";
import { useSearchUsers, useCreateConversation, getListConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "./Avatar";
import { motion, AnimatePresence } from "framer-motion";

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: number) => void;
}

export function NewChatDialog({ isOpen, onClose, onSelectConversation }: NewChatDialogProps) {
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useSearchUsers(
    { q: query },
    { query: { enabled: query.length > 0 } }
  );

  const createChat = useCreateConversation({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        onSelectConversation(data.id);
        setQuery("");
        onClose();
      }
    }
  });

  const handleStartChat = (userId: string) => {
    createChat.mutate({ data: { participantIds: [userId] } });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-foreground">New Conversation</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="relative relative flex items-center">
              <Search className="absolute left-3 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="Search by name or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading && query.length > 0 && (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            
            {!isLoading && query.length > 0 && users?.length === 0 && (
              <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
                <Users className="w-12 h-12 mb-3 opacity-20" />
                <p>No users found matching "{query}"</p>
              </div>
            )}

            {!isLoading && users?.map((user) => (
              <button
                key={user.id}
                onClick={() => handleStartChat(user.id)}
                disabled={createChat.isPending}
                className="w-full flex items-center gap-4 p-3 hover:bg-muted rounded-xl transition-colors text-left"
              >
                <Avatar name={`${user.firstName} ${user.lastName}`} src={user.profileImageUrl} />
                <div>
                  <div className="font-medium text-foreground">{user.firstName} {user.lastName}</div>
                </div>
              </button>
            ))}

            {query.length === 0 && (
              <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
                <Search className="w-12 h-12 mb-3 opacity-20" />
                <p>Search for a user to start chatting</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
