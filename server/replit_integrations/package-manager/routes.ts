import { Router, Request, Response } from 'express';
import type { Express } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

interface PackageInstallRequest {
  language: string;
  packageList: string;
  confirmed?: boolean;
}

interface PackageManager {
  name: string;
  command: string;
  installCmd: string;
  lockFile: string;
}

const packageManagers: Record<string, PackageManager[]> = {
  nodejs: [
    { name: 'npm', command: 'npm', installCmd: 'install --no-audit', lockFile: 'package-lock.json' },
    { name: 'yarn', command: 'yarn', installCmd: 'add', lockFile: 'yarn.lock' },
    { name: 'pnpm', command: 'pnpm', installCmd: 'add', lockFile: 'pnpm-lock.yaml' },
  ],
  python: [
    { name: 'pip', command: 'pip', installCmd: 'install', lockFile: 'requirements.txt' },
    { name: 'poetry', command: 'poetry', installCmd: 'add', lockFile: 'poetry.lock' },
  ],
};

// Detect package manager
async function detectPackageManager(language: string): Promise<PackageManager | null> {
  const managers = packageManagers[language.toLowerCase()] || [];

  for (const manager of managers) {
    try {
      await execAsync(`which ${manager.command}`);
      const lockFileExists = existsSync(join(process.cwd(), manager.lockFile));
      if (lockFileExists) return manager;
    } catch {
      continue;
    }
  }

  return managers[0] || null;
}

// Detect package manager for nodejs specifically
async function detectNodePackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
  try {
    const { access } = await import('fs/promises');

    try {
      await access(join(process.cwd(), 'yarn.lock'));
      return 'yarn';
    } catch {}

    try {
      await access(join(process.cwd(), 'pnpm-lock.yaml'));
      return 'pnpm';
    } catch {}

    return 'npm';
  } catch {
    return 'npm';
  }
}

export function registerPackageManagerRoutes(app: Express) {
  // Detect package manager
  app.post('/api/packages/detect', async (req: Request, res: Response) => {
    try {
      const { language } = req.body;

      if (!language) {
        return res.status(400).json({ error: 'language is required' });
      }

      const manager = await detectPackageManager(language);

      if (!manager) {
        return res.status(404).json({ 
          error: `No package manager found for ${language}`,
          availableManagers: packageManagers[language.toLowerCase()] || []
        });
      }

      res.json({ manager });
    } catch (error: any) {
      console.error('Error detecting package manager:', error);
      res.status(500).json({ 
        error: 'Failed to detect package manager',
        details: error.message 
      });
    }
  });

  // Detect package manager for nodejs
  app.get('/api/package-manager/detect', async (req: Request, res: Response) => {
    try {
      const manager = await detectNodePackageManager();
      res.json({ manager });
    } catch (error) {
      console.error('Error detecting package manager:', error);
      res.status(500).json({ 
        error: 'Failed to detect package manager',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Install packages
  app.post('/api/packages/install', async (req: Request, res: Response) => {
    try {
      const { language, packageList, confirmed = false }: PackageInstallRequest = req.body;

      if (!language || !packageList) {
        return res.status(400).json({ 
          error: 'language and packageList are required' 
        });
      }

      const packages = packageList.split(',').map(p => p.trim()).filter(Boolean);

      if (packages.length === 0) {
        return res.status(400).json({ error: 'No valid packages provided' });
      }

      const manager = await detectPackageManager(language);

      if (!manager) {
        return res.status(400).json({ 
          error: `No package manager detected for ${language}`,
          suggestion: 'Please ensure npm, yarn, or pnpm is installed'
        });
      }

      if (!confirmed) {
        return res.json({
          requiresConfirmation: true,
          manager: manager.name,
          packages,
          command: `${manager.command} ${manager.installCmd} ${packages.join(' ')}`
        });
      }

      const installCommand = `${manager.command} ${manager.installCmd} ${packages.join(' ')}`;
      console.log(`[Package Manager] Installing with ${manager.name}: ${installCommand}`);

      const { stdout, stderr } = await execAsync(installCommand, {
        maxBuffer: 1024 * 1024 * 10
      });

      res.json({
        success: true,
        language,
        packages,
        manager: manager.name,
        output: stdout || stderr,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error installing packages:', error);
      res.status(500).json({ 
        error: 'Failed to install packages',
        details: error.message,
        output: error.stdout || error.stderr || ""
      });
    }
  });

  // Install package (for nodejs specific detection)
  app.post('/api/package-manager/install', async (req: Request, res: Response) => {
    try {
      const { packageName, language, confirm = false } = req.body;

      if (!packageName || !language) {
        return res.status(400).json({ 
          error: 'packageName and language are required' 
        });
      }

      // If not confirmed, return package info for confirmation
      if (!confirm) {
        const manager = await detectNodePackageManager();
        return res.json({
          needsConfirmation: true,
          packageName,
          language,
          manager,
          command: `${manager} ${manager === 'npm' ? 'install' : 'add'} ${packageName}`,
        });
      }

      const manager = await detectNodePackageManager();
      let command = '';

      if (language === 'nodejs' || language === 'javascript' || language === 'typescript') {
        if (manager === 'yarn') {
          command = `yarn add ${packageName}`;
        } else if (manager === 'pnpm') {
          command = `pnpm add ${packageName}`;
        } else {
          command = `npm install ${packageName} --no-audit`;
        }
      } else if (language === 'python') {
        command = `pip install ${packageName}`;
      } else {
        return res.status(400).json({ error: `Unsupported language: ${language}` });
      }
      
      console.log(`[Package Manager] Installing with ${manager}: ${command}`);
      const { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });

      res.json({
        success: true,
        language,
        packageName,
        manager,
        output: stdout || stderr,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error installing package:', error);
      res.status(500).json({ 
        error: 'Failed to install package',
        details: error.message,
        output: error.stdout || error.stderr || ""
      });
    }
  });

  // Get installed packages
  app.get('/api/packages/list/:language', async (req: Request, res: Response) => {
    try {
      const { language } = req.params;
      let listCommand = '';

      switch (language.toLowerCase()) {
        case 'nodejs':
        case 'javascript':
        case 'typescript':
          listCommand = 'npm list --depth=0 --json';
          break;
        case 'python':
          listCommand = 'pip list --format=json';
          break;
        default:
          return res.status(400).json({ 
            error: `Unsupported language: ${language}` 
          });
      }

      const { stdout } = await execAsync(listCommand);
      const packages = JSON.parse(stdout);

      res.json({ language, packages });
    } catch (error: any) {
      console.error('Error listing packages:', error);
      res.status(500).json({ 
        error: 'Failed to list packages',
        details: error.message 
      });
    }
  });
}