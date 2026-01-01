
import { Router } from "express";
import type { Request, Response } from "express";

interface EditRequest {
  id: string;
  timestamp: Date;
  cost: number;
  messageId: string;
  applied: boolean;
}

const editRequests: EditRequest[] = [];

export function registerEditTrackingRoutes(app: Router) {
  app.post("/api/credits/track-edit", async (req: Request, res: Response) => {
    try {
      const editRequest: EditRequest = req.body;
      editRequests.push(editRequest);
      
      // In production, this would update the billing system
      console.log(`Edit request tracked: ${editRequest.id} - $${editRequest.cost}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to track edit request:", error);
      res.status(500).json({ error: "Failed to track edit request" });
    }
  });

  app.get("/api/credits/edit-requests", async (req: Request, res: Response) => {
    try {
      res.json(editRequests);
    } catch (error) {
      console.error("Failed to fetch edit requests:", error);
      res.status(500).json({ error: "Failed to fetch edit requests" });
    }
  });
}
