
import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { applyFileEdit, type FileEdit } from '@/lib/code-change-applier';
import { useCodeActions } from './use-code-actions';

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

export function useBatchActions() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const { toast } = useToast();
  const { executeShellCommand } = useCodeActions();

  const processFileEdits = useCallback(async (edits: FileEdit[]) => {
    setIsProcessing(true);
    setProgress({ total: edits.length, completed: 0, failed: 0 });

    const results = {
      successful: [] as FileEdit[],
      failed: [] as Array<{ edit: FileEdit; error: string }>,
    };

    for (let i = 0; i < edits.length; i++) {
      const edit = edits[i];
      setProgress(prev => prev ? { ...prev, current: edit.file } : null);

      try {
        await applyFileEdit(edit);
        results.successful.push(edit);
        setProgress(prev => prev ? { ...prev, completed: prev.completed + 1 } : null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ edit, error: errorMessage });
        setProgress(prev => prev ? { ...prev, failed: prev.failed + 1, completed: prev.completed + 1 } : null);
      }

      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsProcessing(false);
    setProgress(null);

    // Show summary toast
    if (results.failed.length === 0) {
      toast({
        title: 'All changes applied',
        description: `Successfully applied ${results.successful.length} file edits`,
      });
    } else {
      toast({
        title: 'Batch processing complete',
        description: `${results.successful.length} succeeded, ${results.failed.length} failed`,
        variant: results.successful.length === 0 ? 'destructive' : 'default',
      });
    }

    return results;
  }, [toast]);

  const processShellCommands = useCallback(async (commands: Array<{ command: string; workingDirectory?: string }>) => {
    setIsProcessing(true);
    setProgress({ total: commands.length, completed: 0, failed: 0 });

    const results = {
      successful: [] as typeof commands,
      failed: [] as Array<{ command: typeof commands[0]; error: string }>,
    };

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      setProgress(prev => prev ? { ...prev, current: cmd.command } : null);

      try {
        await executeShellCommand(cmd.command, cmd.workingDirectory);
        results.successful.push(cmd);
        setProgress(prev => prev ? { ...prev, completed: prev.completed + 1 } : null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ command: cmd, error: errorMessage });
        setProgress(prev => prev ? { ...prev, failed: prev.failed + 1, completed: prev.completed + 1 } : null);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setIsProcessing(false);
    setProgress(null);

    if (results.failed.length === 0) {
      toast({
        title: 'All commands executed',
        description: `Successfully ran ${results.successful.length} commands`,
      });
    } else {
      toast({
        title: 'Command execution complete',
        description: `${results.successful.length} succeeded, ${results.failed.length} failed`,
        variant: results.successful.length === 0 ? 'destructive' : 'default',
      });
    }

    return results;
  }, [toast, executeShellCommand]);

  return {
    isProcessing,
    progress,
    processFileEdits,
    processShellCommands,
  };
}
