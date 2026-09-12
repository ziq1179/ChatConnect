import serverless from "serverless-http";
import app from "@workspace/api-server";
import { pool } from "@workspace/db";

let initialized = false;

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id          SERIAL PRIMARY KEY,
        message_id  INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id     TEXT NOT NULL,
        emoji       TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_unique_idx
        ON message_reactions (message_id, user_id, emoji);
    `);
    console.log("Migrations applied");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
  }
}

const handler = serverless(app);

export default async function handle(
  req: Parameters<typeof handler>[0],
  res: Parameters<typeof handler>[1],
) {
  if (!initialized) {
    initialized = true;
    await runMigrations();
  }
  return handler(req, res);
}