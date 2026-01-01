import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface CommandHistoryItem {
  id: string;
  command: string;
  output?: string;
  exitCode?: number;
  timestamp: Date;
  workingDirectory?: string;
}

export function useCommandHistory() {
  const queryClient = useQueryClient();
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['command-history'],
    queryFn: async () => {
      const response = await fetch('/api/shell/history');
      if (!response.ok) throw new Error('Failed to fetch command history');
      return response.json() as Promise<CommandHistoryItem[]>;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const executeCommandMutation = useMutation({
    mutationFn: async ({ command, workingDirectory }: { command: string; workingDirectory?: string }) => {
      const response = await fetch('/api/shell/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, workingDirectory }),
      });

      if (!response.ok) throw new Error('Failed to execute command');
      return response.json() as Promise<CommandHistoryItem>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['command-history'] });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/shell/history', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to clear history');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['command-history'] });
    },
  });

  const rerunCommand = useCallback((commandId: string) => {
    const command = history.find(cmd => cmd.id === commandId);
    if (command) {
      executeCommandMutation.mutate({
        command: command.command,
        workingDirectory: command.workingDirectory,
      });
    }
  }, [history, executeCommandMutation]);

  const addExecution = useCallback(async (execution: Omit<CommandHistoryItem, 'id' | 'timestamp'>) => {
    // Add to history via API
    try {
      const response = await fetch('/api/shell/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(execution),
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['command-history'] });
      }
    } catch (error) {
      console.error('Failed to add command to history:', error);
    }
  }, [queryClient]);

  return {
    history,
    isLoading,
    selectedCommandId,
    setSelectedCommandId,
    executeCommand: executeCommandMutation.mutate,
    rerunCommand,
    clearHistory: clearHistoryMutation.mutate,
    addExecution,
    isExecuting: executeCommandMutation.isPending,
    isClearing: clearHistoryMutation.isPending,
  };
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

interface CommandExecution {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  executedAt: string;
}

export function useCommandHistory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: history = [] } = useQuery<CommandExecution[]>({
    queryKey: ["command-history"],
    queryFn: async () => {
      const response = await fetch("/api/shell/history");
      if (!response.ok) throw new Error("Failed to fetch command history");
      return response.json();
    },
  });

  const addExecution = useMutation({
    mutationFn: async (execution: Omit<CommandExecution, 'id' | 'executedAt'>) => {
      const response = await fetch("/api/shell/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(execution),
      });
      if (!response.ok) throw new Error("Failed to save command execution");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-history"] });
    },
  });

  const clearHistory = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/shell/history", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to clear history");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["command-history"] });
      toast({ title: "Command history cleared" });
    },
  });

  return {
    history,
    addExecution: addExecution.mutate,
    clearHistory: clearHistory.mutate,
    isLoading: addExecution.isPending || clearHistory.isPending,
  };
}
