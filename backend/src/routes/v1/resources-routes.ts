import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { query, validationResult } from 'express-validator';
import { authenticate } from '../../middleware/auth';

export function createResourcesRoutes(pool: Pool): Router {
  const router = Router();

  // GET /api/v1/resources/usage - Query resource usage
  router.get(
    '/usage',
    authenticate(pool),
    [
      query('project_id').optional().isInt(),
      query('start_date').optional().isISO8601(),
      query('end_date').optional().isISO8601(),
      query('metric').optional().isIn(['cpu', 'memory', 'storage', 'bandwidth', 'all']),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = (req as any).user?.id;
      const projectId = req.query.project_id;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;
      const metric = req.query.metric as string || 'all';

      try {
        let query = `
          SELECT 
            ru.id,
            ru.project_id,
            ru.metric,
            ru.value,
            ru.unit,
            ru.timestamp,
            p.name as project_name
          FROM resource_usage ru
          JOIN projects p ON ru.project_id = p.id
          WHERE p.user_id = $1
        `;
        const values: any[] = [userId];
        let paramIndex = 2;

        if (projectId) {
          query += ` AND ru.project_id = $${paramIndex++}`;
          values.push(projectId);
        }

        if (startDate) {
          query += ` AND ru.timestamp >= $${paramIndex++}`;
          values.push(startDate);
        }

        if (endDate) {
          query += ` AND ru.timestamp <= $${paramIndex++}`;
          values.push(endDate);
        }

        if (metric !== 'all') {
          query += ` AND ru.metric = $${paramIndex++}`;
          values.push(metric);
        }

        query += ' ORDER BY ru.timestamp DESC LIMIT 1000';

        const result = await pool.query(query, values);

        // Calculate aggregates
        const aggregates: any = {};
        result.rows.forEach((row: any) => {
          if (!aggregates[row.metric]) {
            aggregates[row.metric] = {
              total: 0,
              average: 0,
              peak: 0,
              count: 0,
              unit: row.unit,
            };
          }
          aggregates[row.metric].total += parseFloat(row.value);
          aggregates[row.metric].peak = Math.max(aggregates[row.metric].peak, parseFloat(row.value));
          aggregates[row.metric].count++;
        });

        Object.keys(aggregates).forEach(key => {
          aggregates[key].average = aggregates[key].total / aggregates[key].count;
        });

        res.json({
          success: true,
          data: {
            usage: result.rows,
            aggregates,
          },
        });
      } catch (error: any) {
        console.error('Error fetching resource usage:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch resource usage',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/resources/limits - Get resource limits
  router.get(
    '/limits',
    authenticate(pool),
    async (req: Request, res: Response) => {
      const userId = (req as any).user?.id;

      try {
        const result = await pool.query(
          `SELECT 
            u.id,
            s.name as plan_name,
            s.cpu_limit,
            s.memory_limit,
            s.storage_limit,
            s.bandwidth_limit,
            s.max_projects,
            us.start_date,
            us.end_date
           FROM users u
           LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
           LEFT JOIN subscriptions s ON us.subscription_id = s.id
           WHERE u.id = $1`,
          [userId]
        );

        if (result.rows.length === 0) {
          // Return default free tier limits
          return res.json({
            success: true,
            data: {
              plan_name: 'Free',
              cpu_limit: 1,
              memory_limit: 512,
              storage_limit: 1024,
              bandwidth_limit: 10240,
              max_projects: 3,
            },
          });
        }

        res.json({
          success: true,
          data: result.rows[0],
        });
      } catch (error: any) {
        console.error('Error fetching resource limits:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch resource limits',
          details: error.message,
        });
      }
    }
  );

  return router;
}
