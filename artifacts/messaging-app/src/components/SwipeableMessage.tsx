import { useRef, useState } from "react";
import { Reply } from "lucide-react";

interface SwipeableMessageProps {
  onReply: () => void;
  children: React.ReactNode;
}

const THRESHOLD = 64;
const MAX_OFFSET = 80;

export function SwipeableMessage({ onReply, children }: SwipeableMessageProps) {
  const [offset, setOffset] = useState(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const triggeredRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
    triggeredRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.touches[0].clientX - startXRef.current;
    if (deltaX > 0) {
      const clamped = Math.min(deltaX, MAX_OFFSET);
      setOffset(clamped);
      if (clamped >= THRESHOLD && !triggeredRef.current) {
        triggeredRef.current = true;
        onReply();
        if ("vibrate" in navigator) navigator.vibrate(12);
      }
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setOffset(0);
  };

  const iconOpacity = Math.min(offset / THRESHOLD, 1);

  return (
    <div
      className="relative w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute left-2 top-1/2 flex items-center justify-center pointer-events-none"
        style={{
          opacity: iconOpacity,
          transform: `translateX(${offset * 0.35}px) translateY(-50%)`,
        }}
      >
        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shadow">
          <Reply className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? "transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
