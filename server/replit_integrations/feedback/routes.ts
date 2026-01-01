
import type { Express, Request, Response } from "express";

interface Feedback {
  messageId: number;
  rating: 'positive' | 'negative';
  comment?: string;
  timestamp: Date;
}

// In-memory storage (replace with database in production)
const feedbackStore: Feedback[] = [];

export function registerFeedbackRoutes(app: Express): void {
  // Submit feedback
  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const { messageId, rating, comment, timestamp } = req.body;

      const feedback: Feedback = {
        messageId,
        rating,
        comment,
        timestamp: new Date(timestamp),
      };

      feedbackStore.push(feedback);

      res.status(201).json({ success: true, feedback });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Get feedback statistics
  app.get("/api/feedback/stats", async (req: Request, res: Response) => {
    try {
      const total = feedbackStore.length;
      const positive = feedbackStore.filter(f => f.rating === 'positive').length;
      const negative = feedbackStore.filter(f => f.rating === 'negative').length;

      res.json({
        total,
        positive,
        negative,
        positiveRate: total > 0 ? (positive / total) * 100 : 0,
      });
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });
}
