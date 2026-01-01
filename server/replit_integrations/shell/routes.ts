import { Router, Request, Response, Express } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

interface CommandHistoryItem {
  id: string;
  command: string;
  output?: string;
  exitCode?: number;
  timestamp: Date;
  workingDirectory?: string;
}

const commandHistory: CommandHistoryItem[] = [];

export function registerShellRoutes(router: Router) {
  // Get command history
  router.get('/api/shell/history', (req: Request, res: Response) => {
    res.json(commandHistory);
  });

  // Execute shell command
  router.post('/api/shell/execute', async (req: Request, res: Response) => {
    try {
      const { command, workingDirectory } = req.body;

      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      const historyItem: CommandHistoryItem = {
        id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        command,
        workingDirectory,
        timestamp: new Date(),
      };

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: workingDirectory || process.cwd(),
          timeout: 30000,
        });

        historyItem.output = stdout || stderr;
        historyItem.exitCode = 0;
      } catch (error: any) {
        historyItem.output = error.stderr || error.stdout || error.message;
        historyItem.exitCode = error.code || 1;
      }

      commandHistory.unshift(historyItem);

      // Keep only last 100 commands
      if (commandHistory.length > 100) {
        commandHistory.pop();
      }

      res.json(historyItem);
    } catch (error) {
      console.error('Error executing command:', error);
      res.status(500).json({ error: 'Failed to execute command' });
    }
  });

  // Add command to history (for tracking commands run elsewhere)
  router.post('/api/shell/history', (req: Request, res: Response) => {
    try {
      const { command, output, exitCode, workingDirectory } = req.body;

      const historyItem: CommandHistoryItem = {
        id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        command,
        output,
        exitCode,
        workingDirectory,
        timestamp: new Date(),
      };

      commandHistory.unshift(historyItem);

      if (commandHistory.length > 100) {
        commandHistory.pop();
      }

      res.json(historyItem);
    } catch (error) {
      console.error('Error adding command to history:', error);
      res.status(500).json({ error: 'Failed to add command to history' });
    }
  });

  // Clear command history
  router.delete('/api/shell/history', (req: Request, res: Response) => {
    commandHistory.length = 0;
    res.json({ success: true });
  });
}