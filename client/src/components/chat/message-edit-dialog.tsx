
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface MessageEditDialogProps {
  open: boolean;
  onClose: () => void;
  messageId: string;
  currentContent: string;
  onSave: (messageId: string, newContent: string) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
}

export function MessageEditDialog({
  open,
  onClose,
  messageId,
  currentContent,
  onSave,
  onRegenerate,
}: MessageEditDialogProps) {
  const [editedContent, setEditedContent] = useState(currentContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleSave = async () => {
    if (editedContent.trim() === currentContent.trim()) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(messageId, editedContent);
      onClose();
    } catch (error) {
      console.error('Failed to save message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate(messageId);
      onClose();
    } catch (error) {
      console.error('Failed to regenerate message:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>
            Edit your message and regenerate the assistant's response
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
            placeholder="Edit your message..."
          />
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving || isRegenerating}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleRegenerate}
            disabled={isSaving || isRegenerating}
          >
            {isRegenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Regenerate
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isRegenerating}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
