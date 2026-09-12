import { index, json, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const sessionTable = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey().notNull(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (t) => [index("IDX_session_expire").on(t.expire)]
);

export type Session = typeof sessionTable.$inferSelect;