import { Express, Request, Response } from 'express';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspaces');
const watchers = new Map<string, chokidar.FSWatcher>();

// Validate workspace ID to prevent path traversal
function isValidWorkspaceId(id: string): boolean {
  // Allow only alphanumeric, hyphens, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

// Validate and normalize file path to prevent path traversal
function validateFilePath(workspaceId: string, filePath: string): string | null {
  if (!isValidWorkspaceId(workspaceId)) {
    return null;
  }
  
  // Resolve the full path and ensure it's within the workspace directory
  const workspacePath = path.resolve(WORKSPACE_DIR, workspaceId);
  const fullPath = path.resolve(workspacePath, filePath);
  
  // Check if the resolved path is within the workspace directory
  if (!fullPath.startsWith(workspacePath + path.sep) && fullPath !== workspacePath) {
    return null;
  }
  
  return fullPath;
}

export function setupPreviewServer(app: Express) {
  // Serve preview files
  app.get('/api/preview/:workspaceId/*', (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const filePath = req.params[0];
      
      const fullPath = validateFilePath(workspaceId, filePath);
      
      if (!fullPath) {
        return res.status(400).json({ error: 'Invalid workspace ID or file path' });
      }
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.sendFile(fullPath);
    } catch (error) {
      res.status(500).json({ error: 'Failed to serve file', details: (error as Error).message });
    }
  });

  // Start watching for changes
  app.post('/api/preview/watch', (req: Request, res: Response) => {
    try {
      const { workspaceId, watchPath = '.' } = req.body;
      
      const fullPath = validateFilePath(workspaceId, watchPath);
      
      if (!fullPath) {
        return res.status(400).json({ error: 'Invalid workspace ID or watch path' });
      }
      
      if (watchers.has(workspaceId)) {
        return res.json({ success: true, message: 'Already watching' });
      }
      
      const watcher = chokidar.watch(fullPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true
      });
      
      watcher
        .on('add', path => console.log(`File ${path} has been added`))
        .on('change', path => console.log(`File ${path} has been changed`))
        .on('unlink', path => console.log(`File ${path} has been removed`));
      
      watchers.set(workspaceId, watcher);
      
      res.json({ success: true, message: 'Started watching for changes' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to start watching', details: (error as Error).message });
    }
  });

  // Stop watching
  app.post('/api/preview/unwatch', async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.body;
      
      const watcher = watchers.get(workspaceId);
      if (watcher) {
        await watcher.close();
        watchers.delete(workspaceId);
      }
      
      res.json({ success: true, message: 'Stopped watching' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop watching', details: (error as Error).message });
    }
  });

  // Get file tree
  app.get('/api/preview/files', (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.query;
      
      if (!isValidWorkspaceId(workspaceId as string)) {
        return res.status(400).json({ error: 'Invalid workspace ID' });
      }
      
      const workspacePath = path.resolve(WORKSPACE_DIR, workspaceId as string);
      
      const files = getFileTree(workspacePath, workspacePath);
      
      res.json({ success: true, files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get file tree', details: (error as Error).message });
    }
  });
}

function getFileTree(dir: string, baseDir: string): any[] {
  const items: any[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // Skip hidden files
      
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (entry.isDirectory()) {
        items.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children: getFileTree(fullPath, baseDir)
        });
      } else {
        items.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
          size: fs.statSync(fullPath).size
        });
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  
  return items;
}
