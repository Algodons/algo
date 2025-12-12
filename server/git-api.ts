import { Express, Request, Response } from 'express';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspaces');

// Ensure workspace directory exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

export function setupGitRoutes(app: Express) {
  // Clone repository
  app.post('/api/git/clone', async (req: Request, res: Response) => {
    try {
      const { url, workspaceId } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const git: SimpleGit = simpleGit();
      await git.clone(url, workspacePath);
      
      res.json({ success: true, message: 'Repository cloned successfully', path: workspacePath });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clone repository', details: (error as Error).message });
    }
  });

  // Get status
  app.get('/api/git/status', async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.query;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId as string);
      
      const git: SimpleGit = simpleGit(workspacePath);
      const status = await git.status();
      
      res.json({ success: true, status });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get status', details: (error as Error).message });
    }
  });

  // Commit changes
  app.post('/api/git/commit', async (req: Request, res: Response) => {
    try {
      const { workspaceId, message, files } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const git: SimpleGit = simpleGit(workspacePath);
      
      if (files && files.length > 0) {
        await git.add(files);
      } else {
        await git.add('.');
      }
      
      const result = await git.commit(message);
      
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: 'Failed to commit', details: (error as Error).message });
    }
  });

  // Push changes
  app.post('/api/git/push', async (req: Request, res: Response) => {
    try {
      const { workspaceId, remote = 'origin', branch = 'main' } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const git: SimpleGit = simpleGit(workspacePath);
      const result = await git.push(remote, branch);
      
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: 'Failed to push', details: (error as Error).message });
    }
  });

  // Pull changes
  app.post('/api/git/pull', async (req: Request, res: Response) => {
    try {
      const { workspaceId, remote = 'origin', branch = 'main' } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const git: SimpleGit = simpleGit(workspacePath);
      const result = await git.pull(remote, branch);
      
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: 'Failed to pull', details: (error as Error).message });
    }
  });

  // List branches
  app.get('/api/git/branches', async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.query;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId as string);
      
      const git: SimpleGit = simpleGit(workspacePath);
      const branches = await git.branch();
      
      res.json({ success: true, branches });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list branches', details: (error as Error).message });
    }
  });

  // Create branch
  app.post('/api/git/branch', async (req: Request, res: Response) => {
    try {
      const { workspaceId, branchName } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const git: SimpleGit = simpleGit(workspacePath);
      await git.checkoutLocalBranch(branchName);
      
      res.json({ success: true, message: `Branch ${branchName} created` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create branch', details: (error as Error).message });
    }
  });

  // Checkout branch
  app.post('/api/git/checkout', async (req: Request, res: Response) => {
    try {
      const { workspaceId, branchName } = req.body;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId);
      
      const git: SimpleGit = simpleGit(workspacePath);
      await git.checkout(branchName);
      
      res.json({ success: true, message: `Checked out to ${branchName}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to checkout', details: (error as Error).message });
    }
  });

  // Get diff
  app.get('/api/git/diff', async (req: Request, res: Response) => {
    try {
      const { workspaceId, file } = req.query;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId as string);
      
      const git: SimpleGit = simpleGit(workspacePath);
      const diff = file ? await git.diff([file as string]) : await git.diff();
      
      res.json({ success: true, diff });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get diff', details: (error as Error).message });
    }
  });

  // Get log
  app.get('/api/git/log', async (req: Request, res: Response) => {
    try {
      const { workspaceId, maxCount = '50' } = req.query;
      const workspacePath = path.join(WORKSPACE_DIR, workspaceId as string);
      
      const git: SimpleGit = simpleGit(workspacePath);
      const log = await git.log({ maxCount: parseInt(maxCount as string) });
      
      res.json({ success: true, log });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get log', details: (error as Error).message });
    }
  });
}
