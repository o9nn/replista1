import { Router, Request, Response, Express } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface WorkflowProcess {
  name: string;
  pid?: number;
  status: 'idle' | 'running' | 'success' | 'failed';
}

// Changed from array to Map for easier access and management of workflows by name
const workflows: Map<string, WorkflowProcess> = new Map();

// Placeholder for restartWorkflow function, assumed to be defined elsewhere or implemented as part of the changes
async function restartWorkflow() {
  // This is a placeholder. In a real scenario, this function would contain the logic
  // to stop the existing workflow process (if any) and start a new one.
  // For the purpose of this edit, we assume it handles the necessary state updates.
  console.log("Placeholder: restartWorkflow called");
}

export function registerWorkflowRoutes(app: Express) {
  // Configure workflow
  app.post('/api/workflow/configure', (req: Request, res: Response) => {
    try {
      const { currentName, newName, commands, mode } = req.body;

      // This would typically update .replit file or workflow configuration
      // For now, just acknowledge the configuration
      res.json({
        success: true,
        workflow: {
          name: newName || currentName,
          commands,
          mode,
        }
      });
    } catch (error) {
      console.error('Error configuring workflow:', error);
      res.status(500).json({ error: 'Failed to configure workflow' });
    }
  });

  // Get all workflows
  app.get('/api/workflows', (req: Request, res: Response) => {
    const workflowList = Array.from(workflows.values());
    res.json({ workflows: workflowList });
  });

  // Get workflow status
  app.get('/api/workflow/status', (req: Request, res: Response) => {
    const workflowName = req.query.name as string;

    if (workflowName) {
      const workflow = workflows.get(workflowName);
      res.json(workflow || { name: workflowName, status: 'idle' });
    } else {
      // Return all workflows if no name specified
      const workflowList = Array.from(workflows.values());
      res.json({ workflows: workflowList });
    }
  });

  // Restart workflow
  app.post('/api/workflow/restart', async (req: Request, res: Response) => {
    try {
      const { name, workflowName, commands } = req.body;
      const wfName = name || workflowName;
      const workflow = workflows.get(wfName);

      if (workflow?.pid) {
        process.kill(workflow.pid, 'SIGTERM');
      }

      workflows.set(wfName, { name: wfName, status: 'running' });
      res.json({ success: true, status: 'running' });

      // Execute in background
      try {
        const commandList = Array.isArray(commands) ? commands : [commands];
        for (const cmd of commandList) {
          // In a real scenario, you might want to capture stdout/stderr and associate with workflow state
          await execAsync(cmd, { cwd: process.cwd() });
        }
        workflows.set(wfName, { name: wfName, status: 'success' });
      } catch (error) {
        console.error(`Error executing command in workflow "${wfName}":`, error);
        workflows.set(wfName, { name: wfName, status: 'failed' });
      }
    } catch (error) {
      console.error('Error restarting workflow:', error);
      res.status(500).json({ error: 'Failed to restart workflow' });
    }
  });

  // Execute workflow
  app.post("/api/workflow/execute", async (req: Request, res: Response) => {
    try {
      const { name, workflowName, commands } = req.body;
      const wfName = name || workflowName;

      if (!wfName) {
        return res.status(400).json({ error: 'Workflow name is required' });
      }

      workflows.set(wfName, { name: wfName, status: 'running' });

      res.json({ success: true, status: 'running' });

      // Execute in background
      try {
        const commandList = Array.isArray(commands) ? commands : [commands];
        for (const cmd of commandList) {
          // In a real scenario, you might want to capture stdout/stderr and associate with workflow state
          await execAsync(cmd, { cwd: process.cwd() });
        }
        workflows.set(wfName, { name: wfName, status: 'success' });
      } catch (error) {
        console.error(`Error executing command in workflow "${wfName}":`, error);
        workflows.set(wfName, { name: wfName, status: 'failed' });
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      res.status(500).json({ error: 'Failed to execute workflow' });
    }
  });

  // Stop workflow
  app.post("/api/workflow/stop", async (req: Request, res: Response) => {
    try {
      const { name, workflowName } = req.body;
      const wfName = name || workflowName;
      const workflow = workflows.get(wfName);

      if (workflow?.pid) {
        process.kill(workflow.pid, 'SIGTERM');
      }
      // If workflow was not running or had no pid, set to idle
      workflows.set(wfName, { name: wfName, status: 'idle' });
      res.json({ success: true });
    } catch (error) {
      console.error('Error stopping workflow:', error);
      res.status(500).json({ error: 'Failed to stop workflow' });
    }
  });
}