
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCode2, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface FileChange {
  file: string;
  oldContent: string;
  newContent: string;
  added: number;
  removed: number;
}

interface MultiFileRefactorPreviewProps {
  open: boolean;
  onClose: () => void;
  changes: FileChange[];
  onApplyAll: () => void;
  onApplySelected: (selectedFiles: string[]) => void;
}

export function MultiFileRefactorPreview({
  open,
  onClose,
  changes,
  onApplyAll,
  onApplySelected,
}: MultiFileRefactorPreviewProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(changes.map(c => c.file)));
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const toggleFile = (file: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(file)) {
      newSelected.delete(file);
    } else {
      newSelected.add(file);
    }
    setSelectedFiles(newSelected);
  };

  const toggleExpanded = (file: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(file)) {
      newExpanded.delete(file);
    } else {
      newExpanded.add(file);
    }
    setExpandedFiles(newExpanded);
  };

  const totalAdded = changes.reduce((sum, c) => sum + c.added, 0);
  const totalRemoved = changes.reduce((sum, c) => sum + c.removed, 0);

  const handleApply = () => {
    if (selectedFiles.size === changes.length) {
      onApplyAll();
    } else {
      onApplySelected(Array.from(selectedFiles));
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Multi-File Refactoring Preview</DialogTitle>
          <DialogDescription>
            Review and select which changes to apply ({changes.length} files)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-muted rounded-md">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedFiles.size === changes.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedFiles(new Set(changes.map(c => c.file)));
                  } else {
                    setSelectedFiles(new Set());
                  }
                }}
              />
              <span className="text-sm font-medium">
                Select All ({selectedFiles.size}/{changes.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600">
                +{totalAdded}
              </Badge>
              <Badge variant="outline" className="text-red-600">
                -{totalRemoved}
              </Badge>
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {changes.map((change) => {
                const isExpanded = expandedFiles.has(change.file);
                const isSelected = selectedFiles.has(change.file);

                return (
                  <Card key={change.file} className={cn(
                    "border transition-colors",
                    isSelected ? "border-primary" : ""
                  )}>
                    <div className="flex items-center gap-2 p-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleFile(change.file)}
                      />
                      
                      <button
                        onClick={() => toggleExpanded(change.file)}
                        className="flex-1 flex items-center gap-2 text-left hover:bg-accent/50 rounded px-2 py-1 transition-colors"
                      >
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "rotate-90"
                        )} />
                        <FileCode2 className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-mono flex-1">{change.file}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs text-green-600">
                            +{change.added}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-red-600">
                            -{change.removed}
                          </Badge>
                        </div>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t p-3 bg-muted/30">
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">Preview:</div>
                          <pre className="text-xs bg-background p-2 rounded border overflow-x-auto max-h-[200px]">
                            {change.newContent.substring(0, 500)}
                            {change.newContent.length > 500 && '\n...'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleApply}
            disabled={selectedFiles.size === 0}
          >
            Apply {selectedFiles.size > 0 && `(${selectedFiles.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
