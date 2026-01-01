import type { Express, Request, Response } from "express";
import { orgPersonaStorage } from "./storage";
import { db } from "../../db";
import { orgPersonas, orgPersonaExtensions } from "../../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { PersonaLearningEngine } from "./learning";

const learningEngines = new Map<number, PersonaLearningEngine>();

function getLearningEngine(orgId: number): PersonaLearningEngine {
  if (!learningEngines.has(orgId)) {
    learningEngines.set(orgId, new PersonaLearningEngine());
  }
  return learningEngines.get(orgId)!;
}

export function registerOrgPersonaRoutes(app: Express): void {
  // Get organizational persona
  app.get("/api/org-persona", async (req: Request, res: Response) => {
    try {
      const persona = await orgPersonaStorage.getPersona();
      res.json(persona || null);
    } catch (error) {
      console.error("Error fetching org persona:", error);
      res.status(500).json({ error: "Failed to fetch org persona" });
    }
  });

  // Update persona
  app.patch("/api/org-persona", async (req: Request, res: Response) => {
    try {
      const persona = await orgPersonaStorage.updatePersona(req.body);
      res.json(persona);
    } catch (error) {
      console.error("Error updating org persona:", error);
      res.status(500).json({ error: "Failed to update org persona" });
    }
  });

  // Get influence weights
  app.get("/api/org-persona/influence-weights", async (req: Request, res: Response) => {
    try {
      const weights = await orgPersonaStorage.calculateInfluenceWeights();
      res.json(Object.fromEntries(weights));
    } catch (error) {
      console.error("Error calculating influence weights:", error);
      res.status(500).json({ error: "Failed to calculate influence weights" });
    }
  });

  // Get top skills
  app.get("/api/org-persona/skills/top", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const skills = await orgPersonaStorage.getTopSkills(limit);
      res.json(skills);
    } catch (error) {
      console.error("Error fetching top skills:", error);
      res.status(500).json({ error: "Failed to fetch top skills", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get active sensors and actuators
  app.get("/api/org-persona/network/sensors", async (req: Request, res: Response) => {
    try {
      const sensors = await orgPersonaStorage.getActiveSensors();
      res.json(sensors);
    } catch (error) {
      console.error("Error fetching sensors:", error);
      res.status(500).json({ error: "Failed to fetch sensors", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/org-persona/network/actuators", async (req: Request, res: Response) => {
    try {
      const actuators = await orgPersonaStorage.getActiveActuators();
      res.json(actuators);
    } catch (error) {
      console.error("Error fetching actuators:", error);
      res.status(500).json({ error: "Failed to fetch actuators", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Record behavior
  app.post("/api/org-persona/behavior", async (req: Request, res: Response) => {
    try {
      const behavior = await orgPersonaStorage.recordBehavior(req.body);
      res.status(201).json(behavior);
    } catch (error) {
      console.error("Error recording behavior:", error);
      res.status(500).json({ error: "Failed to record behavior" });
    }
  });

  // Get behavior patterns
  app.get("/api/org-persona/behavior/:type", async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const patterns = await orgPersonaStorage.getBehaviorPatterns(req.params.type, days);
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching behavior patterns:", error);
      res.status(500).json({ error: "Failed to fetch behavior patterns" });
    }
  });

  // Update persona (this route seems to be a duplicate of the patch method, consider refactoring)
  app.put("/api/org-persona/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const [updated] = await db
        .update(orgPersonas)
        .set(updateData)
        .where(eq(orgPersonas.id, parseInt(id)))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating org persona:", error);
      res.status(500).json({ error: "Failed to update org persona" });
    }
  });

  // Get evolution history for an org
  app.get("/api/org-persona/:orgId/evolution", async (req, res) => {
    try {
      const { orgId } = req.params;

      const extensions = await db
        .select()
        .from(orgPersonaExtensions)
        .where(eq(orgPersonaExtensions.orgId, parseInt(orgId)))
        .orderBy(desc(orgPersonaExtensions.version));

      res.json({ extensions });
    } catch (error) {
      console.error("Error fetching evolution history:", error);
      res.status(500).json({ error: "Failed to fetch evolution history" });
    }
  });

  // Record learning event
  app.post("/api/org-persona/:orgId/learn", async (req, res) => {
    try {
      const { orgId } = req.params;
      const { type, data } = req.body;

      const engine = getLearningEngine(parseInt(orgId));
      await engine.recordEvent(parseInt(orgId), {
        type,
        data,
        timestamp: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error recording learning event:", error);
      res.status(500).json({ error: "Failed to record learning event" });
    }
  });

  // Get current learning insights
  app.get("/api/org-persona/:orgId/insights", async (req, res) => {
    try {
      const { orgId } = req.params;

      const [latest] = await db
        .select()
        .from(orgPersonaExtensions)
        .where(eq(orgPersonaExtensions.orgId, parseInt(orgId)))
        .orderBy(desc(orgPersonaExtensions.version))
        .limit(1);

      if (!latest) {
        return res.json({ insights: [], confidence: 0 });
      }

      res.json({
        insights: latest.learningData?.insights || [],
        confidence: latest.confidenceScore,
        patterns: latest.learningData?.patterns || [],
        preferences: latest.learningData?.preferences || {},
      });
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });
}