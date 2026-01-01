import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export interface SearchResult {
  text: string;
  similarity: number;
  metadata?: any;
}

// Note: This function is implemented in storage.ts and exported from there
// We don't need a separate implementation here

export class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not set, returning mock embedding');
      // Return a mock embedding of the correct dimension
      return Array(1536).fill(0);
    }

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // Using the specified model
        input: text,
      });

      // Ensure the response structure is as expected and return the embedding
      if (response.data && response.data.length > 0 && response.data[0].embedding) {
        return response.data[0].embedding;
      } else {
        console.error('Unexpected response structure from OpenAI embeddings API');
        return new Array(1536).fill(0).map(() => Math.random()); // Fallback
      }
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Fallback to mock embedding if API fails
      return new Array(1536).fill(0).map(() => Math.random());
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not set, returning mock embeddings');
      return texts.map(text => ({
        text,
        embedding: Array(1536).fill(0),
      }));
    }

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // Using the specified model
        input: texts,
      });

      // Ensure response structure and map correctly
      if (response.data && response.data.length === texts.length) {
        return response.data.map((item, index) => ({
          text: texts[index],
          embedding: item.embedding,
        }));
      } else {
        console.error('Unexpected response structure or length mismatch from OpenAI batch embeddings API');
        // Fallback to mock embeddings
        return texts.map(text => ({
          text,
          embedding: new Array(1536).fill(0).map(() => Math.random()),
        }));
      }
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      // Fallback to mock embeddings if API fails
      return texts.map(text => ({
        text,
        embedding: new Array(1536).fill(0).map(() => Math.random()),
      }));
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      console.error('Vectors must have same length for cosine similarity');
      return 0; // Return 0 or throw error based on desired behavior
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    // Handle cases where one or both vectors have zero magnitude
    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async findSimilar(
    queryEmbedding: number[],
    documents: Array<{ text: string; embedding: number[]; metadata?: any }>,
    topK: number = 5
  ): Promise<SearchResult[]> {
    const similarities = documents.map(doc => ({
      text: doc.text,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding),
      metadata: doc.metadata,
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

export const embeddingService = new EmbeddingService();

// Import getAllEmbeddings from storage
import { getAllEmbeddings } from './storage';

// New function for vector similarity search, integrating with getAllEmbeddings and cosineSimilarity
export async function searchSimilar(query: string, limit: number = 5): Promise<Array<{ content: string; metadata: any; similarity: number }>> {
  try {
    const queryEmbedding = await embeddingService.generateEmbedding(query); // Use the service instance

    // Get all stored embeddings from the database
    const allEmbeddings = await getAllEmbeddings();

    // Calculate cosine similarity for each document
    const similarities = allEmbeddings.map(item => ({
      content: item.content,
      metadata: item.metadata,
      similarity: embeddingService.cosineSimilarity(queryEmbedding, item.embedding) // Use the service instance
    }));

    // Sort by similarity and take top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('Error searching similar embeddings:', error);
    return []; // Return empty array in case of error
  }
}

// Ensure generateEmbedding and cosineSimilarity are accessible if searchSimilar is in a separate file
// If searchSimilar is in the same file as EmbeddingService, it can access them directly or via the instance.
// For clarity, assuming they are in the same file or exported properly.
async function generateEmbedding(text: string): Promise<number[]> {
  return embeddingService.generateEmbedding(text);
}

function cosineSimilarity(a: number[], b: number[]): number {
  return embeddingService.cosineSimilarity(a, b);
}