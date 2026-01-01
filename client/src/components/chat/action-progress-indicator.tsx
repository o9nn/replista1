
import { Loader2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ActionProgressProps {
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

export function ActionProgressIndicator({ action, status, progress, error }: ActionProgressProps) {
  return (
    <Card className="p-3 border-muted">
      <div className="flex items-center gap-2 mb-2">
        {status === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        {status === 'completed' && <Check className="h-4 w-4 text-green-500" />}
        {status === 'failed' && <X className="h-4 w-4 text-red-500" />}
        <span className="text-sm font-medium">{action}</span>
      </div>
      
      {progress !== undefined && status === 'in_progress' && (
        <Progress value={progress} className="h-1 mb-2" />
      )}
      
      {error && (
        <div className="text-xs text-red-500 mt-1">{error}</div>
      )}
    </Card>
  );
}
