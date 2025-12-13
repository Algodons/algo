import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function createAlertsRoutes(pool: Pool) {
  const router = Router();

  /**
   * GET /api/alerts
   * Get user's configured alerts
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await pool.query(
        `SELECT 
          id, metric_type as "metricType", threshold_percentage as "thresholdPercentage",
          notification_channels as "notificationChannels", is_active as "isActive",
          last_triggered_at as "lastTriggeredAt", trigger_count as "triggerCount"
        FROM usage_alerts
        WHERE user_id = $1
        ORDER BY metric_type`,
        [req.user.id]
      );

      res.json({ alerts: result.rows });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  /**
   * POST /api/alerts/configure
   * Configure or update a usage alert
   */
  router.post('/configure', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { metricType, thresholdPercentage, notificationChannels, isActive } = req.body;

      if (!metricType) {
        return res.status(400).json({ error: 'Metric type is required' });
      }

      if (!thresholdPercentage || thresholdPercentage < 1 || thresholdPercentage > 100) {
        return res.status(400).json({ 
          error: 'Threshold percentage must be between 1 and 100' 
        });
      }

      const validMetricTypes = ['storage', 'deployment_hours', 'bandwidth'];
      if (!validMetricTypes.includes(metricType)) {
        return res.status(400).json({ 
          error: `Invalid metric type. Must be one of: ${validMetricTypes.join(', ')}` 
        });
      }

      const channels = notificationChannels || ['email'];
      const active = isActive !== undefined ? isActive : true;

      // Upsert alert
      const result = await pool.query(
        `INSERT INTO usage_alerts 
          (user_id, metric_type, threshold_percentage, notification_channels, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, metric_type) 
        DO UPDATE SET
          threshold_percentage = EXCLUDED.threshold_percentage,
          notification_channels = EXCLUDED.notification_channels,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING 
          id, metric_type as "metricType", threshold_percentage as "thresholdPercentage",
          notification_channels as "notificationChannels", is_active as "isActive"`,
        [req.user.id, metricType, thresholdPercentage, JSON.stringify(channels), active]
      );

      // Add unique constraint if it doesn't exist
      await pool.query(
        `DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'usage_alerts_user_metric_unique'
          ) THEN
            ALTER TABLE usage_alerts 
            ADD CONSTRAINT usage_alerts_user_metric_unique 
            UNIQUE (user_id, metric_type);
          END IF;
        END $$;`
      ).catch(() => {
        // Ignore if constraint already exists
      });

      res.json({ 
        success: true,
        alert: result.rows[0],
        message: 'Alert configured successfully' 
      });
    } catch (error: any) {
      console.error('Error configuring alert:', error);
      res.status(500).json({ error: error.message || 'Failed to configure alert' });
    }
  });

  /**
   * DELETE /api/alerts/:alertId
   * Delete an alert
   */
  router.delete('/:alertId', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { alertId } = req.params;

      const result = await pool.query(
        `DELETE FROM usage_alerts
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [alertId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({ 
        success: true,
        message: 'Alert deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting alert:', error);
      res.status(500).json({ error: 'Failed to delete alert' });
    }
  });

  /**
   * GET /api/alerts/history
   * Get alert trigger history
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { limit } = req.query;

      const result = await pool.query(
        `SELECT 
          h.id, h.metric_type as "metricType", h.threshold_value as "thresholdValue",
          h.current_value as "currentValue", h.percentage_used as "percentageUsed",
          h.notification_sent as "notificationSent", h.triggered_at as "triggeredAt",
          a.threshold_percentage as "thresholdPercentage"
        FROM usage_alert_history h
        LEFT JOIN usage_alerts a ON h.alert_id = a.id
        WHERE h.user_id = $1
        ORDER BY h.triggered_at DESC
        LIMIT $2`,
        [req.user.id, limit ? parseInt(limit as string) : 50]
      );

      res.json({ history: result.rows });
    } catch (error) {
      console.error('Error fetching alert history:', error);
      res.status(500).json({ error: 'Failed to fetch alert history' });
    }
  });

  /**
   * PUT /api/alerts/:alertId/toggle
   * Toggle alert active status
   */
  router.put('/:alertId/toggle', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { alertId } = req.params;
      const { isActive } = req.body;

      if (isActive === undefined) {
        return res.status(400).json({ error: 'isActive field is required' });
      }

      const result = await pool.query(
        `UPDATE usage_alerts
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3
         RETURNING 
           id, metric_type as "metricType", threshold_percentage as "thresholdPercentage",
           notification_channels as "notificationChannels", is_active as "isActive"`,
        [isActive, alertId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({ 
        success: true,
        alert: result.rows[0],
        message: isActive ? 'Alert enabled' : 'Alert disabled' 
      });
    } catch (error) {
      console.error('Error toggling alert:', error);
      res.status(500).json({ error: 'Failed to toggle alert' });
    }
  });

  return router;
}
