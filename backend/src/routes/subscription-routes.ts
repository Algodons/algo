import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { SubscriptionService } from '../services/subscription-service';

export function createSubscriptionRoutes(pool: Pool) {
  const router = Router();
  const subscriptionService = new SubscriptionService(pool);

  /**
   * GET /api/subscriptions/plans
   * Get all available subscription plans
   */
  router.get('/plans', async (req: Request, res: Response) => {
    try {
      const plans = await subscriptionService.getPlans();
      res.json({ plans });
    } catch (error) {
      console.error('Error fetching plans:', error);
      res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
  });

  /**
   * GET /api/subscriptions/current
   * Get user's current subscription
   */
  router.get('/current', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const subscription = await subscriptionService.getUserSubscription(req.user.id);
      
      if (!subscription) {
        // Return default free tier
        return res.json({
          subscription: {
            tier: 'free',
            status: 'active',
            billingCycle: 'monthly',
          },
        });
      }

      res.json({ subscription });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  /**
   * POST /api/subscriptions/subscribe
   * Subscribe to a plan
   */
  router.post('/subscribe', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { planName, billingCycle, trialDays } = req.body;

      if (!planName || !billingCycle) {
        return res.status(400).json({ 
          error: 'Plan name and billing cycle are required' 
        });
      }

      if (!['monthly', 'yearly'].includes(billingCycle)) {
        return res.status(400).json({ 
          error: 'Billing cycle must be "monthly" or "yearly"' 
        });
      }

      const subscription = await subscriptionService.createSubscription(
        req.user.id,
        planName,
        billingCycle,
        trialDays
      );

      res.json({ 
        success: true,
        subscription,
        message: 'Subscription created successfully' 
      });
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ error: error.message || 'Failed to create subscription' });
    }
  });

  /**
   * POST /api/subscriptions/upgrade
   * Upgrade subscription to a higher tier
   */
  router.post('/upgrade', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { planName, billingCycle } = req.body;

      if (!planName) {
        return res.status(400).json({ error: 'Plan name is required' });
      }

      if (billingCycle && !['monthly', 'yearly'].includes(billingCycle)) {
        return res.status(400).json({ 
          error: 'Billing cycle must be "monthly" or "yearly"' 
        });
      }

      const subscription = await subscriptionService.upgradeSubscription(
        req.user.id,
        planName,
        billingCycle
      );

      res.json({ 
        success: true,
        subscription,
        message: 'Subscription upgraded successfully' 
      });
    } catch (error: any) {
      console.error('Error upgrading subscription:', error);
      res.status(500).json({ error: error.message || 'Failed to upgrade subscription' });
    }
  });

  /**
   * POST /api/subscriptions/downgrade
   * Downgrade subscription to a lower tier
   */
  router.post('/downgrade', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { planName } = req.body;

      if (!planName) {
        return res.status(400).json({ error: 'Plan name is required' });
      }

      const subscription = await subscriptionService.downgradeSubscription(
        req.user.id,
        planName
      );

      res.json({ 
        success: true,
        subscription,
        message: 'Subscription downgraded successfully. Changes will take effect at the end of the current billing period.' 
      });
    } catch (error: any) {
      console.error('Error downgrading subscription:', error);
      res.status(500).json({ error: error.message || 'Failed to downgrade subscription' });
    }
  });

  /**
   * DELETE /api/subscriptions/cancel
   * Cancel subscription
   */
  router.delete('/cancel', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { reason } = req.body;

      const subscription = await subscriptionService.cancelSubscription(
        req.user.id,
        reason
      );

      res.json({ 
        success: true,
        subscription,
        message: 'Subscription cancelled successfully. You can continue using the service until the end of the current billing period.' 
      });
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
    }
  });

  /**
   * GET /api/subscriptions/limits
   * Check resource limits and current usage
   */
  router.get('/limits', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const limits = await subscriptionService.checkResourceLimits(req.user.id);

      res.json(limits);
    } catch (error) {
      console.error('Error checking limits:', error);
      res.status(500).json({ error: 'Failed to check resource limits' });
    }
  });

  return router;
}
