
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, FileText } from 'lucide-react';
import type { Message } from '@shared/schema';

interface ContextPruningControlsProps {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  files: { id: string; name: string; size: number }[];
  onPrune: (messageIds: string[], fileIds: string[]) => void;
}

export function ContextPruningControls({
  open,
  onClose,
  messages,
  files,
  onPrune,
}: ContextPruningControlsProps) {
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const toggleMessage = (id: string) => {
    const newSet = new Set(selectedMessages);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMessages(newSet);
  };

  const toggleFile = (id: string) => {
    const newSet = new Set(selectedFiles);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFiles(newSet);
  };

  const handlePrune = () => {
    onPrune(Array.from(selectedMessages), Array.from(selectedFiles));
    onClose();
  };

  const totalMessages = messages.length;
  const totalFiles = files.length;
  const estimatedTokens = messages.reduce((sum, m) => sum + m.content.length / 4, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Context</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-3">
              <div className="text-sm text-muted-foreground">Messages</div>
              <div className="text-2xl font-bold">{totalMessages}</div>
              <div className="text-xs text-muted-foreground">
                {selectedMessages.size} selected
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-sm text-muted-foreground">Files</div>
              <div className="text-2xl font-bold">{totalFiles}</div>
              <div className="text-xs text-muted-foreground">
                {selectedFiles.size} selected
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-sm text-muted-foreground">Est. Tokens</div>
              <div className="text-2xl font-bold">{Math.round(estimatedTokens)}</div>
              <Badge variant="outline" className="text-xs mt-1">
                ~{Math.round(estimatedTokens * 0.75)} after pruning
              </Badge>
            </Card>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Messages</h3>
                <div className="space-y-2">
                  {messages.map((message, idx) => (
                    <Card key={message.id} className="p-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedMessages.has(message.id)}
                          onCheckedChange={() => toggleMessage(message.id)}
                        />
                        <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">
                            Message {idx + 1} • {message.role}
                          </div>
                          <div className="text-sm truncate">{message.content}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Files</h3>
                <div className="space-y-2">
                  {files.map((file) => (
                    <Card key={file.id} className="p-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedFiles.has(file.id)}
                          onCheckedChange={() => toggleFile(file.id)}
                        />
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handlePrune}
            disabled={selectedMessages.size === 0 && selectedFiles.size === 0}
          >
            Remove Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
