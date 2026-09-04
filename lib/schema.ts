import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const pins = pgTable(
  "pins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    title: text("title"),
    imageUrl: text("image_url"),
    note: text("note"),
    pinnedBy: text("pinned_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("pins_created_at_idx").on(table.createdAt.desc())],
);

export type Pin = typeof pins.$inferSelect;
