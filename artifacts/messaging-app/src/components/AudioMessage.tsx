import { useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioMessageProps {
  dataUrl: string;
  isOwn: boolean;
}

export function AudioMessage({ dataUrl, isOwn }: AudioMessageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Convert data URL → Blob URL once on mount (data URLs are unreliable for audio)
  useEffect(() => {
    let cancelled = false;
    const [header, base64] = dataUrl.split(",");
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch?.[1] ?? "audio/webm";

    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      if (!cancelled) {
        blobUrlRef.current = url;
        setBlobUrl(url);
      }
    } catch {
      // fallback: let the audio element try the data URL directly
      if (!cancelled) setBlobUrl(dataUrl);
    }

    return () => {
      cancelled = true;
      if (blobUrlRef.current && blobUrlRef.current !== dataUrl) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [dataUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn(
      "flex items-center gap-2.5 px-3 py-2.5 rounded-2xl shadow-sm min-w-[220px] max-w-[280px]",
      isOwn
        ? "bg-gradient-to-br from-primary to-violet-500 rounded-br-sm"
        : "bg-secondary rounded-bl-sm border border-white/5"
    )}>
      {/* Hidden native audio element */}
      {blobUrl && (
        <audio
          ref={audioRef}
          src={blobUrl}
          preload="metadata"
          onLoadedMetadata={() => {
            setDuration(audioRef.current?.duration ?? 0);
            setIsLoading(false);
          }}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        />
      )}

      {/* Play/pause button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className={cn(
          "shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          isOwn
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-primary/20 hover:bg-primary/30 text-primary"
        )}
      >
        {isLoading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : isPlaying
          ? <Pause className="w-4 h-4" />
          : <Play className="w-4 h-4 ml-0.5" />
        }
      </button>

      {/* Waveform-style scrubber + time */}
      <div className="flex-1 flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 appearance-none rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${isOwn ? "rgba(255,255,255,0.9)" : "hsl(var(--primary))"} ${progress}%, ${isOwn ? "rgba(255,255,255,0.3)" : "hsl(var(--muted))"} ${progress}%)`,
          }}
        />
        <div className={cn(
          "flex justify-between text-[10px] tabular-nums",
          isOwn ? "text-white/70" : "text-muted-foreground"
        )}>
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
