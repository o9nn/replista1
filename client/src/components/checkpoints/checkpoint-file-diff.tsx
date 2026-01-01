
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { DiffViewer } from '@/components/diff/diff-viewer';

interface CheckpointFileDiffProps {
  checkpointId: string;
  previousCheckpointId?: string;
}

interface FileDiff {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  oldContent?: string;
  newContent?: string;
  additions: number;
  deletions: number;
}

export function CheckpointFileDiff({
  checkpointId,
  previousCheckpointId,
}: CheckpointFileDiffProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const { data: diffs, isLoading } = useQuery({
    queryKey: ['checkpoint-diffs', checkpointId, previousCheckpointId],
    queryFn: async () => {
      const params = new URLSearchParams({
        checkpointId,
        ...(previousCheckpointId && { previousCheckpointId }),
      });
      const response = await fetch(`/api/checkpoints/diff?${params}`);
      if (!response.ok) throw new Error('Failed to fetch checkpoint diffs');
      return response.json() as Promise<FileDiff[]>;
    },
  });

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const typeColors = {
    added: 'text-green-600 bg-green-500/10',
    modified: 'text-blue-600 bg-blue-500/10',
    deleted: 'text-red-600 bg-red-500/10',
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading diffs...</div>;
  }

  if (!diffs || diffs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No file changes in this checkpoint
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground mb-4">
        {diffs.length} file{diffs.length !== 1 ? 's' : ''} changed
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {diffs.map((diff) => (
            <Card key={diff.path} className="overflow-hidden">
              <button
                onClick={() => toggleFile(diff.path)}
                className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedFiles.has(diff.path) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <FileText className="h-4 w-4" />
                  <span className="font-mono text-sm">{diff.path}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      typeColors[diff.type]
                    }`}
                  >
                    {diff.type}
                  </span>
                </div>
                <div className="flex gap-4 text-xs">
                  {diff.additions > 0 && (
                    <span className="text-green-600">+{diff.additions}</span>
                  )}
                  {diff.deletions > 0 && (
                    <span className="text-red-600">-{diff.deletions}</span>
                  )}
                </div>
              </button>

              {expandedFiles.has(diff.path) && (
                <div className="border-t">
                  {diff.type === 'modified' && diff.oldContent && diff.newContent ? (
                    <DiffViewer
                      oldContent={diff.oldContent}
                      newContent={diff.newContent}
                      language="typescript"
                    />
                  ) : diff.type === 'added' && diff.newContent ? (
                    <div className="bg-green-500/5 p-4">
                      <pre className="text-xs overflow-x-auto">
                        <code>{diff.newContent}</code>
                      </pre>
                    </div>
                  ) : diff.type === 'deleted' && diff.oldContent ? (
                    <div className="bg-red-500/5 p-4">
                      <pre className="text-xs overflow-x-auto">
                        <code>{diff.oldContent}</code>
                      </pre>
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
