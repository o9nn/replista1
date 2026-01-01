
import { Play, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useBatchOperations } from "@/hooks/use-batch-operations";

export function BatchOperationsPanel() {
  const {
    operations,
    isProcessing,
    processBatch,
    clearCompleted,
    clearAll,
    pendingCount,
    completedCount,
    failedCount,
  } = useBatchOperations();

  if (operations.length === 0) return null;

  const totalCount = operations.length;
  const progress = totalCount > 0 
    ? ((completedCount + failedCount) / totalCount) * 100 
    : 0;

  return (
    <Card className="p-3 border-muted">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Batch Operations</span>
          <div className="flex gap-1">
            <Badge variant="secondary">{pendingCount} pending</Badge>
            {completedCount > 0 && (
              <Badge variant="default">{completedCount} done</Badge>
            )}
            {failedCount > 0 && (
              <Badge variant="destructive">{failedCount} failed</Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-1">
          {pendingCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={processBatch}
              disabled={isProcessing}
              className="h-6"
            >
              <Play className="h-3 w-3 mr-1" />
              Process All
            </Button>
          )}
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              className="h-6"
            >
              Clear Done
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-2"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {isProcessing && (
        <div className="mb-2">
          <Progress value={progress} className="h-1" />
        </div>
      )}

      <ScrollArea className="max-h-48">
        <div className="space-y-1">
          {operations.map((op) => (
            <div
              key={op.id}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs"
            >
              {op.status === 'pending' && (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
              )}
              {op.status === 'in_progress' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {op.status === 'completed' && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {op.status === 'failed' && (
                <XCircle className="h-4 w-4 text-red-500" />
              )}

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{op.description}</div>
                {op.error && (
                  <div className="text-red-500 text-xs">{op.error}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
