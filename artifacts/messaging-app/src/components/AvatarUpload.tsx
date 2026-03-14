import React, { useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  name: string;
  currentAvatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  onUploaded?: () => void;
  className?: string;
  editable?: boolean;
}

function resizeToDataUrl(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

export function AvatarUpload({
  name,
  currentAvatarUrl,
  size = "md",
  onUploaded,
  className,
  editable = true,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const resolvedSrc = localPreview ?? currentAvatarUrl ?? null;

  const handleClick = () => {
    if (!editable || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    setIsUploading(true);
    try {
      // Resize to max 256px and compress to JPEG at 85% quality.
      // A 256×256 JPEG at 85% is typically 15–40 KB (20–55 KB as base64).
      const imageData = await resizeToDataUrl(file, 256, 0.85);

      setLocalPreview(imageData);

      const res = await fetch("/api/auth/profile/avatar", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload failed");
      }

      onUploaded?.();
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setLocalPreview(null);
      alert(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className={cn("relative inline-flex shrink-0 group", className)}
      onClick={handleClick}
      style={editable ? { cursor: isUploading ? "default" : "pointer" } : undefined}
      title={editable ? "Change profile picture" : undefined}
    >
      <Avatar src={resolvedSrc} name={name} size={size} />

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        </div>
      )}

      {editable && !isUploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-4 h-4 text-white" />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
