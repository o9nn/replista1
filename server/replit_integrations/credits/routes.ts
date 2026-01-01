import { Router } from "express";
import { getUserCreditUsage, getCreditHistory } from "./index";
import { Express, Request, Response } from "express";
import { editRequestStorage } from "./storage";

const router = Router();

router.get("/usage/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const total = await getUserCreditUsage(userId, days);

    res.json({ userId, days, totalCredits: total });
  } catch (error: any) {
    console.error("Credit usage error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await getCreditHistory(userId, limit);

    res.json({ history });
  } catch (error: any) {
    console.error("Credit history error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function getCreditUsage() {
  const userId = 'default-user';
  const monthlyAllowance = 25.00;
  const used = await editRequestStorage.getMonthlyUsage(userId);
  const remaining = monthlyAllowance - used;
  
  return {
    used,
    remaining,
    total: monthlyAllowance,
    percentage: (used / monthlyAllowance) * 100
  };
}

export function registerCreditRoutes(app: Express) {
  app.get("/api/credits/usage", async (_req: Request, res: Response) => {
    try {
      const usage = await getCreditUsage();
      res.json(usage);
    } catch (error) {
      console.error("Error fetching credit usage:", error);
      res.status(500).json({ error: "Failed to fetch credit usage" });
    }
  });

  app.post("/api/credits/edit-request", async (req: Request, res: Response) => {
    try {
      const { userId = 'default-user' } = req.body;
      const cost = 0.05; // $0.05 per edit request
      const monthlyAllowance = 25.00; // $25 for Core plan

      const { editRequestStorage } = await import("./storage");
      await editRequestStorage.recordEditRequest(userId, cost);

      const remaining = await editRequestStorage.getRemainingCredits(userId, monthlyAllowance);

      res.json({ 
        success: true, 
        cost,
        remaining,
        monthlyAllowance
      });
    } catch (error) {
      console.error("Error recording edit request:", error);
      res.status(500).json({ error: "Failed to record edit request" });
    }
  });

  app.get("/api/credits/remaining", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || 'default-user';
      const monthlyAllowance = 25.00;

      const { editRequestStorage } = await import("./storage");
      const remaining = await editRequestStorage.getRemainingCredits(userId, monthlyAllowance);

      res.json({ remaining, monthlyAllowance });
    } catch (error) {
      console.error("Error fetching remaining credits:", error);
      res.status(500).json({ error: "Failed to fetch remaining credits" });
    }
  });
}

export { registerCreditRoutes as registerCreditsRoutes };
export default router;