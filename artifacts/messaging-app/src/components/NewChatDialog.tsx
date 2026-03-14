import React, { useState, useRef } from "react";
import { Search, X, Users, Loader2, MessageSquare, Camera, Check } from "lucide-react";
import { useSearchUsers, useCreateConversation, getListConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "./Avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compress-image";

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: number) => void;
}

type Tab = "dm" | "group";

interface SelectedUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
}

export function NewChatDialog({ isOpen, onClose, onSelectConversation }: NewChatDialogProps) {
  const [tab, setTab] = useState<Tab>("dm");
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();

  // Group state
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: users, isLoading } = useSearchUsers(
    { q: query },
    { query: { enabled: query.length > 0 } }
  );

  const createChat = useCreateConversation({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        onSelectConversation(data.id);
        handleClose();
      }
    }
  });

  const handleClose = () => {
    setQuery("");
    setGroupName("");
    setGroupAvatar(null);
    setSelectedUsers([]);
    setTab("dm");
    onClose();
  };

  const handleStartDM = (userId: string) => {
    createChat.mutate({ data: { participantIds: [userId] } });
  };

  const handleToggleUser = (user: SelectedUser) => {
    setSelectedUsers(prev =>
      prev.some(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    createChat.mutate({
      data: {
        name: groupName.trim(),
        avatarUrl: groupAvatar ?? undefined,
        participantIds: selectedUsers.map(u => u.id),
      }
    });
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsCompressingAvatar(true);
    try {
      const dataUrl = await compressImage(file, 400, 0.85);
      setGroupAvatar(dataUrl);
    } finally {
      setIsCompressingAvatar(false);
    }
  };

  if (!isOpen) return null;

  const canCreateGroup = groupName.trim().length > 0 && selectedUsers.length > 0 && !createChat.isPending;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <h2 className="text-lg font-display font-semibold text-foreground">New Conversation</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => setTab("dm")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                tab === "dm"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Direct Message
            </button>
            <button
              onClick={() => setTab("group")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                tab === "group"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
              Group Chat
            </button>
          </div>

          {tab === "dm" && (
            <>
              {/* DM search */}
              <div className="p-4 border-b border-border bg-muted/30 shrink-0">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search by name or email..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
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
                {!isLoading && users?.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleStartDM(user.id)}
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
            </>
          )}

          {tab === "group" && (
            <>
              {/* Group setup: avatar + name */}
              <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-4 shrink-0">
                {/* Avatar picker */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFile}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative shrink-0 w-16 h-16 rounded-2xl bg-secondary border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden group"
                  title="Set group photo"
                >
                  {isCompressingAvatar ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : groupAvatar ? (
                    <>
                      <img src={groupAvatar} alt="Group" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                      <Camera className="w-5 h-5" />
                      <span className="text-[9px] font-medium">Photo</span>
                    </div>
                  )}
                </button>

                {/* Name input */}
                <input
                  type="text"
                  placeholder="Group name (required)"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  maxLength={60}
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              {/* Selected users chips */}
              {selectedUsers.length > 0 && (
                <div className="px-4 py-2 border-b border-border flex flex-wrap gap-2 shrink-0">
                  {selectedUsers.map(u => (
                    <span
                      key={u.id}
                      className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
                    >
                      {u.firstName} {u.lastName}
                      <button
                        onClick={() => handleToggleUser(u)}
                        className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* User search */}
              <div className="px-4 py-2 border-b border-border bg-muted/30 shrink-0">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Add people..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* User list with checkboxes */}
              <div className="flex-1 overflow-y-auto p-2">
                {isLoading && query.length > 0 && (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                {!isLoading && query.length > 0 && users?.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
                    <Users className="w-12 h-12 mb-3 opacity-20" />
                    <p>No users found</p>
                  </div>
                )}
                {!isLoading && users?.map(user => {
                  const isSelected = selectedUsers.some(u => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleToggleUser({ id: user.id, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl })}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors text-left"
                    >
                      <Avatar name={`${user.firstName} ${user.lastName}`} src={user.profileImageUrl} />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{user.firstName} {user.lastName}</div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                        isSelected ? "bg-primary border-primary" : "border-border"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
                {query.length === 0 && selectedUsers.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
                    <Users className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">Search for people to add to the group</p>
                  </div>
                )}
                {query.length === 0 && selectedUsers.length > 0 && (
                  <div className="text-center p-6 text-muted-foreground text-sm">
                    Search to add more people
                  </div>
                )}
              </div>

              {/* Create button */}
              <div className="p-4 border-t border-border shrink-0">
                <button
                  onClick={handleCreateGroup}
                  disabled={!canCreateGroup}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {createChat.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating group…</>
                  ) : (
                    <><Users className="w-4 h-4" /> Create group{selectedUsers.length > 0 ? ` · ${selectedUsers.length + 1} people` : ""}</>
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
