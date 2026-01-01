import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerBatchRoutes } from "./replit_integrations/batch";
import { registerAssistantPromptRoutes } from "./replit_integrations/assistant-prompts";
import { registerOrgPersonaRoutes } from "./replit_integrations/org-persona";
import { seedOrgPersona } from "./replit_integrations/org-persona/seed";
import { initializeDatabase } from "./db"; // Import database initialization
import { seedDefaultPrompts } from "./replit_integrations/assistant-prompts/seed"; // Import seed function
import { importPromptsFromFile } from "./replit_integrations/assistant-prompts/import-from-file";
import creditRoutes from "./replit_integrations/credits/routes";
import { registerMastraRoutes } from "./replit_integrations/mastra/routes";
import { registerCreditRoutes } from "./replit_integrations/credits/routes";
import { registerFileOperationRoutes } from "./replit_integrations/file-operations/routes";
import { registerShellRoutes } from "./replit_integrations/shell/routes";
import { registerWorkflowRoutes } from "./replit_integrations/workflow/routes";
import { registerScreenshotRoutes } from "./replit_integrations/screenshot/routes";
import { registerScrapingRoutes } from "./replit_integrations/scraping/routes";
import { registerCodeIntelligenceRoutes } from "./replit_integrations/code-intelligence/routes";
import { registerCollaborationRoutes } from "./replit_integrations/collaboration";
import { registerVoiceRoutes } from "./replit_integrations/voice";
import { registerPluginRoutes, pluginRegistry } from "./replit_integrations/plugins";
import { setupCollaborationWebSocket } from "./replit_integrations/collaboration/websocket";
import { registerRAGRoutes } from "./replit_integrations/rag/routes";
import { registerExportImportRoutes } from "./replit_integrations/export-import";
import multer from "multer";
import { randomUUID } from "crypto";

const upload = multer({
  storage: multer.diskStorage({
    destination: "/tmp",
    filename: (req, file, cb) => {
      cb(null, `${randomUUID()}-${file.originalname}`);
    },
  }),
});

const app = express();
const httpServer = createServer(app);

// Setup WebSocket for collaboration
setupCollaborationWebSocket(httpServer);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database and seed default data
  await initializeDatabase(); // Call database initialization
  await seedDefaultPrompts(); // Call seed function
  await importPromptsFromFile(); // Import prompts from file

  // Seed organizational persona
  await seedOrgPersona();

  await registerRoutes(httpServer, app);
  registerChatRoutes(app);
  registerImageRoutes(app);
  registerBatchRoutes(app);
  registerAssistantPromptRoutes(app);
  registerOrgPersonaRoutes(app);

  const checkpointRoutes = (await import("./replit_integrations/checkpoints/routes")).default;
  app.use("/api", checkpointRoutes);

  // Seed default assistant prompt (this is now redundant due to the seedDefaultPrompts call above)
  // const { seedDefaultPrompt } = await import("./replit_integrations/assistant-prompts/seed");
  // await seedDefaultPrompt();

  registerMastraRoutes(app);
  registerCreditRoutes(app);
  registerFileOperationRoutes(app);
  registerShellRoutes(app);
  registerWorkflowRoutes(app);
  registerRAGRoutes(app);

  const { registerDeploymentRoutes } = await import("./replit_integrations/deployment/routes");
  registerDeploymentRoutes(app);

  const { registerPackageManagerRoutes } = await import("./replit_integrations/package-manager/routes");
  registerPackageManagerRoutes(app);

  const { registerWorkspaceToolRoutes } = await import("./replit_integrations/workspace-tools/routes");
  registerWorkspaceToolRoutes(app);
  registerCodeIntelligenceRoutes(app);

  // Register routes
  registerExportImportRoutes(app);
  registerScrapingRoutes(app);
  registerScreenshotRoutes(app);

  // File upload endpoint for imports
  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ filePath: req.file.path });
  });

  // Mount collaboration and voice routes
  app.use("/api", registerCollaborationRoutes());
  app.use("/api", registerVoiceRoutes());
  app.use('/api', registerPluginRoutes());

  // Initialize plugin system
  await pluginRegistry.initialize();

  // start server
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();