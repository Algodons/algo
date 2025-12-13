import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { param, validationResult } from 'express-validator';
import { authenticate } from '../../middleware/auth';

export function createDeploymentsRoutes(pool: Pool): Router {
  const router = Router();

  // GET /api/v1/deployments/:id - Get deployment status
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
          `SELECT d.*, p.name as project_name, p.user_id
           FROM deployments d
           JOIN projects p ON d.project_id = p.id
           WHERE d.id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Deployment not found',
          });
        }

        const deployment = result.rows[0];

        // Check if user has access
        if (deployment.user_id !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
          });
        }

        res.json({
          success: true,
          data: deployment,
        });
      } catch (error: any) {
        console.error('Error fetching deployment:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch deployment',
          details: error.message,
        });
      }
    }
  );

  // POST /api/v1/deployments/:id/rollback - Rollback deployment
  router.post(
    '/:id/rollback',
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
        // Get deployment and verify ownership
        const deployment = await pool.query(
          `SELECT d.*, p.user_id
           FROM deployments d
           JOIN projects p ON d.project_id = p.id
           WHERE d.id = $1`,
          [id]
        );

        if (deployment.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Deployment not found',
          });
        }

        if (deployment.rows[0].user_id !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
          });
        }

        // Update deployment status
        const result = await pool.query(
          `UPDATE deployments SET status = 'rolling_back', updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [id]
        );

        res.json({
          success: true,
          data: result.rows[0],
          message: 'Rollback initiated',
        });
      } catch (error: any) {
        console.error('Error rolling back deployment:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to rollback deployment',
          details: error.message,
        });
      }
    }
  );

  return router;
}
