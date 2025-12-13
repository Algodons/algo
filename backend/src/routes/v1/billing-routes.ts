import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { query, validationResult } from 'express-validator';
import { authenticate } from '../../middleware/auth';

export function createBillingRoutesV1(pool: Pool): Router {
  const router = Router();

  // GET /api/v1/billing - Retrieve billing information
  router.get(
    '/',
    authenticate(pool),
    [
      query('start_date').optional().isISO8601(),
      query('end_date').optional().isISO8601(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = (req as any).user?.id;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      try {
        // Get current subscription
        const subscription = await pool.query(
          `SELECT us.*, s.name as plan_name, s.price, s.billing_period
           FROM user_subscriptions us
           JOIN subscriptions s ON us.subscription_id = s.id
           WHERE us.user_id = $1 AND us.status = 'active'`,
          [userId]
        );

        // Get billing history
        let billingQuery = `
          SELECT * FROM billing_transactions
          WHERE user_id = $1
        `;
        const values: any[] = [userId];
        let paramIndex = 2;

        if (startDate) {
          billingQuery += ` AND created_at >= $${paramIndex++}`;
          values.push(startDate);
        }

        if (endDate) {
          billingQuery += ` AND created_at <= $${paramIndex++}`;
          values.push(endDate);
        }

        billingQuery += ' ORDER BY created_at DESC';

        const billingHistory = await pool.query(billingQuery, values);

        // Calculate total spent
        const totalSpent = billingHistory.rows
          .filter((tx: any) => tx.status === 'completed')
          .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);

        res.json({
          success: true,
          data: {
            current_subscription: subscription.rows[0] || null,
            billing_history: billingHistory.rows,
            total_spent: totalSpent,
          },
        });
      } catch (error: any) {
        console.error('Error fetching billing information:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch billing information',
          details: error.message,
        });
      }
    }
  );

  return router;
}
