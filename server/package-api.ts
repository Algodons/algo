import { Express, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspaces');

export function setupPackageRoutes(app: Express) {
  // NPM operations
  app.post('/api/package/npm/install', async (req: Request, res: Response) => {
    try {
      const { workspaceId, packages } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const packageList = Array.isArray(packages) ? packages.join(' ') : packages || '';
      const command = packageList ? `npm install ${packageList}` : 'npm install';
      
      const { stdout, stderr } = await execAsync(command, { cwd: workspacePath });
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'NPM install failed', details: (error as Error).message });
    }
  });

  app.post('/api/package/npm/uninstall', async (req: Request, res: Response) => {
    try {
      const { workspaceId, packages } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const packageList = Array.isArray(packages) ? packages.join(' ') : packages;
      const { stdout, stderr } = await execAsync(`npm uninstall ${packageList}`, { cwd: workspacePath });
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'NPM uninstall failed', details: (error as Error).message });
    }
  });

  app.get('/api/package/npm/list', async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.query;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId as string);
      
      const { stdout } = await execAsync('npm list --json', { cwd: workspacePath });
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
      
      const packageList = Array.isArray(packages) ? packages.join(' ') : packages;
      const { stdout, stderr } = await execAsync(`pip install ${packageList}`, { cwd: workspacePath });
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'PIP install failed', details: (error as Error).message });
    }
  });

  app.post('/api/package/pip/uninstall', async (req: Request, res: Response) => {
    try {
      const { workspaceId, packages } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const packageList = Array.isArray(packages) ? packages.join(' ') : packages;
      const { stdout, stderr } = await execAsync(`pip uninstall -y ${packageList}`, { cwd: workspacePath });
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'PIP uninstall failed', details: (error as Error).message });
    }
  });

  app.get('/api/package/pip/list', async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.query;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId as string);
      
      const { stdout } = await execAsync('pip list --format=json', { cwd: workspacePath });
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
      
      const packageList = Array.isArray(packages) ? packages.join(' ') : packages;
      const { stdout, stderr } = await execAsync(`cargo install ${packageList}`, { cwd: workspacePath });
      
      res.json({ success: true, stdout, stderr });
    } catch (error) {
      res.status(500).json({ error: 'Cargo install failed', details: (error as Error).message });
    }
  });

  app.post('/api/package/cargo/build', async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const { stdout, stderr } = await execAsync('cargo build', { cwd: workspacePath });
      
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
