import React from "react";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
  online?: boolean;
}

export function Avatar({ src, name = "Unknown", size = "md", className, onClick, online }: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  // Dot size relative to avatar size
  const dotClasses = {
    sm: "w-2.5 h-2.5 border-[1.5px] -bottom-px -right-px",
    md: "w-3 h-3 border-2 bottom-0 right-0",
    lg: "w-3.5 h-3.5 border-2 bottom-0 right-0",
    xl: "w-4 h-4 border-2 bottom-0.5 right-0.5",
  };

  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500",
    "bg-rose-500", "bg-amber-500", "bg-indigo-500",
  ];

  const colorIndex = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];
  const isClickable = !!onClick && !!src;

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        onClick={isClickable ? onClick : undefined}
        className={cn(
          "inline-flex items-center justify-center rounded-full overflow-hidden ring-2 ring-background shadow-sm",
          sizeClasses[size],
          bgColor,
          isClickable && "cursor-pointer hover:ring-primary/60 hover:ring-4 transition-all",
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-semibold text-white tracking-wide">
            {getInitials(name)}
          </span>
        )}
      </div>

      {/* Online indicator dot */}
      {online && (
        <span
          className={cn(
            "absolute rounded-full bg-emerald-500 border-background",
            dotClasses[size],
          )}
        />
      )}
    </div>
  );
}
