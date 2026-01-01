import { Copy, Edit, RefreshCw, ThumbsUp, ThumbsDown, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { SessionBranchDialog } from "./session-branch-dialog";

interface MessageActionsProps {
  messageId: string;
  content: string;
  role: 'user' | 'assistant';
  onEdit?: () => void;
  onRegenerate?: () => void;
  onBranch?: () => void;
  onFeedback?: (messageId: string, isPositive: boolean) => void;
  showBranch?: boolean;
}

export function MessageActions({ 
  messageId, 
  content, 
  role,
  onEdit,
  onRegenerate,
  onBranch,
  onFeedback,
  showBranch = true
}: MessageActionsProps) {
  const { toast } = useToast();
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Copied to clipboard',
        description: 'Message content copied successfully',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy message content',
        variant: 'destructive',
      });
    }
  };

  const handleFeedback = (rating: 'positive' | 'negative') => {
    setFeedbackGiven(rating);
    onFeedback?.(messageId, rating === 'positive');
    toast({
      title: 'Feedback submitted',
      description: 'Thank you for your feedback!',
    });
  };

  return (
    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-6 px-2"
      >
        <Copy className="h-3 w-3" />
      </Button>

      {role === 'user' && onEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-6 px-2"
        >
          <Edit className="h-3 w-3" />
        </Button>
      )}

      {role === 'assistant' && onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          className="h-6 px-2"
          title="Regenerate response"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}

      {showBranch && (
        <SessionBranchDialog 
          messageId={messageId}
          triggerButton={
            <Button
              variant="ghost"
              size="sm"
              title="Branch conversation from here"
              className="h-6 px-2"
            >
              <GitBranch className="h-3 w-3" />
            </Button>
          }
        />
      )}

      {role === 'assistant' && onFeedback && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback('positive')}
            className={`h-6 px-2 ${feedbackGiven === 'positive' ? 'text-green-500' : ''}`}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback('negative')}
            className={`h-6 px-2 ${feedbackGiven === 'negative' ? 'text-red-500' : ''}`}
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}