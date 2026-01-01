
import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useBatchActions } from '@/hooks/use-batch-actions';

export function ActionStatusPanel() {
  const { isProcessing, progress } = useBatchActions();

  if (!isProcessing || !progress) return null;

  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <Card className="p-3 border-muted bg-muted/30">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="font-medium">Processing Actions</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {progress.completed}/{progress.total}
          </div>
        </div>

        <Progress value={percentage} className="h-2" />

        {progress.current && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span className="font-mono truncate">{progress.current}</span>
          </div>
        )}

        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span>{progress.completed - progress.failed} completed</span>
          </div>
          {progress.failed > 0 && (
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span>{progress.failed} failed</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
