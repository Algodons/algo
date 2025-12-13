import { Pool } from 'pg';
import { TeamBilling, MemberUsage } from '../types/collaboration';

/**
 * Service for managing team billing and usage tracking
 */
export class TeamBillingService {
  constructor(private pool: Pool) {}

  /**
   * Track member usage
   */
  async trackMemberUsage(
    organizationId: number,
    userId: number,
    projectId: number | null,
    usage: {
      computeHours?: number;
      storageGb?: number;
      bandwidthGb?: number;
    }
  ): Promise<void> {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await this.pool.query(
      `INSERT INTO member_usage (organization_id, user_id, project_id, date, compute_hours, storage_gb, bandwidth_gb)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (organization_id, user_id, project_id, date)
       DO UPDATE SET
         compute_hours = member_usage.compute_hours + $5,
         storage_gb = member_usage.storage_gb + $6,
         bandwidth_gb = member_usage.bandwidth_gb + $7`,
      [
        organizationId,
        userId,
        projectId,
        date,
        usage.computeHours || 0,
        usage.storageGb || 0,
        usage.bandwidthGb || 0,
      ]
    );
  }

  /**
   * Get member usage for a period
   */
  async getMemberUsage(
    organizationId: number,
    userId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<MemberUsage[]> {
    let query = `
      SELECT mu.*, u.name as user_name, u.email as user_email, p.name as project_name
      FROM member_usage mu
      INNER JOIN users u ON mu.user_id = u.id
      LEFT JOIN projects p ON mu.project_id = p.id
      WHERE mu.organization_id = $1
    `;
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (userId) {
      query += ` AND mu.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND mu.date >= $${paramIndex}`;
      params.push(startDate.toISOString().split('T')[0]);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND mu.date <= $${paramIndex}`;
      params.push(endDate.toISOString().split('T')[0]);
      paramIndex++;
    }

    query += ` ORDER BY mu.date DESC, mu.user_id`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get aggregated usage by member
   */
  async getAggregatedUsageByMember(
    organizationId: number,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      userId: number;
      userName: string;
      totalComputeHours: number;
      totalStorageGb: number;
      totalBandwidthGb: number;
      estimatedCost: number;
    }>
  > {
    const result = await this.pool.query(
      `SELECT 
         mu.user_id,
         u.name as user_name,
         SUM(mu.compute_hours) as total_compute_hours,
         SUM(mu.storage_gb) as total_storage_gb,
         SUM(mu.bandwidth_gb) as total_bandwidth_gb
       FROM member_usage mu
       INNER JOIN users u ON mu.user_id = u.id
       WHERE mu.organization_id = $1 
         AND mu.date >= $2 
         AND mu.date <= $3
       GROUP BY mu.user_id, u.name
       ORDER BY total_compute_hours DESC`,
      [organizationId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    // Calculate estimated costs (example pricing)
    const COMPUTE_COST_PER_HOUR = 0.10; // $0.10 per hour
    const STORAGE_COST_PER_GB = 0.02; // $0.02 per GB
    const BANDWIDTH_COST_PER_GB = 0.05; // $0.05 per GB

    return result.rows.map((row: any) => ({
      userId: row.user_id,
      userName: row.user_name,
      totalComputeHours: parseFloat(row.total_compute_hours),
      totalStorageGb: parseFloat(row.total_storage_gb),
      totalBandwidthGb: parseFloat(row.total_bandwidth_gb),
      estimatedCost:
        parseFloat(row.total_compute_hours) * COMPUTE_COST_PER_HOUR +
        parseFloat(row.total_storage_gb) * STORAGE_COST_PER_GB +
        parseFloat(row.total_bandwidth_gb) * BANDWIDTH_COST_PER_GB,
    }));
  }

  /**
   * Get aggregated usage by project
   */
  async getAggregatedUsageByProject(
    organizationId: number,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      projectId: number;
      projectName: string;
      totalComputeHours: number;
      totalStorageGb: number;
      totalBandwidthGb: number;
      estimatedCost: number;
    }>
  > {
    const result = await this.pool.query(
      `SELECT 
         mu.project_id,
         p.name as project_name,
         SUM(mu.compute_hours) as total_compute_hours,
         SUM(mu.storage_gb) as total_storage_gb,
         SUM(mu.bandwidth_gb) as total_bandwidth_gb
       FROM member_usage mu
       INNER JOIN projects p ON mu.project_id = p.id
       WHERE mu.organization_id = $1 
         AND mu.project_id IS NOT NULL
         AND mu.date >= $2 
         AND mu.date <= $3
       GROUP BY mu.project_id, p.name
       ORDER BY total_compute_hours DESC`,
      [organizationId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    const COMPUTE_COST_PER_HOUR = 0.10;
    const STORAGE_COST_PER_GB = 0.02;
    const BANDWIDTH_COST_PER_GB = 0.05;

    return result.rows.map((row: any) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      totalComputeHours: parseFloat(row.total_compute_hours),
      totalStorageGb: parseFloat(row.total_storage_gb),
      totalBandwidthGb: parseFloat(row.total_bandwidth_gb),
      estimatedCost:
        parseFloat(row.total_compute_hours) * COMPUTE_COST_PER_HOUR +
        parseFloat(row.total_storage_gb) * STORAGE_COST_PER_GB +
        parseFloat(row.total_bandwidth_gb) * BANDWIDTH_COST_PER_GB,
    }));
  }

  /**
   * Create billing record for a period
   */
  async createBillingRecord(
    organizationId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<TeamBilling> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Aggregate usage for the period
      const usageResult = await client.query(
        `SELECT 
           SUM(compute_hours) as total_compute_hours,
           SUM(storage_gb) as total_storage_gb,
           SUM(bandwidth_gb) as total_bandwidth_gb
         FROM member_usage
         WHERE organization_id = $1 
           AND date >= $2 
           AND date <= $3`,
        [organizationId, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]]
      );

      const usage = usageResult.rows[0];
      const COMPUTE_COST_PER_HOUR = 0.10;
      const STORAGE_COST_PER_GB = 0.02;
      const BANDWIDTH_COST_PER_GB = 0.05;

      const totalCost =
        parseFloat(usage.total_compute_hours || 0) * COMPUTE_COST_PER_HOUR +
        parseFloat(usage.total_storage_gb || 0) * STORAGE_COST_PER_GB +
        parseFloat(usage.total_bandwidth_gb || 0) * BANDWIDTH_COST_PER_GB;

      // Create billing record
      const result = await client.query(
        `INSERT INTO team_billing (
          organization_id, billing_period_start, billing_period_end,
          total_compute_hours, total_storage_gb, total_bandwidth_gb, total_cost,
          currency, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          organizationId,
          periodStart,
          periodEnd,
          usage.total_compute_hours || 0,
          usage.total_storage_gb || 0,
          usage.total_bandwidth_gb || 0,
          totalCost,
          'USD',
          'pending',
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get billing records for an organization
   */
  async getBillingRecords(
    organizationId: number,
    limit: number = 12
  ): Promise<TeamBilling[]> {
    const result = await this.pool.query(
      `SELECT * FROM team_billing
       WHERE organization_id = $1
       ORDER BY billing_period_start DESC
       LIMIT $2`,
      [organizationId, limit]
    );
    return result.rows;
  }

  /**
   * Mark billing record as paid
   */
  async markBillingPaid(billingId: number): Promise<void> {
    await this.pool.query(
      `UPDATE team_billing 
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [billingId]
    );
  }

  /**
   * Get current billing cycle totals
   */
  async getCurrentCycleTotals(organizationId: number): Promise<{
    computeHours: number;
    storageGb: number;
    bandwidthGb: number;
    estimatedCost: number;
    periodStart: Date;
    periodEnd: Date;
  }> {
    // Get current billing cycle dates (assume monthly on 1st)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const result = await this.pool.query(
      `SELECT 
         COALESCE(SUM(compute_hours), 0) as compute_hours,
         COALESCE(SUM(storage_gb), 0) as storage_gb,
         COALESCE(SUM(bandwidth_gb), 0) as bandwidth_gb
       FROM member_usage
       WHERE organization_id = $1 
         AND date >= $2 
         AND date <= $3`,
      [organizationId, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]]
    );

    const usage = result.rows[0];
    const COMPUTE_COST_PER_HOUR = 0.10;
    const STORAGE_COST_PER_GB = 0.02;
    const BANDWIDTH_COST_PER_GB = 0.05;

    return {
      computeHours: parseFloat(usage.compute_hours),
      storageGb: parseFloat(usage.storage_gb),
      bandwidthGb: parseFloat(usage.bandwidth_gb),
      estimatedCost:
        parseFloat(usage.compute_hours) * COMPUTE_COST_PER_HOUR +
        parseFloat(usage.storage_gb) * STORAGE_COST_PER_GB +
        parseFloat(usage.bandwidth_gb) * BANDWIDTH_COST_PER_GB,
      periodStart,
      periodEnd,
    };
  }

  /**
   * Get usage trend over time
   */
  async getUsageTrend(
    organizationId: number,
    days: number = 30
  ): Promise<
    Array<{
      date: string;
      computeHours: number;
      storageGb: number;
      bandwidthGb: number;
    }>
  > {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.pool.query(
      `SELECT 
         date,
         SUM(compute_hours) as compute_hours,
         SUM(storage_gb) as storage_gb,
         SUM(bandwidth_gb) as bandwidth_gb
       FROM member_usage
       WHERE organization_id = $1 
         AND date >= $2 
         AND date <= $3
       GROUP BY date
       ORDER BY date`,
      [organizationId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    return result.rows.map((row: any) => ({
      date: row.date,
      computeHours: parseFloat(row.compute_hours),
      storageGb: parseFloat(row.storage_gb),
      bandwidthGb: parseFloat(row.bandwidth_gb),
    }));
  }
}
