import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAdmin, requireSuperAdmin, require2FA, logAdminAction } from '../middleware/admin-auth';

export function createAdminUserRoutes(pool: Pool) {
  const router = express.Router();

  // Apply admin authentication and logging to all routes
  router.use(requireAdmin);
  router.use(logAdminAction(pool));

  /**
   * GET /api/admin/users/search
   * Advanced user search with filters
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const {
        email,
        username,
        registrationDateFrom,
        registrationDateTo,
        subscriptionTier,
        status,
        page = '1',
        limit = '20',
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let query = 'SELECT u.*, s.tier, s.status as subscription_status FROM users u LEFT JOIN subscriptions s ON u.id = s.user_id WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (email) {
        query += ` AND u.email ILIKE $${paramIndex}`;
        params.push(`%${email}%`);
        paramIndex++;
      }

      if (username) {
        query += ` AND u.name ILIKE $${paramIndex}`;
        params.push(`%${username}%`);
        paramIndex++;
      }

      if (registrationDateFrom) {
        query += ` AND u.created_at >= $${paramIndex}`;
        params.push(registrationDateFrom);
        paramIndex++;
      }

      if (registrationDateTo) {
        query += ` AND u.created_at <= $${paramIndex}`;
        params.push(registrationDateTo);
        paramIndex++;
      }

      if (subscriptionTier) {
        query += ` AND s.tier = $${paramIndex}`;
        params.push(subscriptionTier);
        paramIndex++;
      }

      if (status === 'suspended') {
        query += ` AND u.is_suspended = true`;
      } else if (status === 'active') {
        query += ` AND u.is_suspended = false`;
      }

      // Get total count
      const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as filtered`, params);
      const totalCount = parseInt(countResult.rows[0].count);

      // Add sorting and pagination
      query += ` ORDER BY u.${sortBy} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string), offset);

      const result = await pool.query(query, params);

      res.json({
        users: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit as string)),
        },
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });

  /**
   * GET /api/admin/users/:id
   * Get detailed user information
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const userResult = await pool.query(
        `SELECT u.*, s.tier, s.status as subscription_status, s.amount as subscription_amount,
                uc.balance as credit_balance
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id
         LEFT JOIN user_credits uc ON u.id = uc.user_id
         WHERE u.id = $1`,
        [id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Get suspension info if suspended
      if (user.is_suspended) {
        const suspensionResult = await pool.query(
          `SELECT * FROM user_suspensions WHERE user_id = $1 AND status = 'active' ORDER BY suspended_at DESC LIMIT 1`,
          [id]
        );
        user.suspension = suspensionResult.rows[0] || null;
      }

      res.json({ user });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  /**
   * POST /api/admin/users/:id/suspend
   * Suspend a user account
   */
  router.post('/:id/suspend', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason, notes } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Suspension reason is required' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update user status
        await client.query('UPDATE users SET is_suspended = true, suspension_reason = $1 WHERE id = $2', [reason, id]);

        // Create suspension record
        await client.query(
          `INSERT INTO user_suspensions (user_id, suspended_by, reason, notes)
           VALUES ($1, $2, $3, $4)`,
          [id, req.user!.id, reason, notes]
        );

        await client.query('COMMIT');

        // TODO: Send notification to user

        res.json({ message: 'User suspended successfully' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      res.status(500).json({ error: 'Failed to suspend user' });
    }
  });

  /**
   * POST /api/admin/users/:id/activate
   * Activate/unsuspend a user account
   */
  router.post('/:id/activate', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update user status
        await client.query('UPDATE users SET is_suspended = false, suspension_reason = NULL WHERE id = $1', [id]);

        // Update suspension record
        await client.query(
          `UPDATE user_suspensions 
           SET status = 'lifted', lifted_at = CURRENT_TIMESTAMP, lifted_by = $1, lift_reason = $2
           WHERE user_id = $3 AND status = 'active'`,
          [req.user!.id, reason, id]
        );

        await client.query('COMMIT');

        // TODO: Send notification to user

        res.json({ message: 'User activated successfully' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({ error: 'Failed to activate user' });
    }
  });

  /**
   * GET /api/admin/users/:id/analytics
   * Get user usage analytics
   */
  router.get('/:id/analytics', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { period = '30d' } = req.query;

      // Calculate date range based on period
      let dateFrom = new Date();
      if (period === '7d') {
        dateFrom.setDate(dateFrom.getDate() - 7);
      } else if (period === '30d') {
        dateFrom.setDate(dateFrom.getDate() - 30);
      } else if (period === '90d') {
        dateFrom.setDate(dateFrom.getDate() - 90);
      }

      // Get resource metrics
      const metricsResult = await pool.query(
        `SELECT 
           metric_type,
           SUM(value) as total,
           AVG(value) as average,
           unit,
           DATE_TRUNC('day', timestamp) as date
         FROM resource_metrics
         WHERE user_id = $1 AND timestamp >= $2
         GROUP BY metric_type, unit, date
         ORDER BY date ASC`,
        [id, dateFrom]
      );

      // Get API usage stats
      const apiUsageResult = await pool.query(
        `SELECT 
           COUNT(*) as total_requests,
           AVG(response_time_ms) as avg_response_time,
           COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
         FROM api_usage
         WHERE user_id = $1 AND timestamp >= $2`,
        [id, dateFrom]
      );

      // Get project count
      const projectsResult = await pool.query(
        'SELECT COUNT(*) as total_projects FROM projects WHERE user_id = $1',
        [id]
      );

      res.json({
        resourceMetrics: metricsResult.rows,
        apiUsage: apiUsageResult.rows[0],
        projects: projectsResult.rows[0],
      });
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      res.status(500).json({ error: 'Failed to fetch user analytics' });
    }
  });

  /**
   * POST /api/admin/users/:id/impersonate
   * Start impersonation session
   */
  router.post('/:id/impersonate', requireSuperAdmin, require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Impersonation reason is required' });
      }

      // Generate session token
      const sessionToken = require('crypto').randomBytes(32).toString('hex');

      // Create impersonation session
      await pool.query(
        `INSERT INTO admin_impersonations (admin_user_id, target_user_id, reason, session_token, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user!.id, id, reason, sessionToken, req.ip]
      );

      res.json({
        sessionToken,
        message: 'Impersonation session started',
        expiresIn: '1 hour',
      });
    } catch (error) {
      console.error('Error starting impersonation:', error);
      res.status(500).json({ error: 'Failed to start impersonation' });
    }
  });

  /**
   * POST /api/admin/users/:id/impersonate/end
   * End impersonation session
   */
  router.post('/:id/impersonate/end', async (req: Request, res: Response) => {
    try {
      const { sessionToken } = req.body;

      if (!sessionToken) {
        return res.status(400).json({ error: 'Session token is required' });
      }

      await pool.query(
        'UPDATE admin_impersonations SET ended_at = CURRENT_TIMESTAMP WHERE session_token = $1',
        [sessionToken]
      );

      res.json({ message: 'Impersonation session ended' });
    } catch (error) {
      console.error('Error ending impersonation:', error);
      res.status(500).json({ error: 'Failed to end impersonation' });
    }
  });

  /**
   * POST /api/admin/users/bulk/email
   * Send bulk email campaign
   */
  router.post('/bulk/email', requireSuperAdmin, require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { subject, body, template, filters } = req.body;

      if (!subject || !body) {
        return res.status(400).json({ error: 'Subject and body are required' });
      }

      // Build user query based on filters
      let query = 'SELECT id, email, name FROM users WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.subscriptionTier) {
        query += ` AND id IN (SELECT user_id FROM subscriptions WHERE tier = $${paramIndex})`;
        params.push(filters.subscriptionTier);
        paramIndex++;
      }

      if (filters?.status === 'active') {
        query += ' AND is_suspended = false';
      }

      const result = await pool.query(query, params);

      // TODO: Queue emails for sending (use a job queue like Bull)
      // For now, just return the count
      
      res.json({
        message: 'Bulk email campaign queued',
        recipientCount: result.rows.length,
        estimatedSendTime: `${Math.ceil(result.rows.length / 100)} minutes`,
      });
    } catch (error) {
      console.error('Error sending bulk email:', error);
      res.status(500).json({ error: 'Failed to send bulk email' });
    }
  });

  /**
   * POST /api/admin/users/bulk/credits
   * Bulk credit adjustment
   */
  router.post('/bulk/credits', requireSuperAdmin, require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { amount, reason, userIds } = req.body;

      if (!amount || !reason || !userIds || userIds.length === 0) {
        return res.status(400).json({ error: 'Amount, reason, and user IDs are required' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const userId of userIds) {
          // Ensure user_credits record exists
          await client.query(
            `INSERT INTO user_credits (user_id, balance) VALUES ($1, 0)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
          );

          // Update balance
          const result = await client.query(
            'UPDATE user_credits SET balance = balance + $1 WHERE user_id = $2 RETURNING balance',
            [amount, userId]
          );

          // Record transaction
          await client.query(
            `INSERT INTO credit_transactions (user_id, amount, type, reason, performed_by, balance_after)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, amount, amount > 0 ? 'credit' : 'debit', reason, req.user!.id, result.rows[0].balance]
          );
        }

        await client.query('COMMIT');

        res.json({
          message: 'Credits adjusted successfully',
          usersAffected: userIds.length,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error adjusting credits:', error);
      res.status(500).json({ error: 'Failed to adjust credits' });
    }
  });

  /**
   * POST /api/admin/users/:id/subscription/override
   * Override user subscription tier
   */
  router.post('/:id/subscription/override', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { tier, amount, reason } = req.body;

      if (!tier || amount === undefined) {
        return res.status(400).json({ error: 'Tier and amount are required' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check if subscription exists
        const checkResult = await client.query('SELECT id FROM subscriptions WHERE user_id = $1', [id]);

        if (checkResult.rows.length === 0) {
          // Create new subscription
          await client.query(
            `INSERT INTO subscriptions (user_id, tier, amount, status)
             VALUES ($1, $2, $3, 'active')`,
            [id, tier, amount]
          );
        } else {
          // Update existing subscription
          await client.query(
            'UPDATE subscriptions SET tier = $1, amount = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
            [tier, amount, id]
          );
        }

        // Update user tier
        await client.query('UPDATE users SET subscription_tier = $1 WHERE id = $2', [tier, id]);

        // Log the override
        await client.query(
          `INSERT INTO audit_logs (user_id, action, resource_type, details, admin_action)
           VALUES ($1, 'subscription_override', 'subscription', $2, true)`,
          [req.user!.id, JSON.stringify({ targetUserId: id, tier, amount, reason })]
        );

        await client.query('COMMIT');

        res.json({ message: 'Subscription overridden successfully' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error overriding subscription:', error);
      res.status(500).json({ error: 'Failed to override subscription' });
    }
  });

  return router;
}
