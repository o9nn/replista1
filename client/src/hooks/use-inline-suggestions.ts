
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface InlineCodeSuggestion {
  id: string;
  type: 'fix' | 'refactor' | 'extract' | 'optimize';
  title: string;
  description: string;
  filePath: string;
  lineNumber: number;
  oldCode: string;
  newCode: string;
  confidence: number;
}

export function useInlineSuggestions(filePath?: string) {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState<InlineCodeSuggestion[]>([]);

  const { data: fetchedSuggestions } = useQuery({
    queryKey: ['inline-suggestions', filePath],
    queryFn: async () => {
      if (!filePath) return [];
      const response = await fetch(
        `/api/code-intelligence/suggestions?file=${encodeURIComponent(filePath)}`
      );
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    },
    enabled: !!filePath,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (fetchedSuggestions) {
      setSuggestions(fetchedSuggestions);
    }
  }, [fetchedSuggestions]);

  const applySuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const response = await fetch(
        `/api/code-intelligence/suggestions/${suggestionId}/apply`,
        {
          method: 'POST',
        }
      );
      if (!response.ok) throw new Error('Failed to apply suggestion');
      return response.json();
    },
    onSuccess: (_, suggestionId) => {
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      queryClient.invalidateQueries({ queryKey: ['inline-suggestions'] });
    },
  });

  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };

  return {
    suggestions,
    applySuggestion: applySuggestionMutation.mutate,
    dismissSuggestion,
    isApplying: applySuggestionMutation.isPending,
  };
}
