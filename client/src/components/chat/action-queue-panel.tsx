
import { X, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActionQueue, type QueuedAction } from '@/hooks/use-action-queue';

export function ActionQueuePanel() {
  const { queue, clearCompleted, clearAll, pendingCount, inProgressCount, completedCount, failedCount } = useActionQueue();

  if (queue.length === 0) return null;

  const getActionIcon = (action: QueuedAction) => {
    switch (action.status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 text-muted-foreground" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getActionLabel = (action: QueuedAction) => {
    switch (action.type) {
      case 'file_edit':
        return `Edit ${action.data.file}`;
      case 'shell_command':
        return `Run: ${action.data.command}`;
      case 'package_install':
        return `Install ${action.data.packages?.join(', ')}`;
      case 'workflow_config':
        return `Configure workflow: ${action.data.name}`;
      case 'deployment_config':
        return 'Configure deployment';
    }
  };

  return (
    <Card className="p-3 border-muted">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Action Queue</div>
        <div className="flex gap-1">
          {completedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCompleted} className="h-6 text-xs">
              Clear Completed
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 px-2">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 text-xs text-muted-foreground mb-2">
        <span>Pending: {pendingCount}</span>
        <span>In Progress: {inProgressCount}</span>
        <span>Completed: {completedCount}</span>
        {failedCount > 0 && <span className="text-red-500">Failed: {failedCount}</span>}
      </div>

      <ScrollArea className="max-h-48">
        <div className="space-y-1">
          {queue.map(action => (
            <div
              key={action.id}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs"
            >
              {getActionIcon(action)}
              <span className="flex-1 font-mono truncate">{getActionLabel(action)}</span>
              {action.error && (
                <span className="text-red-500 text-xs">{action.error}</span>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
