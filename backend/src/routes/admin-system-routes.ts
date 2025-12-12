import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAdmin, requireSuperAdmin, require2FA, logAdminAction } from '../middleware/admin-auth';

export function createAdminSystemRoutes(pool: Pool) {
  const router = express.Router();

  // Apply admin authentication and logging to all routes
  router.use(requireAdmin);
  router.use(logAdminAction(pool));

  /**
   * GET /api/admin/system/health
   * Server health monitoring
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const { period = '1h' } = req.query;

      const result = await pool.query(
        `SELECT 
           server_id,
           AVG(cpu_usage) as avg_cpu,
           MAX(cpu_usage) as max_cpu,
           AVG(memory_usage) as avg_memory,
           MAX(memory_usage) as max_memory,
           AVG(disk_usage) as avg_disk,
           status,
           COUNT(*) as metric_count
         FROM server_health
         WHERE timestamp > NOW() - INTERVAL '${period}'
         GROUP BY server_id, status
         ORDER BY server_id`
      );

      // Get latest status for each server
      const latestResult = await pool.query(
        `SELECT DISTINCT ON (server_id) *
         FROM server_health
         ORDER BY server_id, timestamp DESC`
      );

      res.json({
        aggregated: result.rows,
        latest: latestResult.rows,
      });
    } catch (error) {
      console.error('Error fetching server health:', error);
      res.status(500).json({ error: 'Failed to fetch server health' });
    }
  });

  /**
   * GET /api/admin/system/database-pool
   * Database connection pool status
   */
  router.get('/database-pool', async (req: Request, res: Response) => {
    try {
      // Get pool stats from pg pool
      const poolStats = {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount,
      };

      // Get query performance
      const performanceResult = await pool.query(
        `SELECT 
           COUNT(*) as total_queries,
           AVG(response_time_ms) as avg_response_time,
           MAX(response_time_ms) as max_response_time
         FROM api_usage
         WHERE timestamp > NOW() - INTERVAL '1 hour'`
      );

      res.json({
        pool: poolStats,
        performance: performanceResult.rows[0],
      });
    } catch (error) {
      console.error('Error fetching database pool status:', error);
      res.status(500).json({ error: 'Failed to fetch database pool status' });
    }
  });

  /**
   * GET /api/admin/system/containers
   * Container orchestration overview
   */
  router.get('/containers', async (req: Request, res: Response) => {
    try {
      const { period = '1h' } = req.query;

      // Get pod status
      const podsResult = await pool.query(
        `SELECT 
           status,
           COUNT(*) as count,
           AVG(cpu_usage) as avg_cpu,
           AVG(memory_usage) as avg_memory
         FROM container_metrics
         WHERE timestamp > NOW() - INTERVAL '${period}'
         GROUP BY status`
      );

      // Get node allocation
      const nodesResult = await pool.query(
        `SELECT 
           node_name,
           COUNT(DISTINCT pod_name) as pod_count,
           AVG(cpu_usage) as avg_cpu,
           AVG(memory_usage) as avg_memory
         FROM container_metrics
         WHERE timestamp > NOW() - INTERVAL '${period}'
         GROUP BY node_name
         ORDER BY pod_count DESC`
      );

      // Get restart statistics
      const restartsResult = await pool.query(
        `SELECT 
           pod_name,
           SUM(restart_count) as total_restarts
         FROM container_metrics
         WHERE timestamp > NOW() - INTERVAL '${period}' AND restart_count > 0
         GROUP BY pod_name
         ORDER BY total_restarts DESC
         LIMIT 10`
      );

      res.json({
        pods: podsResult.rows,
        nodes: nodesResult.rows,
        topRestarts: restartsResult.rows,
      });
    } catch (error) {
      console.error('Error fetching container metrics:', error);
      res.status(500).json({ error: 'Failed to fetch container metrics' });
    }
  });

  /**
   * GET /api/admin/system/deployment-queue
   * Deployment queue management
   */
  router.get('/deployment-queue', async (req: Request, res: Response) => {
    try {
      const { status } = req.query;

      let query = `
        SELECT dq.*, p.name as project_name, u.email, u.name as user_name
        FROM deployment_queue dq
        JOIN projects p ON dq.project_id = p.id
        JOIN users u ON dq.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (status) {
        query += ' AND dq.status = $1';
        params.push(status);
      }

      query += ' ORDER BY dq.priority DESC, dq.queued_at ASC';

      const result = await pool.query(query, params);

      res.json({ deployments: result.rows });
    } catch (error) {
      console.error('Error fetching deployment queue:', error);
      res.status(500).json({ error: 'Failed to fetch deployment queue' });
    }
  });

  /**
   * POST /api/admin/system/deployment-queue/:id/retry
   * Retry failed deployment
   */
  router.post('/deployment-queue/:id/retry', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE deployment_queue 
         SET status = 'pending', error_message = NULL, retry_count = retry_count + 1
         WHERE id = $1 AND status = 'failed' AND retry_count < max_retries
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Deployment not found or max retries reached' });
      }

      res.json({ deployment: result.rows[0] });
    } catch (error) {
      console.error('Error retrying deployment:', error);
      res.status(500).json({ error: 'Failed to retry deployment' });
    }
  });

  /**
   * POST /api/admin/system/deployment-queue/:id/cancel
   * Cancel deployment
   */
  router.post('/deployment-queue/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE deployment_queue 
         SET status = 'cancelled'
         WHERE id = $1 AND status IN ('pending', 'in_progress')
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Deployment not found or cannot be cancelled' });
      }

      res.json({ deployment: result.rows[0] });
    } catch (error) {
      console.error('Error cancelling deployment:', error);
      res.status(500).json({ error: 'Failed to cancel deployment' });
    }
  });

  /**
   * GET /api/admin/system/announcements
   * Get system announcements
   */
  router.get('/announcements', async (req: Request, res: Response) => {
    try {
      const { isActive } = req.query;

      let query = 'SELECT * FROM system_announcements WHERE 1=1';
      const params: any[] = [];

      if (isActive !== undefined) {
        query += ' AND is_active = $1';
        params.push(isActive === 'true');
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.json({ announcements: result.rows });
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  /**
   * POST /api/admin/system/announcements
   * Create system announcement
   */
  router.post('/announcements', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { title, message, type, severity, displayLocations, startsAt, endsAt } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
      }

      const result = await pool.query(
        `INSERT INTO system_announcements 
         (title, message, type, severity, display_locations, starts_at, ends_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          title,
          message,
          type || 'info',
          severity || 'low',
          displayLocations ? JSON.stringify(displayLocations) : null,
          startsAt || null,
          endsAt || null,
          req.user!.id,
        ]
      );

      res.json({ announcement: result.rows[0] });
    } catch (error) {
      console.error('Error creating announcement:', error);
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  });

  /**
   * PUT /api/admin/system/announcements/:id
   * Update announcement
   */
  router.put('/announcements/:id', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, message, type, severity, isActive, displayLocations, endsAt } = req.body;

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (title) {
        updates.push(`title = $${paramIndex}`);
        params.push(title);
        paramIndex++;
      }

      if (message) {
        updates.push(`message = $${paramIndex}`);
        params.push(message);
        paramIndex++;
      }

      if (type) {
        updates.push(`type = $${paramIndex}`);
        params.push(type);
        paramIndex++;
      }

      if (severity) {
        updates.push(`severity = $${paramIndex}`);
        params.push(severity);
        paramIndex++;
      }

      if (isActive !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        params.push(isActive);
        paramIndex++;
      }

      if (displayLocations) {
        updates.push(`display_locations = $${paramIndex}`);
        params.push(JSON.stringify(displayLocations));
        paramIndex++;
      }

      if (endsAt !== undefined) {
        updates.push(`ends_at = $${paramIndex}`);
        params.push(endsAt);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(id);

      const query = `UPDATE system_announcements SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      res.json({ announcement: result.rows[0] });
    } catch (error) {
      console.error('Error updating announcement:', error);
      res.status(500).json({ error: 'Failed to update announcement' });
    }
  });

  /**
   * GET /api/admin/system/feature-flags
   * List feature flags
   */
  router.get('/feature-flags', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT * FROM feature_flags ORDER BY created_at DESC'
      );

      res.json({ featureFlags: result.rows });
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      res.status(500).json({ error: 'Failed to fetch feature flags' });
    }
  });

  /**
   * POST /api/admin/system/feature-flags
   * Create feature flag
   */
  router.post('/feature-flags', requireSuperAdmin, require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { name, description, isEnabled, rolloutPercentage, targetSegments, metadata } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Feature flag name is required' });
      }

      const result = await pool.query(
        `INSERT INTO feature_flags 
         (name, description, is_enabled, rollout_percentage, target_segments, metadata, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          name,
          description || null,
          isEnabled || false,
          rolloutPercentage || 0,
          targetSegments ? JSON.stringify(targetSegments) : null,
          metadata ? JSON.stringify(metadata) : null,
          req.user!.id,
        ]
      );

      res.json({ featureFlag: result.rows[0] });
    } catch (error) {
      console.error('Error creating feature flag:', error);
      res.status(500).json({ error: 'Failed to create feature flag' });
    }
  });

  /**
   * PUT /api/admin/system/feature-flags/:id
   * Update feature flag
   */
  router.put('/feature-flags/:id', requireSuperAdmin, require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isEnabled, rolloutPercentage, targetSegments, changeReason } = req.body;

      // Get current values for history
      const currentResult = await pool.query('SELECT * FROM feature_flags WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Feature flag not found' });
      }

      const current = currentResult.rows[0];

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update feature flag
        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (isEnabled !== undefined) {
          updates.push(`is_enabled = $${paramIndex}`);
          params.push(isEnabled);
          paramIndex++;
        }

        if (rolloutPercentage !== undefined) {
          updates.push(`rollout_percentage = $${paramIndex}`);
          params.push(rolloutPercentage);
          paramIndex++;
        }

        if (targetSegments !== undefined) {
          updates.push(`target_segments = $${paramIndex}`);
          params.push(JSON.stringify(targetSegments));
          paramIndex++;
        }

        if (updates.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);

        const query = `UPDATE feature_flags SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await client.query(query, params);

        // Record history
        await client.query(
          `INSERT INTO feature_flag_history (feature_flag_id, changed_by, previous_value, new_value, change_reason)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, req.user!.id, JSON.stringify(current), JSON.stringify(result.rows[0]), changeReason || null]
        );

        await client.query('COMMIT');

        res.json({ featureFlag: result.rows[0] });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating feature flag:', error);
      res.status(500).json({ error: 'Failed to update feature flag' });
    }
  });

  /**
   * GET /api/admin/system/rate-limits
   * List rate limits
   */
  router.get('/rate-limits', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT rl.*, u.email as user_email
         FROM rate_limits rl
         LEFT JOIN users u ON rl.user_id = u.id
         WHERE rl.is_active = true
         ORDER BY rl.created_at DESC`
      );

      res.json({ rateLimits: result.rows });
    } catch (error) {
      console.error('Error fetching rate limits:', error);
      res.status(500).json({ error: 'Failed to fetch rate limits' });
    }
  });

  /**
   * POST /api/admin/system/rate-limits
   * Create rate limit
   */
  router.post('/rate-limits', requireSuperAdmin, require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { userId, ipAddress, endpointPattern, limitType, requestsPerMinute, requestsPerHour, requestsPerDay } =
        req.body;

      if (!limitType) {
        return res.status(400).json({ error: 'Limit type is required' });
      }

      const result = await pool.query(
        `INSERT INTO rate_limits 
         (user_id, ip_address, endpoint_pattern, limit_type, requests_per_minute, requests_per_hour, requests_per_day, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          userId || null,
          ipAddress || null,
          endpointPattern || null,
          limitType,
          requestsPerMinute || null,
          requestsPerHour || null,
          requestsPerDay || null,
          req.user!.id,
        ]
      );

      res.json({ rateLimit: result.rows[0] });
    } catch (error) {
      console.error('Error creating rate limit:', error);
      res.status(500).json({ error: 'Failed to create rate limit' });
    }
  });

  /**
   * POST /api/admin/system/cdn/purge
   * Purge CDN cache
   */
  router.post('/cdn/purge', requireSuperAdmin, require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { operationType, targetPattern, urls } = req.body;

      if (!operationType) {
        return res.status(400).json({ error: 'Operation type is required' });
      }

      const result = await pool.query(
        `INSERT INTO cdn_cache_operations (operation_type, target_pattern, urls_purged, initiated_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [operationType, targetPattern || null, urls?.length || 0, req.user!.id]
      );

      // TODO: Integrate with CDN provider (CloudFlare, CloudFront, etc.)

      res.json({
        operation: result.rows[0],
        message: 'CDN purge initiated',
      });
    } catch (error) {
      console.error('Error purging CDN cache:', error);
      res.status(500).json({ error: 'Failed to purge CDN cache' });
    }
  });

  return router;
}
