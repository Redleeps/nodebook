
import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const projectsTable = sqliteTable("projects", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  public: integer("public", { mode: 'boolean' }).notNull().default(false),
  created_at: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch('subsec'))`),
  updated_at: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch('subsec'))`),
  deleted_at: integer("deleted_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch('subsec'))`),
});
