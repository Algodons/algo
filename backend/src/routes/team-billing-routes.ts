import { Router } from 'express';
import { Pool } from 'pg';
import { TeamBillingService } from '../services/team-billing-service';
import { authenticate } from '../middleware/auth';

/**
 * Create team billing routes
 */
export function createTeamBillingRoutes(pool: Pool): Router {
  const router = Router();
  const billingService = new TeamBillingService(pool);

  // Track member usage (typically called by system, not users)
  router.post('/usage', authenticate(pool), async (req, res) => {
    try {
      const { organizationId, userId, projectId, computeHours, storageGb, bandwidthGb } = req.body;

      if (!organizationId || !userId) {
        return res.status(400).json({ error: 'organizationId and userId are required' });
      }

      await billingService.trackMemberUsage(organizationId, userId, projectId || null, {
        computeHours,
        storageGb,
        bandwidthGb,
      });

      res.json({ message: 'Usage tracked successfully' });
    } catch (error) {
      console.error('Track usage error:', error);
      res.status(500).json({ error: 'Failed to track usage' });
    }
  });

  // Get member usage
  router.get('/:organizationId/usage', authenticate(pool), async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const usage = await billingService.getMemberUsage(
        organizationId,
        userId,
        startDate,
        endDate
      );

      res.json({ usage });
    } catch (error) {
      console.error('Get member usage error:', error);
      res.status(500).json({ error: 'Failed to get member usage' });
    }
  });

  // Get aggregated usage by member
  router.get('/:organizationId/usage/by-member', authenticate(pool), async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const usage = await billingService.getAggregatedUsageByMember(
        organizationId,
        startDate,
        endDate
      );

      res.json({ usage });
    } catch (error) {
      console.error('Get aggregated usage by member error:', error);
      res.status(500).json({ error: 'Failed to get aggregated usage' });
    }
  });

  // Get aggregated usage by project
  router.get('/:organizationId/usage/by-project', authenticate(pool), async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const usage = await billingService.getAggregatedUsageByProject(
        organizationId,
        startDate,
        endDate
      );

      res.json({ usage });
    } catch (error) {
      console.error('Get aggregated usage by project error:', error);
      res.status(500).json({ error: 'Failed to get aggregated usage' });
    }
  });

  // Create billing record
  router.post('/:organizationId/billing', authenticate(pool), async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const { periodStart, periodEnd } = req.body;

      if (!periodStart || !periodEnd) {
        return res.status(400).json({ error: 'periodStart and periodEnd are required' });
      }

      const billingRecord = await billingService.createBillingRecord(
        organizationId,
        new Date(periodStart),
        new Date(periodEnd)
      );

      res.status(201).json({ billing: billingRecord });
    } catch (error) {
      console.error('Create billing record error:', error);
      res.status(500).json({ error: 'Failed to create billing record' });
    }
  });

  // Get billing records
  router.get('/:organizationId/billing', authenticate(pool), async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

      const billingRecords = await billingService.getBillingRecords(organizationId, limit);
      res.json({ billing: billingRecords });
    } catch (error) {
      console.error('Get billing records error:', error);
      res.status(500).json({ error: 'Failed to get billing records' });
    }
  });

  // Mark billing as paid
  router.post('/:organizationId/billing/:billingId/paid', authenticate(pool), async (req, res) => {
    try {
      const billingId = parseInt(req.params.billingId);
      await billingService.markBillingPaid(billingId);
      res.json({ message: 'Billing marked as paid' });
    } catch (error) {
      console.error('Mark billing paid error:', error);
      res.status(500).json({ error: 'Failed to mark billing as paid' });
    }
  });

  // Get current billing cycle totals
  router.get('/:organizationId/billing/current', authenticate(pool), async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const totals = await billingService.getCurrentCycleTotals(organizationId);
      res.json(totals);
    } catch (error) {
      console.error('Get current cycle totals error:', error);
      res.status(500).json({ error: 'Failed to get current cycle totals' });
    }
  });

  // Get usage trend
  router.get('/:organizationId/usage/trend', authenticate(pool), async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const trend = await billingService.getUsageTrend(organizationId, days);
      res.json({ trend });
    } catch (error) {
      console.error('Get usage trend error:', error);
      res.status(500).json({ error: 'Failed to get usage trend' });
    }
  });

  return router;
}
