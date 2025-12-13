import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import * as crypto from 'crypto';

export function createWebhooksRoutes(pool: Pool): Router {
  const router = Router();

  // POST /api/v1/webhooks - Register webhook
  router.post(
    '/',
    authenticate(pool),
    [
      body('url').isURL(),
      body('events').isArray({ min: 1 }),
      body('events.*').isIn([
        'deployment.started',
        'deployment.completed',
        'deployment.failed',
        'build.started',
        'build.completed',
        'build.failed',
        'resource.warning',
        'resource.limit',
        'payment.success',
        'payment.failed',
      ]),
      body('project_id').optional().isInt(),
      body('secret').optional().isString(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { url, events, project_id, secret } = req.body;
      const userId = (req as any).user?.id;

      try {
        // Generate secret if not provided
        const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

        const result = await pool.query(
          `INSERT INTO webhooks (user_id, project_id, url, events, secret, active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
           RETURNING *`,
          [userId, project_id || null, url, JSON.stringify(events), webhookSecret]
        );

        res.status(201).json({
          success: true,
          data: result.rows[0],
          message: 'Webhook registered successfully',
        });
      } catch (error: any) {
        console.error('Error registering webhook:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to register webhook',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/webhooks - List webhooks
  router.get(
    '/',
    authenticate(pool),
    [
      query('project_id').optional().isInt(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = (req as any).user?.id;
      const projectId = req.query.project_id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      try {
        let query = 'SELECT * FROM webhooks WHERE user_id = $1';
        let countQuery = 'SELECT COUNT(*) FROM webhooks WHERE user_id = $1';
        const values: any[] = [userId];

        if (projectId) {
          query += ' AND project_id = $2';
          countQuery += ' AND project_id = $2';
          values.push(projectId);
        }

        query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        const [result, countResult] = await Promise.all([
          pool.query(query, values),
          pool.query(countQuery, projectId ? [userId, projectId] : [userId]),
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
        console.error('Error listing webhooks:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to list webhooks',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/webhooks/:id - Get webhook details
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
          'SELECT * FROM webhooks WHERE id = $1 AND user_id = $2',
          [id, userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Webhook not found',
          });
        }

        res.json({
          success: true,
          data: result.rows[0],
        });
      } catch (error: any) {
        console.error('Error fetching webhook:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch webhook',
          details: error.message,
        });
      }
    }
  );

  // PUT /api/v1/webhooks/:id - Update webhook
  router.put(
    '/:id',
    authenticate(pool),
    [
      param('id').isInt(),
      body('url').optional().isURL(),
      body('events').optional().isArray({ min: 1 }),
      body('active').optional().isBoolean(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const { url, events, active } = req.body;
      const userId = (req as any).user?.id;

      try {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (url !== undefined) {
          updates.push(`url = $${paramIndex++}`);
          values.push(url);
        }
        if (events !== undefined) {
          updates.push(`events = $${paramIndex++}`);
          values.push(JSON.stringify(events));
        }
        if (active !== undefined) {
          updates.push(`active = $${paramIndex++}`);
          values.push(active);
        }

        if (updates.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No fields to update',
          });
        }

        updates.push(`updated_at = NOW()`);
        values.push(id, userId);

        const result = await pool.query(
          `UPDATE webhooks SET ${updates.join(', ')}
           WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
           RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Webhook not found',
          });
        }

        res.json({
          success: true,
          data: result.rows[0],
          message: 'Webhook updated successfully',
        });
      } catch (error: any) {
        console.error('Error updating webhook:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update webhook',
          details: error.message,
        });
      }
    }
  );

  // DELETE /api/v1/webhooks/:id - Delete webhook
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
          'DELETE FROM webhooks WHERE id = $1 AND user_id = $2 RETURNING id',
          [id, userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Webhook not found',
          });
        }

        res.json({
          success: true,
          message: 'Webhook deleted successfully',
        });
      } catch (error: any) {
        console.error('Error deleting webhook:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete webhook',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/webhooks/:id/deliveries - Get webhook delivery history
  router.get(
    '/:id/deliveries',
    authenticate(pool),
    [
      param('id').isInt(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const userId = (req as any).user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      try {
        // Verify webhook ownership
        const webhook = await pool.query(
          'SELECT id FROM webhooks WHERE id = $1 AND user_id = $2',
          [id, userId]
        );

        if (webhook.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Webhook not found',
          });
        }

        const [result, countResult] = await Promise.all([
          pool.query(
            `SELECT * FROM webhook_deliveries
             WHERE webhook_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
          ),
          pool.query(
            'SELECT COUNT(*) FROM webhook_deliveries WHERE webhook_id = $1',
            [id]
          ),
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
        console.error('Error fetching webhook deliveries:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch webhook deliveries',
          details: error.message,
        });
      }
    }
  );

  return router;
}
