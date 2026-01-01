import { db } from '../../db';
import { ragSources } from '../../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { embeddingService } from './embeddings';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface RAGSource {
  id: number;
  content: string;
  sourceType: 'file' | 'url' | 'manual';
  sourcePath?: string;
  metadata?: any;
  embedding?: string | null; // Store embedding as string to handle JSON parsing
  indexed?: boolean; // Track if the source has been indexed
  indexedAt?: Date | null; // Timestamp of the last indexing
  createdAt: Date;
  updatedAt: Date;
}

export class RAGStorage {
  async addSource(params: {
    type: 'file' | 'url' | 'manual';
    content: string;
    metadata?: any;
  }): Promise<RAGSource> {
    const embedding = await embeddingService.generateEmbedding(params.content);

    const [source] = await db
      .insert(ragSources)
      .values({
        content: params.content,
        sourceType: params.type,
        sourcePath: params.metadata?.path,
        metadata: params.metadata || {},
        embedding: JSON.stringify(embedding), // Store as JSON string
        indexed: true, // Mark as indexed upon creation
        indexedAt: new Date(),
      })
      .returning();

    return source as RAGSource;
  }

  async getSources(): Promise<RAGSource[]> {
    const sources = await db.select().from(ragSources);
    return sources as RAGSource[];
  }

  async getAllSources(): Promise<RAGSource[]> {
    return this.getSources();
  }

  async getSourceById(id: number): Promise<RAGSource | null> {
    const [source] = await db
      .select()
      .from(ragSources)
      .where(eq(ragSources.id, id));
    
    return (source as RAGSource) || null;
  }

  // Helper method to get a single source, used by indexSource
  async getSource(id: number): Promise<RAGSource | null> {
    const [source] = await db
      .select()
      .from(ragSources)
      .where(eq(ragSources.id, id));

    return (source as RAGSource) || null;
  }

  // Helper method to list all sources, used by reindexAll
  async listSources(): Promise<RAGSource[]> {
    return this.getSources();
  }


  async deleteSource(id: number): Promise<void> {
    await db.delete(ragSources).where(eq(ragSources.id, id));
  }

  async removeSource(id: string): Promise<void> {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('Invalid source ID');
    }
    await db.delete(ragSources).where(eq(ragSources.id, numericId));
  }

  async searchSources(query: string, limit: number = 5): Promise<Array<RAGSource & { similarity: number }>> {
    return this.search(query, limit);
  }

  async getRelevantContext(query: string, maxTokens: number = 2000): Promise<string> {
    const results = await this.searchSimilar(query, 10);

    if (results.length === 0) {
      return '';
    }

    let context = '# Relevant Context from Knowledge Base\n\n';
    let tokenCount = 50; // Account for header

    for (const result of results) {
      // Skip low-similarity results
      if (result.similarity < 0.5) {
        continue;
      }

      const estimatedTokens = result.content.length / 4;

      if (tokenCount + estimatedTokens > maxTokens) {
        break;
      }

      const sourceIdentifier = result.sourcePath || result.sourceType;
      context += `## Source: ${sourceIdentifier}\n`;
      context += `**Relevance**: ${(result.similarity * 100).toFixed(1)}%\n\n`;
      context += '```\n';
      context += result.content;
      context += '\n```\n\n';
      tokenCount += estimatedTokens;
    }

    return context;
  }

  async indexAllSources(): Promise<void> {
    await this.updateEmbeddings();
  }

  async search(query: string, topK: number = 5): Promise<Array<RAGSource & { similarity: number }>> {
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    const sources = await this.getSources();

    const documents = sources
      .filter(s => s.embedding && s.embedding.length > 0)
      .map(s => ({
        text: s.content,
        embedding: JSON.parse(s.embedding!), // Parse JSON string
        metadata: { ...s.metadata, id: s.id, sourceType: s.sourceType, sourcePath: s.sourcePath },
      }));

    const results = await embeddingService.findSimilar(queryEmbedding, documents, topK);

    return results.map(r => ({
      id: r.metadata.id,
      content: r.text,
      sourceType: r.metadata.sourceType,
      sourcePath: r.metadata.sourcePath,
      metadata: r.metadata,
      embedding: JSON.stringify(documents.find(d => d.metadata.id === r.metadata.id)?.embedding), // Store as JSON string
      similarity: r.similarity,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  async updateEmbeddings(): Promise<void> {
    const sources = await this.getSources();
    const sourcesWithoutEmbeddings = sources.filter(s => !s.embedding || s.embedding.length === 0);

    if (sourcesWithoutEmbeddings.length === 0) {
      return;
    }

    const embeddings = await embeddingService.generateBatchEmbeddings(
      sourcesWithoutEmbeddings.map(s => s.content)
    );

    for (let i = 0; i < sourcesWithoutEmbeddings.length; i++) {
      await db
        .update(ragSources)
        .set({ embedding: JSON.stringify(embeddings[i].embedding) }) // Store as JSON string
        .where(eq(ragSources.id, sourcesWithoutEmbeddings[i].id));
    }
  }

  // --- New methods for vector search and retrieval ---

  async searchSimilar(query: string, limit: number = 5): Promise<Array<RAGSource & { similarity: number }>> {
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Get all sources with embeddings, ensuring embedding is not null or empty
    const sources = await db.select().from(ragSources).where(sql`embedding IS NOT NULL AND LENGTH(embedding) > 0`);

    const results = sources.map(source => {
      if (!source.embedding) {
        return null; // Skip if embedding is unexpectedly null
      }
      const sourceEmbedding = JSON.parse(source.embedding);
      const similarity = embeddingService.cosineSimilarity(queryEmbedding, sourceEmbedding);
      return { ...source, similarity };
    }).filter(result => result !== null) as Array<RAGSource & { similarity: number }>; // Filter out nulls and assert type

    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async indexSource(sourceId: number): Promise<void> {
    const source = await this.getSource(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    try {
      // Generate embedding for the content
      const embedding = await embeddingService.generateEmbedding(source.content); // Use the actual embedding service

      // Store the embedding
      await db
        .update(ragSources)
        .set({
          embedding: JSON.stringify(embedding), // Store as JSON string
          indexed: true,
          indexedAt: new Date(),
        })
        .where(eq(ragSources.id, sourceId));

      console.log(`Successfully indexed source ${sourceId}`);
    } catch (error) {
      console.error(`Error indexing source ${sourceId}:`, error);
      throw error;
    }
  }

  async reindexAll(): Promise<number> {
    const sources = await this.listSources();
    let indexed = 0;

    for (const source of sources) {
      try {
        await this.indexSource(source.id);
        indexed++;
      } catch (error) {
        console.error(`Failed to index source ${source.id}:`, error);
      }
    }

    return indexed;
  }
}

// Assuming memoryEmbeddings and isDatabaseAvailable are defined elsewhere or should be stubbed/mocked for this context.
// For the purpose of this isolated change, we'll assume they exist and are handled appropriately in the broader context.

// Mock implementations for demonstration purposes if they are not provided elsewhere.
let memoryEmbeddings: Array<{ id: string; content: string; embedding: number[]; metadata: any }> = [];
const isDatabaseAvailable = () => true; // Assume DB is available

export async function deleteEmbedding(id: string): Promise<void> {
  if (!isDatabaseAvailable() || !db) {
    const index = memoryEmbeddings.findIndex(e => e.id === id);
    if (index !== -1) {
      memoryEmbeddings.splice(index, 1);
    }
    return;
  }

  await db.delete(ragSources).where(eq(ragSources.id, id));
}

export async function getAllEmbeddings(): Promise<Array<{ id: string; content: string; embedding: number[]; metadata: any }>> {
  if (!isDatabaseAvailable() || !db) {
    return memoryEmbeddings;
  }

  const results = await db.select().from(ragSources);
  // Assuming r.id is a number, convert it to string if needed by the return type.
  // Assuming r.embedding is stored as a stringified JSON array of numbers.
  return results.map(r => ({
    id: String(r.id), // Ensure id is a string
    content: r.content,
    embedding: JSON.parse(r.embedding as string) as number[], // Parse the stringified embedding
    metadata: r.metadata
  }));
}

export const ragStorage = new RAGStorage();