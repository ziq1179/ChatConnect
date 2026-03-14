import { useEffect, useRef, useState, useCallback } from "react";

const PING_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = 30_000;

async function ping() {
  try {
    await fetch("/api/presence/ping", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // silently ignore network errors
  }
}

async function fetchOnlineIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    const res = await fetch(`/api/presence?ids=${ids.join(",")}`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.online ?? [];
  } catch {
    return [];
  }
}

/**
 * usePresence — tracks online status for a given set of user IDs.
 *
 * - Pings the server every 30s to mark the current user as online.
 * - Polls presence for the supplied `watchIds` every 30s.
 * - Returns a `Set<string>` of user IDs that are currently online.
 */
export function usePresence(watchIds: string[]): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const watchRef = useRef<string[]>(watchIds);
  watchRef.current = watchIds;

  // Stable poll function
  const poll = useCallback(async () => {
    const ids = watchRef.current;
    if (ids.length === 0) return;
    const online = await fetchOnlineIds(ids);
    setOnlineIds(new Set(online));
  }, []);

  useEffect(() => {
    // Ping immediately, then on interval
    ping();
    const pingTimer = setInterval(ping, PING_INTERVAL_MS);

    // Poll presence immediately, then on interval
    poll();
    const pollTimer = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pingTimer);
      clearInterval(pollTimer);
    };
  }, [poll]);

  // Re-poll whenever the watchIds list changes (new conversation selected, etc.)
  const prevIdsRef = useRef<string>("");
  const serialized = [...watchIds].sort().join(",");
  useEffect(() => {
    if (serialized !== prevIdsRef.current) {
      prevIdsRef.current = serialized;
      poll();
    }
  }, [serialized, poll]);

  return onlineIds;
}
