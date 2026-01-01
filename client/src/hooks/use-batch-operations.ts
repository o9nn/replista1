
import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

export interface BatchOperation {
  id: string;
  type: 'file_edit' | 'shell_command' | 'package_install';
  description: string;
  data: any;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

export interface BatchResult {
  total: number;
  completed: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

export function useBatchOperations() {
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const addOperation = useCallback((
    type: BatchOperation['type'],
    description: string,
    data: any
  ) => {
    const operation: BatchOperation = {
      id: `batch-${Date.now()}-${Math.random()}`,
      type,
      description,
      data,
      status: 'pending',
    };
    setOperations(prev => [...prev, operation]);
    return operation.id;
  }, []);

  const updateOperation = useCallback((
    id: string,
    updates: Partial<BatchOperation>
  ) => {
    setOperations(prev =>
      prev.map(op => (op.id === id ? { ...op, ...updates } : op))
    );
  }, []);

  const processBatch = useCallback(async () => {
    const pendingOps = operations.filter(op => op.status === 'pending');
    if (pendingOps.length === 0) return;

    setIsProcessing(true);
    const results: BatchResult = {
      total: pendingOps.length,
      completed: 0,
      failed: 0,
      results: [],
    };

    for (const operation of pendingOps) {
      updateOperation(operation.id, { status: 'in_progress' });

      try {
        let response;

        switch (operation.type) {
          case 'file_edit':
            response = await fetch('/api/file-operations/edit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(operation.data),
            });
            break;

          case 'shell_command':
            response = await fetch('/api/shell/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command: operation.data.command }),
            });
            break;

          case 'package_install':
            response = await fetch('/api/package-manager/install', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(operation.data),
            });
            break;
        }

        if (!response?.ok) {
          throw new Error('Operation failed');
        }

        updateOperation(operation.id, { status: 'completed' });
        results.completed++;
        results.results.push({ id: operation.id, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateOperation(operation.id, {
          status: 'failed',
          error: errorMessage,
        });
        results.failed++;
        results.results.push({
          id: operation.id,
          success: false,
          error: errorMessage,
        });
      }
    }

    setIsProcessing(false);

    toast({
      title: 'Batch Processing Complete',
      description: `${results.completed} succeeded, ${results.failed} failed`,
      variant: results.failed > 0 ? 'destructive' : 'default',
    });

    return results;
  }, [operations, updateOperation, toast]);

  const clearCompleted = useCallback(() => {
    setOperations(prev => prev.filter(op => op.status !== 'completed'));
  }, []);

  const clearAll = useCallback(() => {
    setOperations([]);
  }, []);

  return {
    operations,
    isProcessing,
    addOperation,
    updateOperation,
    processBatch,
    clearCompleted,
    clearAll,
    pendingCount: operations.filter(op => op.status === 'pending').length,
    completedCount: operations.filter(op => op.status === 'completed').length,
    failedCount: operations.filter(op => op.status === 'failed').length,
  };
}
