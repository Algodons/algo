import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { CreditsService } from '../services/credits-service';

export function createCreditsRoutes(pool: Pool) {
  const router = Router();
  const creditsService = new CreditsService(pool);

  /**
   * GET /api/credits/balance
   * Get user's credit balance
   */
  router.get('/balance', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const balance = await creditsService.getBalance(req.user.id);

      res.json({ balance });
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      res.status(500).json({ error: 'Failed to fetch credit balance' });
    }
  });

  /**
   * POST /api/credits/purchase
   * Purchase prepaid credits
   */
  router.post('/purchase', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { amount, paymentMethodId } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      // TODO: Create invoice and process payment before adding credits
      // For now, we'll just add the credits
      const balance = await creditsService.purchaseCredits(
        req.user.id,
        amount,
        paymentMethodId
      );

      res.json({ 
        success: true,
        balance,
        message: 'Credits purchased successfully' 
      });
    } catch (error: any) {
      console.error('Error purchasing credits:', error);
      res.status(500).json({ error: error.message || 'Failed to purchase credits' });
    }
  });

  /**
   * GET /api/credits/history
   * Get credit transaction history
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { limit } = req.query;
      const transactions = await creditsService.getTransactionHistory(
        req.user.id,
        limit ? parseInt(limit as string) : 50
      );

      res.json({ transactions });
    } catch (error) {
      console.error('Error fetching credit history:', error);
      res.status(500).json({ error: 'Failed to fetch credit history' });
    }
  });

  /**
   * POST /api/credits/auto-reload
   * Configure auto-reload settings
   */
  router.post('/auto-reload', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { enabled, threshold, amount } = req.body;

      if (enabled === undefined) {
        return res.status(400).json({ error: 'enabled field is required' });
      }

      if (enabled && (!threshold || !amount)) {
        return res.status(400).json({ 
          error: 'Threshold and amount are required when enabling auto-reload' 
        });
      }

      const balance = await creditsService.configureAutoReload(
        req.user.id,
        enabled,
        threshold,
        amount
      );

      res.json({ 
        success: true,
        balance,
        message: enabled 
          ? 'Auto-reload configured successfully' 
          : 'Auto-reload disabled successfully' 
      });
    } catch (error: any) {
      console.error('Error configuring auto-reload:', error);
      res.status(500).json({ error: error.message || 'Failed to configure auto-reload' });
    }
  });

  /**
   * POST /api/credits/deduct
   * Deduct credits (internal use)
   */
  router.post('/deduct', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { amount, description, usageMetricId } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      if (!description) {
        return res.status(400).json({ error: 'Description is required' });
      }

      const balance = await creditsService.deductCredits(
        req.user.id,
        amount,
        description,
        usageMetricId
      );

      res.json({ 
        success: true,
        balance,
        message: 'Credits deducted successfully' 
      });
    } catch (error: any) {
      console.error('Error deducting credits:', error);
      res.status(500).json({ error: error.message || 'Failed to deduct credits' });
    }
  });

  return router;
}
