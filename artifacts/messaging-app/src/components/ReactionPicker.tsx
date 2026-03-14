import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👎"];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isOwn: boolean;
}

export function ReactionPicker({ onSelect, onClose, isOwn }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={cn(
        "absolute bottom-full mb-2 z-50 flex gap-1 p-1.5 rounded-2xl bg-popover border border-border shadow-xl",
        isOwn ? "right-0" : "left-0"
      )}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => { onSelect(emoji); onClose(); }}
          className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-secondary active:scale-90 transition-all"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
