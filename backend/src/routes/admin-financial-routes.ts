import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAdmin, require2FA, logAdminAction } from '../middleware/admin-auth';

export function createAdminFinancialRoutes(pool: Pool) {
  const router = Router();

  // Apply admin authentication and logging to all routes
  router.use(requireAdmin);
  router.use(logAdminAction(pool));

  /**
   * GET /api/admin/financial/reconciliation
   * Revenue reconciliation
   */
  router.get('/reconciliation', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      // Get platform revenue
      const platformRevenue = await pool.query(
        `SELECT 
           SUM(amount) as total_revenue,
           COUNT(*) as transaction_count,
           currency
         FROM invoices
         WHERE status = 'paid' AND paid_at BETWEEN $1 AND $2
         GROUP BY currency`,
        [startDate, endDate]
      );

      // Get refunds
      const refundsResult = await pool.query(
        `SELECT 
           SUM(amount) as total_refunds,
           COUNT(*) as refund_count,
           currency
         FROM refunds
         WHERE status = 'processed' AND processed_at BETWEEN $1 AND $2
         GROUP BY currency`,
        [startDate, endDate]
      );

      // Get subscription revenue
      const subscriptionRevenue = await pool.query(
        `SELECT 
           SUM(amount) as subscription_revenue,
           COUNT(*) as active_subscriptions,
           tier
         FROM subscriptions
         WHERE status = 'active' AND current_period_start BETWEEN $1 AND $2
         GROUP BY tier`,
        [startDate, endDate]
      );

      res.json({
        platformRevenue: platformRevenue.rows,
        refunds: refundsResult.rows,
        subscriptionRevenue: subscriptionRevenue.rows,
        period: { startDate, endDate },
      });
    } catch (error) {
      console.error('Error fetching reconciliation:', error);
      res.status(500).json({ error: 'Failed to fetch reconciliation data' });
    }
  });

  /**
   * GET /api/admin/financial/subscriptions
   * Subscription management
   */
  router.get('/subscriptions', async (req: Request, res: Response) => {
    try {
      const { status, tier, page = '1', limit = '20' } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let query = `
        SELECT s.*, u.email, u.name
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND s.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (tier) {
        query += ` AND s.tier = $${paramIndex}`;
        params.push(tier);
        paramIndex++;
      }

      // Get total count
      const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as filtered`, params);
      const totalCount = parseInt(countResult.rows[0].count);

      // Add pagination
      query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string), offset);

      const result = await pool.query(query, params);

      res.json({
        subscriptions: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit as string)),
        },
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
  });

  /**
   * POST /api/admin/financial/subscriptions/:id/upgrade
   * Manual subscription upgrade
   */
  router.post('/subscriptions/:id/upgrade', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { newTier, newAmount, reason } = req.body;

      if (!newTier || newAmount === undefined) {
        return res.status(400).json({ error: 'New tier and amount are required' });
      }

      const result = await pool.query(
        `UPDATE subscriptions 
         SET tier = $1, amount = $2
         WHERE id = $3
         RETURNING *`,
        [newTier, newAmount, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Log the action
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, admin_action)
         VALUES ($1, 'subscription_upgrade', 'subscription', $2, $3, true)`,
        [req.user!.id, id, JSON.stringify({ newTier, newAmount, reason })]
      );

      res.json({ subscription: result.rows[0] });
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      res.status(500).json({ error: 'Failed to upgrade subscription' });
    }
  });

  /**
   * POST /api/admin/financial/subscriptions/:id/cancel
   * Cancel subscription
   */
  router.post('/subscriptions/:id/cancel', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason, immediate } = req.body;

      const result = await pool.query(
        `UPDATE subscriptions 
         SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json({ subscription: result.rows[0] });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  });

  /**
   * POST /api/admin/financial/subscriptions/:id/pause
   * Pause subscription
   */
  router.post('/subscriptions/:id/pause', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { pauseStartsAt, pauseEndsAt } = req.body;

      const result = await pool.query(
        `UPDATE subscriptions 
         SET status = 'paused', pause_starts_at = $1, pause_ends_at = $2
         WHERE id = $3
         RETURNING *`,
        [pauseStartsAt, pauseEndsAt, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      res.json({ subscription: result.rows[0] });
    } catch (error) {
      console.error('Error pausing subscription:', error);
      res.status(500).json({ error: 'Failed to pause subscription' });
    }
  });

  /**
   * GET /api/admin/financial/refunds
   * List refunds
   */
  router.get('/refunds', async (req: Request, res: Response) => {
    try {
      const { status, page = '1', limit = '20' } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let query = `
        SELECT r.*, u.email, u.name, i.invoice_number
        FROM refunds r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN invoices i ON r.invoice_id = i.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND r.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as filtered`, params);
      const totalCount = parseInt(countResult.rows[0].count);

      query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string), offset);

      const result = await pool.query(query, params);

      res.json({
        refunds: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit as string)),
        },
      });
    } catch (error) {
      console.error('Error fetching refunds:', error);
      res.status(500).json({ error: 'Failed to fetch refunds' });
    }
  });

  /**
   * POST /api/admin/financial/refunds
   * Create refund
   */
  router.post('/refunds', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { userId, invoiceId, amount, type, reason, reasonDetails } = req.body;

      if (!userId || !amount || !type || !reason) {
        return res.status(400).json({ error: 'User ID, amount, type, and reason are required' });
      }

      const result = await pool.query(
        `INSERT INTO refunds (user_id, invoice_id, amount, type, reason, reason_details, processed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, invoiceId || null, amount, type, reason, reasonDetails || null, req.user!.id]
      );

      res.json({ refund: result.rows[0] });
    } catch (error) {
      console.error('Error creating refund:', error);
      res.status(500).json({ error: 'Failed to create refund' });
    }
  });

  /**
   * POST /api/admin/financial/refunds/:id/process
   * Process refund
   */
  router.post('/refunds/:id/process', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { providerRefundId } = req.body;

      const result = await pool.query(
        `UPDATE refunds 
         SET status = 'processed', processed_at = CURRENT_TIMESTAMP, provider_refund_id = $1
         WHERE id = $2 AND status IN ('pending', 'approved')
         RETURNING *`,
        [providerRefundId || null, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Refund not found or already processed' });
      }

      // TODO: Integrate with payment provider

      res.json({ refund: result.rows[0] });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({ error: 'Failed to process refund' });
    }
  });

  /**
   * GET /api/admin/financial/tax-config
   * Get tax configuration
   */
  router.get('/tax-config', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT * FROM tax_configuration
         WHERE is_active = true
         ORDER BY country_code, state_code`
      );

      res.json({ taxConfiguration: result.rows });
    } catch (error) {
      console.error('Error fetching tax configuration:', error);
      res.status(500).json({ error: 'Failed to fetch tax configuration' });
    }
  });

  /**
   * POST /api/admin/financial/tax-config
   * Create tax configuration
   */
  router.post('/tax-config', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { countryCode, stateCode, taxType, rate, effectiveFrom, effectiveTo } = req.body;

      if (!countryCode || !taxType || rate === undefined || !effectiveFrom) {
        return res.status(400).json({ error: 'Country code, tax type, rate, and effective from are required' });
      }

      const result = await pool.query(
        `INSERT INTO tax_configuration (country_code, state_code, tax_type, rate, effective_from, effective_to)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [countryCode, stateCode || null, taxType, rate, effectiveFrom, effectiveTo || null]
      );

      res.json({ taxConfiguration: result.rows[0] });
    } catch (error) {
      console.error('Error creating tax configuration:', error);
      res.status(500).json({ error: 'Failed to create tax configuration' });
    }
  });

  /**
   * GET /api/admin/financial/payment-retry
   * Get failed payment retry status
   */
  router.get('/payment-retry', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT pr.*, u.email, u.name, s.tier
         FROM payment_retry_config pr
         JOIN users u ON pr.user_id = u.id
         LEFT JOIN subscriptions s ON u.id = s.user_id
         WHERE pr.dunning_status = 'active'
         ORDER BY pr.next_retry_at ASC`
      );

      res.json({ paymentRetries: result.rows });
    } catch (error) {
      console.error('Error fetching payment retries:', error);
      res.status(500).json({ error: 'Failed to fetch payment retries' });
    }
  });

  /**
   * POST /api/admin/financial/payment-retry/:userId/trigger
   * Manually trigger payment retry
   */
  router.post('/payment-retry/:userId/trigger', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Update retry config
      await pool.query(
        `UPDATE payment_retry_config 
         SET last_retry_at = CURRENT_TIMESTAMP, 
             current_retry_attempt = current_retry_attempt + 1,
             next_retry_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
         WHERE user_id = $1`,
        [userId]
      );

      // TODO: Trigger actual payment retry with payment provider

      res.json({ message: 'Payment retry triggered' });
    } catch (error) {
      console.error('Error triggering payment retry:', error);
      res.status(500).json({ error: 'Failed to trigger payment retry' });
    }
  });

  return router;
}
