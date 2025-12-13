import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { UsageTrackingService } from '../services/usage-tracking-service';

export function createUsageRoutes(pool: Pool) {
  const router = Router();
  const usageService = new UsageTrackingService(pool);

  /**
   * GET /api/usage/current
   * Get current usage for the billing period
   */
  router.get('/current', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const usage = await usageService.getCurrentUsage(req.user.id);

      res.json({ usage });
    } catch (error) {
      console.error('Error fetching current usage:', error);
      res.status(500).json({ error: 'Failed to fetch current usage' });
    }
  });

  /**
   * GET /api/usage/history
   * Get usage history
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { startDate, endDate, metricType } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          error: 'Start date and end date are required' 
        });
      }

      const history = await usageService.getUsageHistory(
        req.user.id,
        new Date(startDate as string),
        new Date(endDate as string),
        metricType as string | undefined
      );

      res.json({ history });
    } catch (error) {
      console.error('Error fetching usage history:', error);
      res.status(500).json({ error: 'Failed to fetch usage history' });
    }
  });

  /**
   * GET /api/usage/project/:projectId
   * Get usage summary for a specific project
   */
  router.get('/project/:projectId', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { projectId } = req.params;

      const summary = await usageService.getProjectUsageSummary(
        parseInt(projectId)
      );

      res.json({ summary });
    } catch (error) {
      console.error('Error fetching project usage:', error);
      res.status(500).json({ error: 'Failed to fetch project usage' });
    }
  });

  /**
   * POST /api/usage/track
   * Manually track usage (for internal use)
   */
  router.post('/track', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { metricType, value, unit, projectId, metadata } = req.body;

      if (!metricType || value === undefined || !unit) {
        return res.status(400).json({ 
          error: 'Metric type, value, and unit are required' 
        });
      }

      const validMetricTypes = [
        'deployment_hours',
        'storage',
        'bandwidth',
        'ai_api_usage',
        'build_minutes',
      ];

      if (!validMetricTypes.includes(metricType)) {
        return res.status(400).json({ 
          error: `Invalid metric type. Must be one of: ${validMetricTypes.join(', ')}` 
        });
      }

      const metric = await usageService.recordUsage(
        req.user.id,
        metricType,
        value,
        unit,
        projectId,
        metadata
      );

      res.json({ 
        success: true,
        metric,
        message: 'Usage recorded successfully' 
      });
    } catch (error: any) {
      console.error('Error recording usage:', error);
      res.status(500).json({ error: error.message || 'Failed to record usage' });
    }
  });

  return router;
}
