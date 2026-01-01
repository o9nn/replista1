
import * as fs from 'fs/promises';
import * as path from 'path';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  'coverage',
  '.vscode',
  '.idea'
]);

export async function buildFileTree(rootPath: string, relativePath: string = ''): Promise<FileNode[]> {
  const fullPath = path.join(rootPath, relativePath);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.replit') continue;
    if (IGNORED_DIRS.has(entry.name)) continue;

    const entryPath = path.join(relativePath, entry.name);
    
    if (entry.isDirectory()) {
      const children = await buildFileTree(rootPath, entryPath);
      nodes.push({
        name: entry.name,
        path: entryPath,
        type: 'directory',
        children: children.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
      });
    } else {
      nodes.push({
        name: entry.name,
        path: entryPath,
        type: 'file'
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
