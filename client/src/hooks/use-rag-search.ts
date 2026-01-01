import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

interface RAGSource {
  id: number;
  sourceType: 'file' | 'url' | 'manual';
  sourcePath?: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RagSearchResult extends RAGSource {
  similarity: number;
}

export function useRAGSearch(query: string, enabled: boolean = true, limit: number = 5) {
  return useQuery({
    queryKey: ['/api/rag/search', query, limit],
    queryFn: async () => {
      if (!query.trim()) return [];

      const response = await fetch(`/api/rag/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to search RAG sources');
      }
      return response.json();
    },
    enabled: enabled && query.trim().length > 0,
    staleTime: 30000, // 30 seconds
  });
}

export function useRAGContext(messageContent: string) {
  const { data: ragResults, isLoading } = useRAGSearch(messageContent, true, 3);

  return {
    context: ragResults || [],
    isLoading,
    hasContext: ragResults && ragResults.length > 0
  };
}