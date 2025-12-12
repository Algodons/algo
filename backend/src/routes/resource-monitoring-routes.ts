import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { ResourceMonitoringService } from '../services/resource-monitoring-service';

export function createResourceMonitoringRoutes(pool: Pool): Router {
  const router = Router();
  const service = new ResourceMonitoringService(pool);

  // Get current resource usage
  router.get('/usage/current', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const usage = await service.getCurrentUsage(userId);
      res.json({ usage });
    } catch (error) {
      console.error('Error fetching current usage:', error);
      res.status(500).json({ error: 'Failed to fetch usage data' });
    }
  });

  // Get historical usage
  router.get('/usage/historical', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const metricType = req.query.metric as string;
      const startDate = new Date(req.query.start as string);
      const endDate = new Date(req.query.end as string);

      if (!metricType || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

      const metrics = await service.getHistoricalUsage(userId, metricType, startDate, endDate);
      res.json({ metrics });
    } catch (error) {
      console.error('Error fetching historical usage:', error);
      res.status(500).json({ error: 'Failed to fetch historical data' });
    }
  });

  // Get usage time series for charts
  router.get('/usage/timeseries', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const metricType = req.query.metric as string;
      const hours = parseInt(req.query.hours as string) || 24;

      if (!metricType) {
        return res.status(400).json({ error: 'Metric type is required' });
      }

      const timeSeries = await service.getUsageTimeSeries(userId, metricType, hours);
      res.json({ timeSeries });
    } catch (error) {
      console.error('Error fetching time series:', error);
      res.status(500).json({ error: 'Failed to fetch time series data' });
    }
  });

  // Record a metric (internal use)
  router.post('/usage/record', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { projectId, metricType, value, unit } = req.body;

      if (!metricType || value === undefined || !unit) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await service.recordMetric(userId, projectId || null, metricType, value, unit);
      res.status(201).json({ message: 'Metric recorded' });
    } catch (error) {
      console.error('Error recording metric:', error);
      res.status(500).json({ error: 'Failed to record metric' });
    }
  });

  // Get billing breakdown
  router.get('/billing/current', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const billing = await service.getBillingBreakdown(userId);
      res.json({ billing });
    } catch (error) {
      console.error('Error fetching billing:', error);
      res.status(500).json({ error: 'Failed to fetch billing data' });
    }
  });

  // Get billing for specific period
  router.get('/billing/:periodId', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const periodId = parseInt(req.params.periodId);
      const billing = await service.getBillingBreakdown(userId, periodId);
      res.json({ billing });
    } catch (error) {
      console.error('Error fetching billing period:', error);
      res.status(500).json({ error: 'Failed to fetch billing period' });
    }
  });

  // Calculate costs for a period
  router.post('/billing/:periodId/calculate', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const periodId = parseInt(req.params.periodId);
      await service.calculateCosts(userId, periodId);
      res.json({ message: 'Costs calculated' });
    } catch (error) {
      console.error('Error calculating costs:', error);
      res.status(500).json({ error: 'Failed to calculate costs' });
    }
  });

  // Get usage forecast
  router.get('/usage/forecast', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const metricType = req.query.metric as string;

      if (!metricType) {
        return res.status(400).json({ error: 'Metric type is required' });
      }

      const forecast = await service.getForecast(userId, metricType);
      res.json({ forecast });
    } catch (error) {
      console.error('Error generating forecast:', error);
      res.status(500).json({ error: 'Failed to generate forecast' });
    }
  });

  // Create resource alert
  router.post('/alerts', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { metricType, thresholdValue, thresholdPercentage } = req.body;

      if (!metricType || !thresholdValue) {
        return res.status(400).json({ error: 'Metric type and threshold value are required' });
      }

      const alert = await service.createAlert(userId, metricType, thresholdValue, thresholdPercentage);
      res.status(201).json({ alert });
    } catch (error) {
      console.error('Error creating alert:', error);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  });

  // Get user alerts
  router.get('/alerts', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const alerts = await service.getAlerts(userId);
      res.json({ alerts });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  return router;
}
