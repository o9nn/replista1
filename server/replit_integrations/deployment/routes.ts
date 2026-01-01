import type { Express, Request, Response } from "express";

interface DeploymentConfig {
  buildCommand?: string;
  runCommand: string;
}

let deploymentConfig: DeploymentConfig = {
  runCommand: 'npm run dev'
};

export function registerDeploymentRoutes(app: Express) {
  // Configure deployment build and run commands
  app.post('/api/deployment/configure', async (req: Request, res: Response) => {
    try {
      const { buildCommand, runCommand } = req.body;

      if (!runCommand) {
        return res.status(400).json({ error: 'runCommand is required' });
      }

      deploymentConfig = {
        buildCommand,
        runCommand
      };

      console.log('Deployment configured:', deploymentConfig);

      res.json({ 
        success: true, 
        config: deploymentConfig
      });
    } catch (error) {
      console.error('Error configuring deployment:', error);
      res.status(500).json({ 
        error: 'Failed to configure deployment',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get deployment configuration
  app.get('/api/deployment/config', async (req: Request, res: Response) => {
    res.json(deploymentConfig);
  });

  // Legacy endpoint for compatibility
  app.get('/api/deployment/configuration', async (req: Request, res: Response) => {
    res.json(deploymentConfig);
  });
}