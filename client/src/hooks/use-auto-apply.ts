import { useEffect, useCallback } from "react";
import { useAssistantStore } from "@/hooks/use-assistant-store";
import { useMutation } from "@tanstack/react-query";
import { useCodeActions } from "./use-code-actions";

export function useAutoRestart() {
  const { settings, pendingChanges } = useAssistantStore();
  const { configureWorkflow } = useCodeActions();

  const restartWorkflow = useCallback(async () => {
    if (!settings.autoRestartWorkflow) return;
    
    try {
      // Restart the main workflow after code changes
      await fetch("/api/workflow/restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to restart workflow:", error);
    }
  }, [settings.autoRestartWorkflow]);

  // Auto-restart when changes are applied
  useEffect(() => {
    if (pendingChanges.length === 0 && settings.autoRestartWorkflow) {
      const timer = setTimeout(() => {
        restartWorkflow();
      }, 1000); // Wait 1 second after changes applied
      
      return () => clearTimeout(timer);
    }
  }, [pendingChanges.length, settings.autoRestartWorkflow, restartWorkflow]);

  return { restartWorkflow };
}

interface ApplyChangesResponse {
  success: boolean;
  filesUpdated: number;
  errors?: string[];
}

export function useAutoApply() {
  const { 
    settings, 
    pendingChanges, 
    applyPendingChanges, 
    clearPendingChanges,
    files 
  } = useAssistantStore();

  const applyChangesMutation = useMutation({
    mutationFn: async (changes: typeof pendingChanges) => {
      const response = await fetch('/api/files/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply changes');
      }

      return response.json() as Promise<ApplyChangesResponse>;
    },
    onSuccess: () => {
      applyPendingChanges();
    },
  });

  const handleAutoApply = useCallback(() => {
    if (settings.autoApplyChanges && pendingChanges.length > 0) {
      applyChangesMutation.mutate(pendingChanges);
    }
  }, [settings.autoApplyChanges, pendingChanges, applyChangesMutation]);

  useEffect(() => {
    handleAutoApply();
  }, [pendingChanges, handleAutoApply]);

  const manualApply = useCallback(() => {
    if (pendingChanges.length > 0) {
      applyChangesMutation.mutate(pendingChanges);
    }
  }, [pendingChanges, applyChangesMutation]);

  const cancelChanges = useCallback(() => {
    clearPendingChanges();
  }, [clearPendingChanges]);

  return {
    isApplying: applyChangesMutation.isPending,
    applyChanges: manualApply,
    cancelChanges,
    pendingCount: pendingChanges.length,
  };
}