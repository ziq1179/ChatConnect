import * as React from "react";
import { useLocation } from "wouter";
import { Search, Loader2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSearchUsers, useAppCreateConversation } from "@/hooks/use-chat";
import { getInitials } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewConversationDialog({ open, onOpenChange }: Props) {
  const [search, setSearch] = React.useState("");
  const { data: users, isLoading } = useAppSearchUsers(search);
  const createMutation = useAppCreateConversation();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();

  const handleStartConversation = (userId: string) => {
    createMutation.mutate(
      { data: { participantIds: [userId] } },
      {
        onSuccess: (conv) => {
          onOpenChange(false);
          setSearch("");
          setLocation(`/c/${conv.id}`);
        },
      }
    );
  };

  // Filter out self from search results
  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    return users.filter((u) => u.id !== currentUser?.id);
  }, [users, currentUser]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Search for people to start a new conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            className="pl-12 bg-muted/30 border-transparent focus-visible:border-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mt-4 min-h-[300px] max-h-[400px] overflow-y-auto -mx-2 px-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p className="text-sm">Searching users...</p>
            </div>
          ) : search.length > 0 && search.length < 2 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Keep typing to search...
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="space-y-1">
              <AnimatePresence>
                {filteredUsers.map((user) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    key={user.id}
                  >
                    <button
                      onClick={() => handleStartConversation(user.id)}
                      disabled={createMutation.isPending}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left active:scale-[0.98]"
                    >
                      <Avatar className="h-12 w-12 border-none">
                        <AvatarImage src={user.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {getInitials(`${user.firstName} ${user.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-foreground truncate">
                          {user.firstName} {user.lastName}
                        </p>
                      </div>
                      <UserPlus className="h-5 w-5 text-muted-foreground mr-2" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : search.length >= 2 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">No users found</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <p className="text-sm">Type a name to begin</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
