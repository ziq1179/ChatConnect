import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY || "dc6zaTOxFJmzC";
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

interface GifResult {
  id: string;
  title: string;
  images: {
    fixed_height_small: { url: string; width: string; height: string };
    original: { url: string };
  };
}

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGifs = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = q.trim()
        ? `${GIPHY_BASE}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=20&rating=pg`
        : `${GIPHY_BASE}/trending?api_key=${GIPHY_KEY}&limit=20&rating=pg`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to load GIFs");
      const json = await res.json();
      setGifs(json.data ?? []);
    } catch {
      setError("Could not load GIFs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifs("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [fetchGifs]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchGifs]);

  return (
    <div className="flex flex-col w-72 sm:w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onClose} className="ml-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-64 overflow-y-auto p-2">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center px-4">{error}</div>
        ) : gifs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No GIFs found</div>
        ) : (
          <div className="columns-2 gap-2 space-y-2">
            {gifs.map(gif => (
              <button
                key={gif.id}
                onClick={() => { onSelect(gif.images.original.url); onClose(); }}
                className="w-full break-inside-avoid rounded-lg overflow-hidden hover:opacity-80 active:scale-95 transition-all"
                title={gif.title}
              >
                <img
                  src={gif.images.fixed_height_small.url}
                  alt={gif.title}
                  className="w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground text-right">
        Powered by GIPHY
      </div>
    </div>
  );
}
