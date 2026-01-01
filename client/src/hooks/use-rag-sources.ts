import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { useState } from "react";

export interface RAGSource {
  id: number;
  sourceType: 'file' | 'url' | 'manual';
  sourcePath?: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export function useRAGSources() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loadingSources, setLoadingSources] = useState<Set<number>>(new Set());

  const { data: sources = [] } = useQuery<RAGSource[]>({
    queryKey: ["rag-sources"],
    queryFn: async () => {
      const response = await fetch("/api/rag/sources");
      if (!response.ok) throw new Error("Failed to fetch RAG sources");
      return response.json();
    },
  });

  const addSource = useMutation({
    mutationFn: async (source: { type: 'file' | 'url' | 'manual'; content: string; metadata?: any }) => {
      const response = await fetch("/api/rag/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source),
      });
      if (!response.ok) throw new Error("Failed to add RAG source");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rag-sources"] });
      toast({ title: "RAG source added successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add RAG source",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeSource = useMutation({
    mutationFn: async (sourceId: number) => {
      const response = await fetch(`/api/rag/sources/${sourceId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove RAG source");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rag-sources"] });
      toast({ title: "RAG source removed successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove RAG source",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loadSource = async (source: RAGSource) => {
    if (!source.id) return;
    
    setLoadingSources(prev => new Set(prev).add(source.id));
    
    try {
      const response = await fetch(`/api/rag/sources/${source.id}`);
      if (!response.ok) throw new Error("Failed to load RAG source");
      
      const loadedSource = await response.json();
      queryClient.setQueryData<RAGSource[]>(["rag-sources"], (old = []) =>
        old.map(s => s.id === source.id ? loadedSource : s)
      );
      
      toast({ title: "Source loaded successfully" });
    } catch (error) {
      toast({
        title: "Failed to load source",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoadingSources(prev => {
        const next = new Set(prev);
        next.delete(source.id);
        return next;
      });
    }
  };

  const indexSources = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/rag/sources/reindex", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to index sources");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rag-sources"] });
      toast({ title: "Sources indexed successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to index sources",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    sources,
    loadingSources,
    addSource: addSource.mutate,
    removeSource: removeSource.mutate,
    loadSource,
    indexSources: indexSources.mutate,
    isAddingSource: addSource.isPending,
    isRemovingSource: removeSource.isPending,
    isIndexing: indexSources.isPending,
  };
}