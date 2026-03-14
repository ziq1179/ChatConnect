import { cn } from "@/lib/utils";

function getYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?[^#]*)?$/i.test(url);
}

export function isVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  return !!getYouTubeId(trimmed) || !!getVimeoId(trimmed) || isDirectVideo(trimmed);
}

interface VideoMessageProps {
  url: string;
  isOwn: boolean;
}

export function VideoMessage({ url, isOwn }: VideoMessageProps) {
  const trimmed = url.trim();
  const ytId = getYouTubeId(trimmed);
  const vimeoId = getVimeoId(trimmed);

  const wrapper = cn(
    "overflow-hidden shadow-md w-[260px] sm:w-[300px]",
    isOwn ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"
  );

  if (ytId) {
    return (
      <div className={wrapper}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          className="w-full aspect-video block border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title="YouTube video"
        />
      </div>
    );
  }

  if (vimeoId) {
    return (
      <div className={wrapper}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0`}
          className="w-full aspect-video block border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title="Vimeo video"
        />
      </div>
    );
  }

  if (isDirectVideo(trimmed)) {
    return (
      <div className={wrapper}>
        <video
          src={trimmed}
          controls
          className="w-full max-h-56 object-contain bg-black block"
          preload="metadata"
        />
      </div>
    );
  }

  return null;
}
