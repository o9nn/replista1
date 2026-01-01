
import { pgTable, text, timestamp, jsonb, serial, vector } from "drizzle-orm/pg-core";

export const ragSources = pgTable("rag_sources", {
  id: serial("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  sourcePath: text("source_path"),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
