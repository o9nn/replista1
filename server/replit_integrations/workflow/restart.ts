
import { Router } from "express";

export function registerWorkflowRestartRoute(app: Router) {
  app.post("/api/workflow/restart", async (req, res) => {
    try {
      // Send restart command to the workflow
      const response = await fetch("http://localhost:5000/__replit_workflow_restart", {
        method: "POST",
      });

      if (response.ok) {
        res.json({ success: true, message: "Workflow restarted" });
      } else {
        res.status(500).json({ error: "Failed to restart workflow" });
      }
    } catch (error) {
      console.error("Workflow restart error:", error);
      res.status(500).json({ error: "Failed to restart workflow" });
    }
  });
}
