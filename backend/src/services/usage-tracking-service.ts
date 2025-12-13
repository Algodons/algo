import { Pool } from 'pg';

export interface UsageMetric {
  id: number;
  userId: number;
  projectId?: number;
  metricType: 'deployment_hours' | 'storage' | 'bandwidth' | 'ai_api_usage' | 'build_minutes';
  value: number;
  unit: string;
  cost: number;
  timestamp: Date;
}

export class UsageTrackingService {
  constructor(private pool: Pool) {}

  /**
   * Record a usage metric
   */
  async recordUsage(
    userId: number,
    metricType: UsageMetric['metricType'],
    value: number,
    unit: string,
    projectId?: number,
    metadata?: Record<string, any>
  ): Promise<UsageMetric> {
    // Get current billing period
    const billingPeriod = this.getCurrentBillingPeriod();
    
    // Calculate cost based on usage type
    const cost = await this.calculateUsageCost(metricType, value);

    const result = await this.pool.query(
      `INSERT INTO usage_metrics 
        (user_id, project_id, metric_type, value, unit, cost, metadata, 
         billing_period_start, billing_period_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, user_id as "userId", project_id as "projectId", 
        metric_type as "metricType", value, unit, cost, timestamp`,
      [userId, projectId, metricType, value, unit, cost, 
       metadata ? JSON.stringify(metadata) : null,
       billingPeriod.start, billingPeriod.end]
    );

    // Check if usage alerts should be triggered
    await this.checkUsageAlerts(userId, metricType);

    return result.rows[0];
  }

  /**
   * Get current usage for a user
   */
  async getCurrentUsage(userId: number): Promise<Record<string, any>> {
    const billingPeriod = this.getCurrentBillingPeriod();

    const result = await this.pool.query(
      `SELECT 
        metric_type as "metricType",
        SUM(value) as "totalValue",
        SUM(cost) as "totalCost",
        unit
      FROM usage_metrics
      WHERE user_id = $1
        AND billing_period_start = $2
        AND billing_period_end = $3
      GROUP BY metric_type, unit`,
      [userId, billingPeriod.start, billingPeriod.end]
    );

    const usage: Record<string, any> = {
      period: billingPeriod,
      metrics: {},
      totalCost: 0,
    };

    result.rows.forEach((row) => {
      usage.metrics[row.metricType] = {
        value: parseFloat(row.totalValue),
        cost: parseFloat(row.totalCost),
        unit: row.unit,
      };
      usage.totalCost += parseFloat(row.totalCost);
    });

    return usage;
  }

  /**
   * Get usage history for a user
   */
  async getUsageHistory(
    userId: number,
    startDate: Date,
    endDate: Date,
    metricType?: string
  ): Promise<UsageMetric[]> {
    let query = `
      SELECT 
        id, user_id as "userId", project_id as "projectId",
        metric_type as "metricType", value, unit, cost, timestamp
      FROM usage_metrics
      WHERE user_id = $1
        AND timestamp BETWEEN $2 AND $3
    `;
    const params: any[] = [userId, startDate, endDate];

    if (metricType) {
      query += ` AND metric_type = $4`;
      params.push(metricType);
    }

    query += ` ORDER BY timestamp DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Track deployment hours
   */
  async trackDeploymentHours(
    userId: number,
    projectId: number,
    hours: number
  ): Promise<void> {
    await this.recordUsage(userId, 'deployment_hours', hours, 'hours', projectId);
  }

  /**
   * Track storage usage
   */
  async trackStorageUsage(
    userId: number,
    projectId: number,
    megabytes: number
  ): Promise<void> {
    await this.recordUsage(userId, 'storage', megabytes, 'MB', projectId);
  }

  /**
   * Track bandwidth usage
   */
  async trackBandwidthUsage(
    userId: number,
    projectId: number,
    gigabytes: number
  ): Promise<void> {
    await this.recordUsage(userId, 'bandwidth', gigabytes, 'GB', projectId);
  }

  /**
   * Track AI API usage
   */
  async trackAIUsage(
    userId: number,
    projectId: number,
    provider: string,
    model: string,
    tokensUsed: number,
    costUsd: number
  ): Promise<void> {
    const markupPercentage = 20; // 20% markup
    const totalCharge = costUsd * (1 + markupPercentage / 100);

    const billingPeriod = this.getCurrentBillingPeriod();

    await this.pool.query(
      `INSERT INTO ai_api_usage 
        (user_id, project_id, provider, model, tokens_used, cost_usd, 
         markup_percentage, total_charge, billing_period_start, billing_period_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId, projectId, provider, model, tokensUsed, costUsd, 
       markupPercentage, totalCharge, billingPeriod.start, billingPeriod.end]
    );

    await this.recordUsage(
      userId,
      'ai_api_usage',
      totalCharge,
      'USD',
      projectId,
      { provider, model, tokens: tokensUsed }
    );
  }

  /**
   * Calculate cost based on usage type and tier
   */
  private async calculateUsageCost(
    metricType: string,
    value: number
  ): Promise<number> {
    // Pricing configuration
    const pricing: Record<string, number> = {
      deployment_hours: 0.01, // $0.01 per hour
      storage: 0.10 / 1024,   // $0.10 per GB/month = $0.10/1024 per MB
      bandwidth: 0.05,         // $0.05 per GB
      ai_api_usage: 1,         // Already calculated with markup
      build_minutes: 0.005,    // $0.005 per minute
    };

    const rate = pricing[metricType] || 0;
    return value * rate;
  }

  /**
   * Get current billing period (monthly cycle)
   */
  private getCurrentBillingPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  /**
   * Check and trigger usage alerts
   */
  private async checkUsageAlerts(userId: number, metricType: string): Promise<void> {
    // Get user's subscription limits
    const subscriptionResult = await this.pool.query(
      `SELECT s.tier, sp.storage_mb, sp.compute_hours_monthly, sp.bandwidth_gb_monthly
       FROM subscriptions s
       JOIN subscription_plans sp ON s.tier = sp.name
       WHERE s.user_id = $1`,
      [userId]
    );

    if (subscriptionResult.rows.length === 0) {
      return; // No subscription found
    }

    const subscription = subscriptionResult.rows[0];
    const billingPeriod = this.getCurrentBillingPeriod();

    // Get current usage
    const usageResult = await this.pool.query(
      `SELECT SUM(value) as total
       FROM usage_metrics
       WHERE user_id = $1 
         AND metric_type = $2
         AND billing_period_start = $3
         AND billing_period_end = $4`,
      [userId, metricType, billingPeriod.start, billingPeriod.end]
    );

    const currentUsage = parseFloat(usageResult.rows[0]?.total || '0');

    // Get limit for metric type
    let limit = 0;
    switch (metricType) {
      case 'storage':
        limit = subscription.storage_mb;
        break;
      case 'deployment_hours':
        limit = subscription.compute_hours_monthly;
        break;
      case 'bandwidth':
        limit = subscription.bandwidth_gb_monthly;
        break;
    }

    if (limit === 0) return;

    const percentageUsed = (currentUsage / limit) * 100;

    // Get active alerts for this user and metric type
    const alertsResult = await this.pool.query(
      `SELECT id, threshold_percentage, notification_channels
       FROM usage_alerts
       WHERE user_id = $1 
         AND metric_type = $2
         AND is_active = true`,
      [userId, metricType]
    );

    for (const alert of alertsResult.rows) {
      if (percentageUsed >= alert.threshold_percentage) {
        // Check if alert was already triggered recently (within 1 hour)
        const recentTrigger = await this.pool.query(
          `SELECT id FROM usage_alert_history
           WHERE alert_id = $1
             AND triggered_at > NOW() - INTERVAL '1 hour'
           LIMIT 1`,
          [alert.id]
        );

        if (recentTrigger.rows.length === 0) {
          // Trigger alert
          await this.triggerAlert(
            alert.id,
            userId,
            metricType,
            limit,
            currentUsage,
            percentageUsed,
            alert.notification_channels
          );
        }
      }
    }
  }

  /**
   * Trigger a usage alert
   */
  private async triggerAlert(
    alertId: number,
    userId: number,
    metricType: string,
    thresholdValue: number,
    currentValue: number,
    percentageUsed: number,
    notificationChannels: any
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO usage_alert_history
        (alert_id, user_id, metric_type, threshold_value, current_value, 
         percentage_used, notification_sent, notification_channels)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [alertId, userId, metricType, thresholdValue, currentValue, 
       percentageUsed, true, JSON.stringify(notificationChannels)]
    );

    // Update last triggered timestamp
    await this.pool.query(
      `UPDATE usage_alerts
       SET last_triggered_at = CURRENT_TIMESTAMP,
           trigger_count = trigger_count + 1
       WHERE id = $1`,
      [alertId]
    );

    // TODO: Send actual notifications via email/SMS/dashboard
    console.log(`Alert triggered for user ${userId}: ${metricType} at ${percentageUsed.toFixed(2)}%`);
  }

  /**
   * Get usage summary by project
   */
  async getProjectUsageSummary(projectId: number): Promise<Record<string, any>> {
    const billingPeriod = this.getCurrentBillingPeriod();

    const result = await this.pool.query(
      `SELECT 
        metric_type as "metricType",
        SUM(value) as "totalValue",
        SUM(cost) as "totalCost",
        unit
      FROM usage_metrics
      WHERE project_id = $1
        AND billing_period_start = $2
        AND billing_period_end = $3
      GROUP BY metric_type, unit`,
      [projectId, billingPeriod.start, billingPeriod.end]
    );

    const summary: Record<string, any> = {
      projectId,
      period: billingPeriod,
      metrics: {},
      totalCost: 0,
    };

    result.rows.forEach((row) => {
      summary.metrics[row.metricType] = {
        value: parseFloat(row.totalValue),
        cost: parseFloat(row.totalCost),
        unit: row.unit,
      };
      summary.totalCost += parseFloat(row.totalCost);
    });

    return summary;
  }
}
