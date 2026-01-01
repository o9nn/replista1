
import { useMutation, useQuery } from '@tanstack/react-query';

interface HoverParams {
  filePath: string;
  line: number;
  character: number;
}

interface DefinitionParams {
  filePath: string;
  line: number;
  character: number;
}

interface SymbolsParams {
  filePath: string;
}

interface CompletionsParams {
  filePath: string;
  line: number;
  character: number;
  triggerCharacter?: string;
}

interface DiagnosticsParams {
  filePath: string;
}

export function useCodeIntelligence() {
  const hoverMutation = useMutation({
    mutationFn: async (params: HoverParams) => {
      const response = await fetch('/api/code-intelligence/hover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get hover info');
      }

      return response.json();
    },
  });

  const definitionMutation = useMutation({
    mutationFn: async (params: DefinitionParams) => {
      const response = await fetch('/api/code-intelligence/definition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to find definition');
      }

      return response.json();
    },
  });

  const symbolsMutation = useMutation({
    mutationFn: async (params: SymbolsParams) => {
      const response = await fetch('/api/code-intelligence/symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get symbols');
      }

      return response.json();
    },
  });

  const completionsMutation = useMutation({
    mutationFn: async (params: CompletionsParams) => {
      const response = await fetch('/api/code-intelligence/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get completions');
      }

      return response.json();
    },
  });

  const diagnosticsMutation = useMutation({
    mutationFn: async (params: DiagnosticsParams) => {
      const response = await fetch('/api/code-intelligence/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get diagnostics');
      }

      return response.json();
    },
  });

  const { data: diagnosticsData } = useQuery({
    queryKey: ['diagnostics'],
    queryFn: async () => {
      const response = await fetch('/api/code-intelligence/diagnostics/all');
      if (!response.ok) throw new Error('Failed to fetch diagnostics');
      return response.json();
    },
    refetchInterval: 5000,
  });

  return {
    getHover: hoverMutation.mutateAsync,
    goToDefinition: definitionMutation.mutateAsync,
    getSymbols: symbolsMutation.mutateAsync,
    getCompletions: completionsMutation.mutateAsync,
    getDiagnostics: diagnosticsMutation.mutateAsync,
    isLoading: 
      hoverMutation.isPending ||
      definitionMutation.isPending ||
      symbolsMutation.isPending ||
      completionsMutation.isPending ||
      diagnosticsMutation.isPending,
  };
}
