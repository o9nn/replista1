import type { Express, Request, Response } from "express";
import * as fs from 'fs/promises';
import * as path from 'path';
import { Router } from 'express';
import { readdir, readFile, writeFile, unlink, stat } from 'fs/promises';
import { join, extname } from 'path';
import multer from 'multer';
import { buildFileTree } from './tree';

const upload = multer({ dest: '/tmp/uploads/' });

export function registerFileOperationsRoutes(app: Express): void {
  // Read file content
  app.post("/api/file/read", async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: "File path is required" });
      }

      const fullPath = path.join(process.cwd(), filePath);
      const content = await fs.readFile(fullPath, 'utf-8');

      res.json({ filePath, content });
    } catch (error) {
      console.error("Error reading file:", error);
      res.status(500).json({
        error: "Failed to read file",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Write file content
  app.post("/api/file/write", async (req: Request, res: Response) => {
    try {
      const { filePath, content } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: "File path is required" });
      }

      const fullPath = path.join(process.cwd(), filePath);
      const dir = path.dirname(fullPath);

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');

      res.json({ filePath, success: true });
    } catch (error) {
      console.error("Error writing file:", error);
      res.status(500).json({
        error: "Failed to write file",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // List directory contents
  app.post("/api/file/list", async (req: Request, res: Response) => {
    try {
      const { dirPath = '.' } = req.body;
      const fullPath = path.join(process.cwd(), dirPath);

      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files = entries.map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile()
      }));

      res.json({ dirPath, files });
    } catch (error) {
      console.error("Error listing directory:", error);
      res.status(500).json({
        error: "Failed to list directory",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Delete file or directory
  app.post("/api/file/delete", async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: "File path is required" });
      }

      const fullPath = path.join(process.cwd(), filePath);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }

      res.json({ filePath, success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({
        error: "Failed to delete file",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}


export function registerFileOperationRoutes(router: Router) {
  // Get file tree
  router.get('/api/files/tree', async (req: Request, res: Response) => {
    try {
      const tree = await buildFileTree(process.cwd());
      res.json({ tree });
    } catch (error) {
      console.error('Error building file tree:', error);
      res.status(500).json({ error: 'Failed to build file tree' });
    }
  });

  // List workspace files
  router.get('/api/files/list', async (req: Request, res: Response) => {
    try {
      const workspaceRoot = process.cwd();
      const files = await listFilesRecursive(workspaceRoot);

      const fileData = await Promise.all(
        files.map(async (filePath) => {
          const content = await readFile(filePath, 'utf-8');
          const stats = await stat(filePath);
          const ext = extname(filePath).slice(1);

          return {
            id: Buffer.from(filePath).toString('base64'),
            name: filePath.replace(workspaceRoot + '/', ''),
            path: filePath,
            content,
            size: stats.size,
            language: ext || 'plaintext',
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
          };
        })
      );

      res.json(fileData);
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ error: 'Failed to list files' });
    }
  });

  // Upload file
  router.post('/api/files/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { name, language } = req.body;
      const content = await readFile(req.file.path, 'utf-8');
      const filePath = join(process.cwd(), name);

      await writeFile(filePath, content);
      await unlink(req.file.path); // Clean up temp file

      const stats = await stat(filePath);

      res.json({
        id: Buffer.from(filePath).toString('base64'),
        name,
        path: filePath,
        content,
        size: stats.size,
        language: language || 'plaintext',
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Update file
  router.patch('/api/files/:id', async (req: Request, res: Response) => {
    try {
      const filePath = Buffer.from(req.params.id, 'base64').toString('utf-8');
      const { content } = req.body;

      await writeFile(filePath, content);
      const stats = await stat(filePath);

      res.json({
        id: req.params.id,
        name: filePath.replace(process.cwd() + '/', ''),
        path: filePath,
        content,
        size: stats.size,
        updatedAt: stats.mtime,
      });
    } catch (error) {
      console.error('Error updating file:', error);
      res.status(500).json({ error: 'Failed to update file' });
    }
  });

  // Delete file
  router.delete('/api/files/:id', async (req: Request, res: Response) => {
    try {
      const filePath = Buffer.from(req.params.id, 'base64').toString('utf-8');
      await unlink(filePath);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // Batch update files
  router.post('/api/files/batch-update', async (req: Request, res: Response) => {
    try {
      const { changes } = req.body;
      const errors: string[] = [];
      let filesUpdated = 0;

      for (const change of changes) {
        try {
          const filePath = change.fileName.startsWith('/')
            ? change.fileName
            : join(process.cwd(), change.fileName);

          await writeFile(filePath, change.newContent);
          filesUpdated++;
        } catch (error) {
          errors.push(`Failed to update ${change.fileName}: ${error}`);
        }
      }

      res.json({
        success: errors.length === 0,
        filesUpdated,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error('Error batch updating files:', error);
      res.status(500).json({ error: 'Failed to batch update files' });
    }
  });
}

async function listFilesRecursive(dir: string, fileList: string[] = []): Promise<string[]> {
  const files = await readdir(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stats = await stat(filePath);

    // Skip node_modules, .git, and other common directories
    if (stats.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.config'].includes(file)) {
        await listFilesRecursive(filePath, fileList);
      }
    } else if (stats.isFile()) {
      // Only include text files
      const ext = extname(file);
      const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.css', '.html'];
      if (textExtensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}