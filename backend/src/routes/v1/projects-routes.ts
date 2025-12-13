import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import * as path from 'path';
import * as fs from 'fs/promises';

export function createProjectsRoutes(pool: Pool): Router {
  const router = Router();

  // POST /api/v1/projects - Create project
  router.post(
    '/',
    authenticate(pool),
    [
      body('name').isLength({ min: 1, max: 100 }).trim(),
      body('description').optional().trim(),
      body('template').optional().isString(),
      body('visibility').optional().isIn(['public', 'private']),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, description, template, visibility } = req.body;
      const userId = (req as any).user?.id;

      try {
        const result = await pool.query(
          `INSERT INTO projects (name, description, template, visibility, user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
          [name, description || null, template || 'blank', visibility || 'private', userId]
        );

        res.status(201).json({
          success: true,
          data: result.rows[0],
          message: 'Project created successfully',
        });
      } catch (error: any) {
        console.error('Error creating project:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create project',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/projects/:id - Get project details
  router.get(
    '/:id',
    authenticate(pool),
    [param('id').isInt()],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const userId = (req as any).user?.id;

      try {
        const result = await pool.query(
          `SELECT p.*, u.username as owner_username
           FROM projects p
           JOIN users u ON p.user_id = u.id
           WHERE p.id = $1 AND (p.visibility = 'public' OR p.user_id = $2)`,
          [id, userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found or access denied',
          });
        }

        res.json({
          success: true,
          data: result.rows[0],
        });
      } catch (error: any) {
        console.error('Error fetching project:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch project',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/projects - List projects
  router.get(
    '/',
    authenticate(pool),
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('search').optional().trim(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const userId = (req as any).user?.id;
      const offset = (page - 1) * limit;

      try {
        let query = `
          SELECT p.*, u.username as owner_username
          FROM projects p
          JOIN users u ON p.user_id = u.id
          WHERE (p.visibility = 'public' OR p.user_id = $1)
        `;
        let countQuery = `
          SELECT COUNT(*)
          FROM projects p
          WHERE (p.visibility = 'public' OR p.user_id = $1)
        `;
        const values: any[] = [userId];

        if (search) {
          query += ' AND (p.name ILIKE $2 OR p.description ILIKE $2)';
          countQuery += ' AND (p.name ILIKE $2 OR p.description ILIKE $2)';
          values.push(`%${search}%`);
        }

        query += ` ORDER BY p.updated_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        const [result, countResult] = await Promise.all([
          pool.query(query, values),
          pool.query(countQuery, search ? [userId, `%${search}%`] : [userId]),
        ]);

        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);

        res.json({
          success: true,
          data: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        });
      } catch (error: any) {
        console.error('Error listing projects:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to list projects',
          details: error.message,
        });
      }
    }
  );

  // POST /api/v1/projects/:id/deploy - Deploy project
  router.post(
    '/:id/deploy',
    authenticate(pool),
    [param('id').isInt()],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const userId = (req as any).user?.id;

      try {
        // Verify project ownership
        const project = await pool.query(
          'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
          [id, userId]
        );

        if (project.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found or access denied',
          });
        }

        // Create deployment record
        const deployment = await pool.query(
          `INSERT INTO deployments (project_id, status, created_at, updated_at)
           VALUES ($1, 'pending', NOW(), NOW())
           RETURNING *`,
          [id]
        );

        res.status(202).json({
          success: true,
          data: deployment.rows[0],
          message: 'Deployment initiated',
        });
      } catch (error: any) {
        console.error('Error deploying project:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to deploy project',
          details: error.message,
        });
      }
    }
  );

  // DELETE /api/v1/projects/:id - Delete project
  router.delete(
    '/:id',
    authenticate(pool),
    [param('id').isInt()],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const userId = (req as any).user?.id;

      try {
        const result = await pool.query(
          'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
          [id, userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found or access denied',
          });
        }

        res.json({
          success: true,
          message: 'Project deleted successfully',
        });
      } catch (error: any) {
        console.error('Error deleting project:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete project',
          details: error.message,
        });
      }
    }
  );

  // POST /api/v1/projects/:id/clone - Clone project
  router.post(
    '/:id/clone',
    authenticate(pool),
    [
      param('id').isInt(),
      body('name').optional().isLength({ min: 1, max: 100 }).trim(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const { name } = req.body;
      const userId = (req as any).user?.id;

      try {
        // Get original project
        const original = await pool.query(
          'SELECT * FROM projects WHERE id = $1 AND (visibility = \'public\' OR user_id = $2)',
          [id, userId]
        );

        if (original.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Project not found or access denied',
          });
        }

        const originalProject = original.rows[0];
        const cloneName = name || `${originalProject.name} (Clone)`;

        // Create cloned project
        const result = await pool.query(
          `INSERT INTO projects (name, description, template, visibility, user_id, cloned_from, created_at, updated_at)
           VALUES ($1, $2, $3, 'private', $4, $5, NOW(), NOW())
           RETURNING *`,
          [cloneName, originalProject.description, originalProject.template, userId, id]
        );

        res.status(201).json({
          success: true,
          data: result.rows[0],
          message: 'Project cloned successfully',
        });
      } catch (error: any) {
        console.error('Error cloning project:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to clone project',
          details: error.message,
        });
      }
    }
  );

  return router;
}
