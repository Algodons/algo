import { Express, Request, Response } from 'express';
import { spawn } from 'child_process';
import * as path from 'path';

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspaces');

// Validate package name to prevent command injection
function isValidPackageName(name: string): boolean {
  // Allow alphanumeric, hyphens, underscores, dots, slashes (for scoped packages), and @
  return /^[@a-zA-Z0-9_.\-\/]+$/.test(name);
}

// Execute command safely using spawn
function executeCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

export function setupPackageRoutes(app: Express) {
  // NPM operations
  app.post('/api/package/npm/install', async (req: Request, res: Response) => {
    try {
      const { workspaceId, packages } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const packageList = Array.isArray(packages) ? packages : (packages ? [packages] : []);
      
      // Validate all package names
      for (const pkg of packageList) {
        if (!isValidPackageName(pkg)) {
          return res.status(400).json({ error: 'Invalid package name', details: `Package name "${pkg}" contains invalid characters` });
        }
      }
      
      const args = packageList.length > 0 ? ['install', ...packageList] : ['install'];
      const { stdout, stderr } = await executeCommand('npm', args, workspacePath);
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'NPM install failed', details: (error as Error).message });
    }
  });

  app.post('/api/package/npm/uninstall', async (req: Request, res: Response) => {
    try {
      const { workspaceId, packages } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const packageList = Array.isArray(packages) ? packages : [packages];
      
      // Validate all package names
      for (const pkg of packageList) {
        if (!isValidPackageName(pkg)) {
          return res.status(400).json({ error: 'Invalid package name', details: `Package name "${pkg}" contains invalid characters` });
        }
      }
      
      const { stdout, stderr } = await executeCommand('npm', ['uninstall', ...packageList], workspacePath);
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'NPM uninstall failed', details: (error as Error).message });
    }
  });

  app.get('/api/package/npm/list', async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.query;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId as string);
      
      const { stdout } = await executeCommand('npm', ['list', '--json'], workspacePath);
      const packages = JSON.parse(stdout);
      
      res.json({ success: true, packages });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list packages', details: (error as Error).message });
    }
  });

  // PIP operations
  app.post('/api/package/pip/install', async (req: Request, res: Response) => {
    try {
      const { workspaceId, packages } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const packageList = Array.isArray(packages) ? packages : [packages];
      
      // Validate all package names
      for (const pkg of packageList) {
        if (!isValidPackageName(pkg)) {
          return res.status(400).json({ error: 'Invalid package name', details: `Package name "${pkg}" contains invalid characters` });
        }
      }
      
      const { stdout, stderr } = await executeCommand('pip', ['install', ...packageList], workspacePath);
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'PIP install failed', details: (error as Error).message });
    }
  });

  app.post('/api/package/pip/uninstall', async (req: Request, res: Response) => {
    try {
      const { workspaceId, packages } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const packageList = Array.isArray(packages) ? packages : [packages];
      
      // Validate all package names
      for (const pkg of packageList) {
        if (!isValidPackageName(pkg)) {
          return res.status(400).json({ error: 'Invalid package name', details: `Package name "${pkg}" contains invalid characters` });
        }
      }
      
      const { stdout, stderr } = await executeCommand('pip', ['uninstall', '-y', ...packageList], workspacePath);
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'PIP uninstall failed', details: (error as Error).message });
    }
  });

  app.get('/api/package/pip/list', async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.query;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId as string);
      
      const { stdout } = await executeCommand('pip', ['list', '--format=json'], workspacePath);
      const packages = JSON.parse(stdout);
      
      res.json({ success: true, packages });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list packages', details: (error as Error).message });
    }
  });

  // Cargo operations
  app.post('/api/package/cargo/install', async (req: Request, res: Response) => {
    try {
      const { workspaceId, packages } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const packageList = Array.isArray(packages) ? packages : [packages];
      
      // Validate all package names
      for (const pkg of packageList) {
        if (!isValidPackageName(pkg)) {
          return res.status(400).json({ error: 'Invalid package name', details: `Package name "${pkg}" contains invalid characters` });
        }
      }
      
      const { stdout, stderr } = await executeCommand('cargo', ['install', ...packageList], workspacePath);
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'Cargo install failed', details: (error as Error).message });
    }
  });

  app.post('/api/package/cargo/build', async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const { stdout, stderr } = await executeCommand('cargo', ['build'], workspacePath);
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'Cargo build failed', details: (error as Error).message });
    }
  });

  // Generic package manager detection
  app.get('/api/package/detect', async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.query;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId as string);
      
      const managers = [];
      const fs = require('fs');
      
      if (fs.existsSync(path.join(workspacePath, 'package.json'))) managers.push('npm');
      if (fs.existsSync(path.join(workspacePath, 'requirements.txt'))) managers.push('pip');
      if (fs.existsSync(path.join(workspacePath, 'Cargo.toml'))) managers.push('cargo');
      if (fs.existsSync(path.join(workspacePath, 'Gemfile'))) managers.push('bundler');
      if (fs.existsSync(path.join(workspacePath, 'go.mod'))) managers.push('go');
      
      res.json({ success: true, managers });
    } catch (error) {
      res.status(500).json({ error: 'Failed to detect package managers', details: (error as Error).message });
    }
  });
}
