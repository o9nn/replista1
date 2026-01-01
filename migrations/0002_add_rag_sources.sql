
CREATE TABLE IF NOT EXISTS "rag_sources" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "content" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "rag_sources_type_idx" ON "rag_sources" ("type");
CREATE INDEX IF NOT EXISTS "rag_sources_content_idx" ON "rag_sources" USING gin(to_tsvector('english', "content"));
