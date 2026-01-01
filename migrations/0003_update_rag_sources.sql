
-- Drop the old table if it exists
DROP TABLE IF EXISTS "rag_sources";

-- Create the new table with proper schema
CREATE TABLE IF NOT EXISTS "rag_sources" (
  "id" SERIAL PRIMARY KEY,
  "source_type" text NOT NULL,
  "source_path" text,
  "content" text NOT NULL,
  "metadata" jsonb,
  "embedding" vector(1536),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "rag_sources_type_idx" ON "rag_sources" ("source_type");
CREATE INDEX IF NOT EXISTS "rag_sources_content_idx" ON "rag_sources" USING gin(to_tsvector('english', "content"));
CREATE INDEX IF NOT EXISTS "rag_sources_embedding_idx" ON "rag_sources" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
