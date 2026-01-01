
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DiffViewer } from '../diff/diff-viewer';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Checkpoint } from '@shared/schema';

interface CheckpointDiffViewerProps {
  open: boolean;
  onClose: () => void;
  checkpoints: Checkpoint[];
  selectedFile?: string;
}

export function CheckpointDiffViewer({ 
  open, 
  onClose, 
  checkpoints, 
  selectedFile 
}: CheckpointDiffViewerProps) {
  const [fromCheckpoint, setFromCheckpoint] = useState<string>('');
  const [toCheckpoint, setToCheckpoint] = useState<string>('');

  const fromCp = checkpoints.find(c => c.id === fromCheckpoint);
  const toCp = checkpoints.find(c => c.id === toCheckpoint);

  const fromFile = fromCp?.files.find(f => f.name === selectedFile);
  const toFile = toCp?.files.find(f => f.name === selectedFile);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Compare Checkpoints</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From</label>
              <Select value={fromCheckpoint} onValueChange={setFromCheckpoint}>
                <SelectTrigger>
                  <SelectValue placeholder="Select checkpoint" />
                </SelectTrigger>
                <SelectContent>
                  {checkpoints.map(cp => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">To</label>
              <Select value={toCheckpoint} onValueChange={setToCheckpoint}>
                <SelectTrigger>
                  <SelectValue placeholder="Select checkpoint" />
                </SelectTrigger>
                <SelectContent>
                  {checkpoints.map(cp => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {fromFile && toFile && (
            <ScrollArea className="h-[500px]">
              <DiffViewer
                fileName={selectedFile || 'file'}
                oldContent={fromFile.content}
                newContent={toFile.content}
              />
            </ScrollArea>
          )}

          {(!fromFile || !toFile) && fromCheckpoint && toCheckpoint && (
            <div className="text-center py-8 text-muted-foreground">
              {selectedFile ? 'File not found in selected checkpoints' : 'Select a file to compare'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
