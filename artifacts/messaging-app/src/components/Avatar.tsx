import React from "react";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
}

export function Avatar({ src, name = "Unknown", size = "md", className, onClick }: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", 
    "bg-rose-500", "bg-amber-500", "bg-indigo-500"
  ];
  
  const colorIndex = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  const isClickable = !!onClick && !!src;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ring-2 ring-background shadow-sm",
        sizeClasses[size],
        bgColor,
        isClickable && "cursor-pointer hover:ring-primary/60 hover:ring-4 transition-all",
        className
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
  );
}
