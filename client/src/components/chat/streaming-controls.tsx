
import { Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StreamingControlsProps {
  isStreaming: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function StreamingControls({
  isStreaming,
  isPaused,
  onPause,
  onResume,
  onCancel,
}: StreamingControlsProps) {
  if (!isStreaming) return null;

  return (
    <div className="border-b bg-muted/30 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className={cn(
            "h-2 w-2 rounded-full animate-pulse",
            isPaused ? "bg-yellow-500" : "bg-green-500"
          )} />
          <span className="text-sm text-muted-foreground">
            {isPaused ? 'Paused' : 'Streaming response...'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isPaused ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPause}
            className="h-8 gap-2"
          >
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResume}
            className="h-8 gap-2"
          >
            <Play className="h-4 w-4" />
            Resume
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 gap-2 text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
