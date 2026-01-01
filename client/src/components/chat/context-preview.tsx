
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContextFile {
  path: string;
  content: string;
  language?: string;
}

interface ContextPreviewProps {
  files: ContextFile[];
  onRemove: (path: string) => void;
}

export function ContextPreview({ files, onRemove }: ContextPreviewProps) {
  if (files.length === 0) return null;

  return (
    <Card className="p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Context ({files.length} {files.length === 1 ? 'file' : 'files'})
          </span>
        </div>
      </div>
      <ScrollArea className="max-h-32">
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-center justify-between p-2 rounded bg-secondary/50"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge variant="outline" className="text-xs">
                  {file.language || 'text'}
                </Badge>
                <span className="text-sm truncate">{file.path}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(file.path)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
