import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAdmin, require2FA, logAdminAction } from '../middleware/admin-auth';

export function createAdminAffiliateRoutes(pool: Pool) {
  const router = Router();
  const crypto = require('crypto');

  // Apply admin authentication and logging to all routes
  router.use(requireAdmin);
  router.use(logAdminAction(pool));

  /**
   * POST /api/admin/affiliates
   * Create new affiliate
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { userId, commissionType, commissionValue, tierConfig } = req.body;

      if (!userId || !commissionType || commissionValue === undefined) {
        return res.status(400).json({ error: 'User ID, commission type, and value are required' });
      }

      // Generate unique affiliate code
      const affiliateCode = crypto.randomBytes(8).toString('hex').toUpperCase();

      const result = await pool.query(
        `INSERT INTO affiliates (user_id, affiliate_code, commission_type, commission_value, tier_config)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, affiliateCode, commissionType, commissionValue, tierConfig ? JSON.stringify(tierConfig) : null]
      );

      res.json({ affiliate: result.rows[0] });
    } catch (error) {
      console.error('Error creating affiliate:', error);
      res.status(500).json({ error: 'Failed to create affiliate' });
    }
  });

  /**
   * GET /api/admin/affiliates
   * List all affiliates
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { status, page = '1', limit = '20', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let query = `
        SELECT a.*, u.email, u.name
        FROM affiliates a
        JOIN users u ON a.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND a.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      // Get total count
      const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as filtered`, params);
      const totalCount = parseInt(countResult.rows[0].count);

      // Add sorting and pagination
      query += ` ORDER BY a.${sortBy} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit as string), offset);

      const result = await pool.query(query, params);

      res.json({
        affiliates: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit as string)),
        },
      });
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      res.status(500).json({ error: 'Failed to fetch affiliates' });
    }
  });

  /**
   * GET /api/admin/affiliates/:id
   * Get affiliate details
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const affiliateResult = await pool.query(
        `SELECT a.*, u.email, u.name
         FROM affiliates a
         JOIN users u ON a.user_id = u.id
         WHERE a.id = $1`,
        [id]
      );

      if (affiliateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Affiliate not found' });
      }

      // Get referral stats
      const statsResult = await pool.query(
        `SELECT 
           COUNT(*) as total_referrals,
           COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions,
           SUM(CASE WHEN status = 'converted' THEN conversion_value ELSE 0 END) as total_revenue,
           SUM(commission_amount) as total_commissions,
           AVG(CASE WHEN status = 'converted' THEN commission_amount END) as avg_commission
         FROM referrals
         WHERE affiliate_id = $1`,
        [id]
      );

      // Get recent referrals
      const referralsResult = await pool.query(
        `SELECT r.*, u.email as referred_email, u.name as referred_name
         FROM referrals r
         LEFT JOIN users u ON r.referred_user_id = u.id
         WHERE r.affiliate_id = $1
         ORDER BY r.referred_at DESC
         LIMIT 10`,
        [id]
      );

      res.json({
        affiliate: affiliateResult.rows[0],
        stats: statsResult.rows[0],
        recentReferrals: referralsResult.rows,
      });
    } catch (error) {
      console.error('Error fetching affiliate:', error);
      res.status(500).json({ error: 'Failed to fetch affiliate' });
    }
  });

  /**
   * PUT /api/admin/affiliates/:id
   * Update affiliate configuration
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { commissionType, commissionValue, tierConfig, status } = req.body;

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (commissionType) {
        updates.push(`commission_type = $${paramIndex}`);
        params.push(commissionType);
        paramIndex++;
      }

      if (commissionValue !== undefined) {
        updates.push(`commission_value = $${paramIndex}`);
        params.push(commissionValue);
        paramIndex++;
      }

      if (tierConfig) {
        updates.push(`tier_config = $${paramIndex}`);
        params.push(JSON.stringify(tierConfig));
        paramIndex++;
      }

      if (status) {
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(id);

      const query = `UPDATE affiliates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Affiliate not found' });
      }

      res.json({ affiliate: result.rows[0] });
    } catch (error) {
      console.error('Error updating affiliate:', error);
      res.status(500).json({ error: 'Failed to update affiliate' });
    }
  });

  /**
   * POST /api/admin/affiliates/discount-codes
   * Create discount code
   */
  router.post('/discount-codes', async (req: Request, res: Response) => {
    try {
      const { code, type, value, affiliateId, usageLimit, minPurchaseAmount, applicableTiers, expiresAt } = req.body;

      if (!code || !type || value === undefined) {
        return res.status(400).json({ error: 'Code, type, and value are required' });
      }

      const result = await pool.query(
        `INSERT INTO discount_codes 
         (code, type, value, affiliate_id, usage_limit, min_purchase_amount, applicable_tiers, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          code,
          type,
          value,
          affiliateId || null,
          usageLimit || null,
          minPurchaseAmount || null,
          applicableTiers ? JSON.stringify(applicableTiers) : null,
          expiresAt || null,
          req.user!.id,
        ]
      );

      res.json({ discountCode: result.rows[0] });
    } catch (error) {
      console.error('Error creating discount code:', error);
      res.status(500).json({ error: 'Failed to create discount code' });
    }
  });

  /**
   * GET /api/admin/affiliates/discount-codes
   * List discount codes
   */
  router.get('/discount-codes/list', async (req: Request, res: Response) => {
    try {
      const { isActive, affiliateId } = req.query;

      let query = `
        SELECT dc.*, a.affiliate_code, u.email as affiliate_email
        FROM discount_codes dc
        LEFT JOIN affiliates a ON dc.affiliate_id = a.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (isActive !== undefined) {
        query += ` AND dc.is_active = $${paramIndex}`;
        params.push(isActive === 'true');
        paramIndex++;
      }

      if (affiliateId) {
        query += ` AND dc.affiliate_id = $${paramIndex}`;
        params.push(affiliateId);
        paramIndex++;
      }

      query += ' ORDER BY dc.created_at DESC';

      const result = await pool.query(query, params);

      res.json({ discountCodes: result.rows });
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      res.status(500).json({ error: 'Failed to fetch discount codes' });
    }
  });

  /**
   * GET /api/admin/affiliates/payouts
   * List affiliate payouts
   */
  router.get('/payouts', async (req: Request, res: Response) => {
    try {
      const { status, affiliateId } = req.query;

      let query = `
        SELECT p.*, a.affiliate_code, u.email, u.name
        FROM affiliate_payouts p
        JOIN affiliates a ON p.affiliate_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND p.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (affiliateId) {
        query += ` AND p.affiliate_id = $${paramIndex}`;
        params.push(affiliateId);
        paramIndex++;
      }

      query += ' ORDER BY p.created_at DESC';

      const result = await pool.query(query, params);

      res.json({ payouts: result.rows });
    } catch (error) {
      console.error('Error fetching payouts:', error);
      res.status(500).json({ error: 'Failed to fetch payouts' });
    }
  });

  /**
   * POST /api/admin/affiliates/payouts
   * Create payout
   */
  router.post('/payouts', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { affiliateId, amount, method, scheduledAt } = req.body;

      if (!affiliateId || !amount || !method) {
        return res.status(400).json({ error: 'Affiliate ID, amount, and method are required' });
      }

      const result = await pool.query(
        `INSERT INTO affiliate_payouts (affiliate_id, amount, method, scheduled_at)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [affiliateId, amount, method, scheduledAt || null]
      );

      res.json({ payout: result.rows[0] });
    } catch (error) {
      console.error('Error creating payout:', error);
      res.status(500).json({ error: 'Failed to create payout' });
    }
  });

  /**
   * POST /api/admin/affiliates/payouts/:id/process
   * Process payout
   */
  router.post('/payouts/:id/process', require2FA(pool), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { providerPayoutId } = req.body;

      const result = await pool.query(
        `UPDATE affiliate_payouts 
         SET status = 'processing', processed_at = CURRENT_TIMESTAMP, provider_payout_id = $1
         WHERE id = $2 AND status = 'pending'
         RETURNING *`,
        [providerPayoutId || null, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payout not found or already processed' });
      }

      // TODO: Integrate with payment provider (Stripe Connect, PayPal)

      res.json({ payout: result.rows[0] });
    } catch (error) {
      console.error('Error processing payout:', error);
      res.status(500).json({ error: 'Failed to process payout' });
    }
  });

  /**
   * GET /api/admin/affiliates/dashboard
   * Affiliate program dashboard
   */
  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      // Get overall stats
      const statsResult = await pool.query(
        `SELECT 
           COUNT(DISTINCT a.id) as total_affiliates,
           COUNT(DISTINCT CASE WHEN a.status = 'active' THEN a.id END) as active_affiliates,
           COUNT(DISTINCT r.id) as total_referrals,
           COUNT(DISTINCT CASE WHEN r.status = 'converted' THEN r.id END) as total_conversions,
           SUM(CASE WHEN r.status = 'converted' THEN r.conversion_value ELSE 0 END) as total_revenue,
           SUM(r.commission_amount) as total_commissions_owed,
           (SELECT SUM(amount) FROM affiliate_payouts WHERE status = 'paid') as total_commissions_paid
         FROM affiliates a
         LEFT JOIN referrals r ON a.id = r.affiliate_id`
      );

      // Get top performers
      const topResult = await pool.query(
        `SELECT 
           a.id,
           a.affiliate_code,
           u.email,
           u.name,
           a.total_conversions,
           a.total_revenue,
           a.total_commissions
         FROM affiliates a
         JOIN users u ON a.user_id = u.id
         WHERE a.status = 'active'
         ORDER BY a.total_revenue DESC
         LIMIT 10`
      );

      // Get pending payouts
      const pendingPayoutsResult = await pool.query(
        `SELECT SUM(amount) as total_pending
         FROM affiliate_payouts
         WHERE status IN ('pending', 'processing')`
      );

      res.json({
        stats: statsResult.rows[0],
        topPerformers: topResult.rows,
        pendingPayouts: pendingPayoutsResult.rows[0].total_pending || 0,
      });
    } catch (error) {
      console.error('Error fetching affiliate dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch affiliate dashboard' });
    }
  });

  return router;
}
