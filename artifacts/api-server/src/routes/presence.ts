import { Router, type IRouter } from "express";

const router: IRouter = Router();

// In-memory store: userId -> last ping timestamp (ms)
const presenceStore = new Map<string, number>();

const ONLINE_TTL_MS = 90_000; // 90 seconds — covers a 30s ping interval with margin

function pruneStale() {
  const cutoff = Date.now() - ONLINE_TTL_MS;
  for (const [uid, ts] of presenceStore.entries()) {
    if (ts < cutoff) presenceStore.delete(uid);
  }
}

// POST /api/presence/ping — called every ~30s by the client while the tab is open
router.post("/presence/ping", (req, res): void => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  presenceStore.set(req.user.id, Date.now());
  res.json({ ok: true });
});

// GET /api/presence?ids=id1,id2,id3 — returns which of those user IDs are online
router.get("/presence", (req, res): void => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  pruneStale();

  const raw = typeof req.query.ids === "string" ? req.query.ids : "";
  const ids = raw ? raw.split(",").filter(Boolean) : [];

  const online = ids.filter(id => {
    const ts = presenceStore.get(id);
    return ts !== undefined && Date.now() - ts < ONLINE_TTL_MS;
  });

  res.json({ online });
});

export default router;
