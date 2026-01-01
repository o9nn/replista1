import { useEffect, useState } from 'react';
import { useState, useEffect } from 'react';
import { Play, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCodeActions } from '@/hooks/use-code-actions';

interface WorkflowState {
  name: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  lastRun?: string;
  error?: string;
}

export function WorkflowStatus() {
  const [workflows, setWorkflows] = useState<WorkflowState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { getWorkflowStatus } = useCodeActions();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const result = await getWorkflowStatus();
        if (result?.workflows) {
          setWorkflows(result.workflows);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch workflow status');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [getWorkflowStatus]);

  if (workflows.length === 0 && !error) return null;

  const activeWorkflow = workflows.find(w => w.status === 'running') || workflows[0];

  if (error) {
    return (
      <Card className="p-2 border-muted border-red-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3 w-3 text-red-500" />
          <span className="text-xs text-red-600 truncate flex-1">{error}</span>
        </div>
      </Card>
    );
  }

  if (!activeWorkflow) return null;

  const handleRestartWorkflow = async () => {
    try {
      await getWorkflowStatus(); // Refresh status after restart
    } catch (err) {
      console.error('Failed to restart workflow:', err);
    }
  };

  return (
    <Card className="p-2 border-muted">
      <div className="flex items-center gap-2">
        {activeWorkflow.status === 'running' ? (
          <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
        ) : activeWorkflow.status === 'success' ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : activeWorkflow.status === 'failed' ? (
          <AlertCircle className="h-3 w-3 text-red-500" />
        ) : (
          <Play className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-xs font-medium truncate flex-1">
          {activeWorkflow.name}
        </span>
        <Badge 
          variant={activeWorkflow.status === 'running' ? 'default' : 'secondary'}
          className="text-xs px-1.5 py-0"
        >
          {activeWorkflow.status}
        </Badge>
      </div>
      {activeWorkflow.error && (
        <div className="text-xs text-red-600 mt-1 truncate">
          {activeWorkflow.error}
        </div>
      )}
      {activeWorkflow.lastRun && (
        <div className="text-xs text-muted-foreground mt-1">
          Last run: {new Date(activeWorkflow.lastRun).toLocaleTimeString()}
        </div>
      )}
    </Card>
  );
}