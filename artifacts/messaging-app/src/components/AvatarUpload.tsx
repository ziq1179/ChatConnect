import React, { useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  name: string;
  currentAvatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  onUploaded?: (objectPath: string) => void;
  className?: string;
  editable?: boolean;
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

  const resolvedSrc = localPreview
    ?? (currentAvatarUrl ? `/api/storage${currentAvatarUrl}` : null);

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
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB.");
      return;
    }

    // Show a local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setLocalPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      // Step 1: request a presigned upload URL
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      // Step 2: upload the file directly to object storage
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload image");

      // Step 3: save the objectPath on the user profile
      const saveRes = await fetch("/api/auth/profile/avatar", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath }),
      });
      if (!saveRes.ok) throw new Error("Failed to save avatar");

      onUploaded?.(objectPath);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setLocalPreview(null);
      alert("Upload failed. Please try again.");
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
