import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { compressImage } from "@/lib/compress-image";
import { Avatar } from "@/components/Avatar";

interface GroupEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  currentName: string;
  currentAvatarUrl: string | null;
  onSaved: (name: string, avatarUrl: string | null) => void;
}

export function GroupEditDialog({
  isOpen,
  onClose,
  conversationId,
  currentName,
  currentAvatarUrl,
  onSaved,
}: GroupEditDialogProps) {
  const [name, setName] = useState(currentName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync props when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setAvatarUrl(currentAvatarUrl);
      setError(null);
      setSaved(false);
    }
  }, [isOpen, currentName, currentAvatarUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsCompressing(true);
    try {
      const dataUrl = await compressImage(file, 400, 0.85);
      setAvatarUrl(dataUrl);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), avatarUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setSaved(true);
      onSaved(name.trim(), avatarUrl);
      setTimeout(onClose, 700);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-display font-semibold text-foreground">Edit Group</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Avatar picker */}
              <div className="flex flex-col items-center gap-3">
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
                  className="relative group"
                  title="Change group photo"
                >
                  <Avatar name={name || "Group"} src={avatarUrl} size="xl" />
                  {/* Camera overlay */}
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {isCompressing
                      ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                      : <Camera className="w-5 h-5 text-white" />
                    }
                  </div>
                </button>
                <p className="text-xs text-muted-foreground">Tap to change photo</p>
              </div>

              {/* Name input */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Group name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={60}
                  placeholder="Enter group name"
                  className="w-full px-4 py-3 bg-secondary/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                />
              </div>

              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!name.trim() || isSaving || isCompressing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-semibold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : saved ? (
                  <><Check className="w-4 h-4" /> Saved!</>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
