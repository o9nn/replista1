
import { useState, useCallback } from 'react';

export interface QueuedAction {
  id: string;
  type: 'file_edit' | 'shell_command' | 'package_install' | 'workflow_config' | 'deployment_config';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  data: any;
  error?: string;
}

export function useActionQueue() {
  const [queue, setQueue] = useState<QueuedAction[]>([]);

  const addAction = useCallback((type: QueuedAction['type'], data: any) => {
    const action: QueuedAction = {
      id: `action-${Date.now()}-${Math.random()}`,
      type,
      status: 'pending',
      data,
    };
    setQueue(prev => [...prev, action]);
    return action.id;
  }, []);

  const updateAction = useCallback((id: string, updates: Partial<QueuedAction>) => {
    setQueue(prev => prev.map(action => 
      action.id === id ? { ...action, ...updates } : action
    ));
  }, []);

  const removeAction = useCallback((id: string) => {
    setQueue(prev => prev.filter(action => action.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(action => action.status !== 'completed'));
  }, []);

  const clearAll = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    addAction,
    updateAction,
    removeAction,
    clearCompleted,
    clearAll,
    pendingCount: queue.filter(a => a.status === 'pending').length,
    inProgressCount: queue.filter(a => a.status === 'in_progress').length,
    completedCount: queue.filter(a => a.status === 'completed').length,
    failedCount: queue.filter(a => a.status === 'failed').length,
  };
}
