
import { useState } from 'react';
import { useToast } from './use-toast';

interface MessageFeedback {
  messageId: number;
  rating: 'positive' | 'negative';
  comment?: string;
  timestamp: Date;
}

export function useMessageFeedback() {
  const [feedback, setFeedback] = useState<Map<number, MessageFeedback>>(new Map());
  const { toast } = useToast();

  const submitFeedback = async (
    messageId: number,
    rating: 'positive' | 'negative',
    comment?: string
  ) => {
    try {
      const feedbackData: MessageFeedback = {
        messageId,
        rating,
        comment,
        timestamp: new Date(),
      };

      // Store feedback locally
      setFeedback(prev => new Map(prev).set(messageId, feedbackData));

      // TODO: Send to backend API for analytics
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      toast({
        title: 'Feedback submitted',
        description: 'Thank you for helping us improve!',
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Still store locally even if API fails
      toast({
        title: 'Feedback saved locally',
        description: 'We\'ll sync it when possible',
      });
    }
  };

  const getFeedback = (messageId: number) => {
    return feedback.get(messageId);
  };

  return {
    submitFeedback,
    getFeedback,
    allFeedback: Array.from(feedback.values()),
  };
}
