import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GitBranch } from 'lucide-react';
import { useAssistantStore } from '@/hooks/use-assistant-store';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/hooks/use-assistant-store';

interface SessionBranchDialogProps {
  messageId: string;
  triggerButton?: React.ReactNode;
  messages: Message[];
}

export function SessionBranchDialog({
  messageId,
  triggerButton,
  messages,
}: SessionBranchDialogProps) {
  const [open, setOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const { branchSession, sessions } = useAssistantStore();
  const { toast } = useToast();

  const handleBranch = () => {
    if (!branchName.trim()) {
      toast({
        title: 'Branch name required',
        description: 'Please enter a name for the new branch',
        variant: 'destructive',
      });
      return;
    }

    branchSession(messageId);
    const latestSession = sessions[0];

    if (latestSession && branchName.trim()) {
      // Update the session name
      const store = useAssistantStore.getState();
      const updatedSessions = store.sessions.map(s =>
        s.id === latestSession.id
          ? { ...s, title: branchName, name: branchName }
          : s
      );
      useAssistantStore.setState({ sessions: updatedSessions });
    }

    setOpen(false);
    setBranchName('');
    toast({
      title: 'Session branched',
      description: `Created new branch: ${branchName}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="ghost" size="sm">
            <GitBranch className="h-4 w-4 mr-2" />
            Branch from here
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Branch Conversation
          </DialogTitle>
          <DialogDescription>
            Create a new conversation branch from this point. You can explore
            different directions without affecting the original conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch Name</Label>
            <Input
              id="branch-name"
              placeholder="e.g., Alternative implementation"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleBranch();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleBranch} disabled={!branchName.trim()}>
            Create Branch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}