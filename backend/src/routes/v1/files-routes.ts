import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { param, query, validationResult } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import * as path from 'path';
import * as fs from 'fs/promises';

export function createFilesRoutes(pool: Pool): Router {
  const router = Router();
  const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspaces');

  // Helper function to validate and resolve path
  function validatePath(filePath: string, projectId: string): { isValid: boolean; fullPath: string } {
    const projectPath = path.join(WORKSPACE_DIR, projectId);
    const fullPath = path.resolve(projectPath, filePath);
    
    // Prevent directory traversal
    if (!fullPath.startsWith(projectPath)) {
      return { isValid: false, fullPath: '' };
    }
    
    return { isValid: true, fullPath };
  }

  // GET /api/v1/files/*path - Read file
  router.get(
    '/*',
    authenticate(pool),
    async (req: Request, res: Response) => {
      const filePath = req.params[0] || '';
      const projectId = req.query.projectId as string;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'projectId is required',
        });
      }

      try {
        const { isValid, fullPath } = validatePath(filePath, projectId);
        
        if (!isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file path',
          });
        }

        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          // List directory contents
          const files = await fs.readdir(fullPath, { withFileTypes: true });
          const fileList = files.map(file => ({
            name: file.name,
            type: file.isDirectory() ? 'directory' : 'file',
            path: path.join(filePath, file.name),
          }));

          return res.json({
            success: true,
            data: {
              type: 'directory',
              path: filePath,
              contents: fileList,
            },
          });
        } else {
          // Read file content
          const content = await fs.readFile(fullPath, 'utf-8');
          return res.json({
            success: true,
            data: {
              type: 'file',
              path: filePath,
              content,
            },
          });
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return res.status(404).json({
            success: false,
            error: 'File or directory not found',
          });
        }
        console.error('Error reading file:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to read file',
          details: error.message,
        });
      }
    }
  );

  // POST /api/v1/files/*path - Create file
  router.post(
    '/*',
    authenticate(pool),
    async (req: Request, res: Response) => {
      const filePath = req.params[0] || '';
      const { projectId, content, directory } = req.body;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'projectId is required',
        });
      }

      try {
        const { isValid, fullPath } = validatePath(filePath, projectId);
        
        if (!isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file path',
          });
        }

        // Create parent directory if it doesn't exist
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        if (directory) {
          // Create directory
          await fs.mkdir(fullPath, { recursive: true });
        } else {
          // Create file
          await fs.writeFile(fullPath, content || '', 'utf-8');
        }

        res.status(201).json({
          success: true,
          data: {
            path: filePath,
            type: directory ? 'directory' : 'file',
          },
          message: `${directory ? 'Directory' : 'File'} created successfully`,
        });
      } catch (error: any) {
        console.error('Error creating file:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create file',
          details: error.message,
        });
      }
    }
  );

  // PUT /api/v1/files/*path - Update file
  router.put(
    '/*',
    authenticate(pool),
    async (req: Request, res: Response) => {
      const filePath = req.params[0] || '';
      const { projectId, content } = req.body;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'projectId is required',
        });
      }

      if (content === undefined) {
        return res.status(400).json({
          success: false,
          error: 'content is required',
        });
      }

      try {
        const { isValid, fullPath } = validatePath(filePath, projectId);
        
        if (!isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file path',
          });
        }

        // Check if file exists
        await fs.access(fullPath);

        // Update file
        await fs.writeFile(fullPath, content, 'utf-8');

        res.json({
          success: true,
          data: {
            path: filePath,
          },
          message: 'File updated successfully',
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return res.status(404).json({
            success: false,
            error: 'File not found',
          });
        }
        console.error('Error updating file:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update file',
          details: error.message,
        });
      }
    }
  );

  // DELETE /api/v1/files/*path - Delete file
  router.delete(
    '/*',
    authenticate(pool),
    async (req: Request, res: Response) => {
      const filePath = req.params[0] || '';
      const projectId = req.query.projectId as string;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'projectId is required',
        });
      }

      try {
        const { isValid, fullPath } = validatePath(filePath, projectId);
        
        if (!isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid file path',
          });
        }

        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(fullPath);
        }

        res.json({
          success: true,
          message: `${stats.isDirectory() ? 'Directory' : 'File'} deleted successfully`,
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return res.status(404).json({
            success: false,
            error: 'File or directory not found',
          });
        }
        console.error('Error deleting file:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete file',
          details: error.message,
        });
      }
    }
  );

  return router;
}
