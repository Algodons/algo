import { Express, Request, Response } from 'express';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspaces');
const watchers = new Map<string, chokidar.FSWatcher>();

export function setupPreviewServer(app: Express) {
  // Serve preview files
  app.get('/api/preview/:workspaceId/*', (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const filePath = req.params[0];
      const fullPath = path.join(WORKSPACE_DIR, workspaceId, filePath);
      
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
      const fullPath = path.join(WORKSPACE_DIR, workspaceId, watchPath);
      
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
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId as string);
      
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
