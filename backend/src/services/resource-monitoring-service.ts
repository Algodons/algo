import { Pool } from 'pg';
import { ResourceMetric, ResourceUsageSummary, BillingPeriod, UsageForecast, ResourceAlert } from '../types/dashboard';

export class ResourceMonitoringService {
  constructor(private pool: Pool) {}

  async getCurrentUsage(userId: number): Promise<ResourceUsageSummary> {
    // Get current usage from the last hour
    const metrics = await this.pool.query(
      `SELECT 
        metric_type,
        AVG(value) as avg_value,
        MAX(value) as max_value
       FROM resource_metrics
       WHERE user_id = $1
         AND timestamp > NOW() - INTERVAL '1 hour'
       GROUP BY metric_type`,
      [userId]
    );

    // Default limits (these could come from user's plan)
    const limits = {
      cpu: 100, // percentage
      memory: 2048, // MB
      storage: 10240, // MB
      bandwidth: 100000, // MB
    };

    const usage: ResourceUsageSummary = {
      cpu: {
        current: 0,
        limit: limits.cpu,
        percentage: 0,
      },
      memory: {
        current: 0,
        limit: limits.memory,
        percentage: 0,
        unit: 'MB',
      },
      storage: {
        current: 0,
        limit: limits.storage,
        percentage: 0,
        unit: 'MB',
      },
      bandwidth: {
        current: 0,
        limit: limits.bandwidth,
        unit: 'MB',
      },
    };

    metrics.rows.forEach((row) => {
      const value = parseFloat(row.avg_value);
      switch (row.metric_type) {
        case 'cpu':
          usage.cpu.current = value;
          usage.cpu.percentage = (value / limits.cpu) * 100;
          break;
        case 'memory':
          usage.memory.current = value;
          usage.memory.percentage = (value / limits.memory) * 100;
          break;
        case 'storage':
          usage.storage.current = value;
          usage.storage.percentage = (value / limits.storage) * 100;
          break;
        case 'bandwidth':
          usage.bandwidth.current = value;
          break;
      }
    });

    return usage;
  }

  async getHistoricalUsage(
    userId: number,
    metricType: string,
    startDate: Date,
    endDate: Date
  ): Promise<ResourceMetric[]> {
    const result = await this.pool.query(
      `SELECT *
       FROM resource_metrics
       WHERE user_id = $1
         AND metric_type = $2
         AND timestamp BETWEEN $3 AND $4
       ORDER BY timestamp ASC`,
      [userId, metricType, startDate, endDate]
    );

    return result.rows;
  }

  async getUsageTimeSeries(
    userId: number,
    metricType: string,
    hours: number = 24
  ): Promise<{ timestamp: Date; value: number }[]> {
    // Validate hours parameter to prevent SQL injection
    const validHours = Math.max(1, Math.min(parseInt(String(hours), 10), 8760)); // Max 1 year
    
    const result = await this.pool.query(
      `SELECT 
        date_trunc('hour', timestamp) as hour,
        AVG(value) as avg_value
       FROM resource_metrics
       WHERE user_id = $1
         AND metric_type = $2
         AND timestamp > NOW() - INTERVAL '1 hour' * $3
       GROUP BY hour
       ORDER BY hour ASC`,
      [userId, metricType, validHours]
    );

    return result.rows.map((row) => ({
      timestamp: row.hour,
      value: parseFloat(row.avg_value),
    }));
  }

  async recordMetric(
    userId: number,
    projectId: number | null,
    metricType: string,
    value: number,
    unit: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO resource_metrics (user_id, project_id, metric_type, value, unit)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, projectId, metricType, value, unit]
    );

    // Check for alerts
    await this.checkAlerts(userId, metricType, value);
  }

  async getBillingBreakdown(userId: number, periodId?: number): Promise<BillingPeriod> {
    let query: string;
    const params: any[] = [userId];

    if (periodId) {
      query = `SELECT * FROM billing_periods WHERE id = $2 AND user_id = $1`;
      params.push(periodId);
    } else {
      // Get current period
      query = `
        SELECT * FROM billing_periods
        WHERE user_id = $1
          AND period_start <= CURRENT_DATE
          AND period_end >= CURRENT_DATE
        ORDER BY period_start DESC
        LIMIT 1
      `;
    }

    const result = await this.pool.query(query, params);

    if (result.rows.length === 0) {
      // Create a new period if none exists
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const newPeriod = await this.pool.query(
        `INSERT INTO billing_periods (user_id, period_start, period_end)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, periodStart, periodEnd]
      );

      return newPeriod.rows[0];
    }

    return result.rows[0];
  }

  async calculateCosts(userId: number, periodId: number): Promise<void> {
    // Get all metrics for the period
    const period = await this.pool.query(
      'SELECT * FROM billing_periods WHERE id = $1',
      [periodId]
    );

    if (period.rows.length === 0) {
      throw new Error('Billing period not found');
    }

    const p = period.rows[0];

    // Cost per unit (example pricing)
    const pricing = {
      cpu: 0.01, // per CPU hour
      memory: 0.005, // per GB hour
      storage: 0.001, // per GB hour
      bandwidth: 0.01, // per GB
      build_minutes: 0.1, // per minute
    };

    const metrics = await this.pool.query(
      `SELECT 
        metric_type,
        SUM(value) as total_value
       FROM resource_metrics
       WHERE user_id = $1
         AND timestamp BETWEEN $2 AND $3
       GROUP BY metric_type`,
      [userId, p.period_start, p.period_end]
    );

    let cpuCost = 0;
    let memoryCost = 0;
    let storageCost = 0;
    let bandwidthCost = 0;

    metrics.rows.forEach((row) => {
      const value = parseFloat(row.total_value);
      switch (row.metric_type) {
        case 'cpu':
          cpuCost = (value / 100) * pricing.cpu;
          break;
        case 'memory':
          memoryCost = (value / 1024) * pricing.memory;
          break;
        case 'storage':
          storageCost = (value / 1024) * pricing.storage;
          break;
        case 'bandwidth':
          bandwidthCost = (value / 1024) * pricing.bandwidth;
          break;
      }
    });

    const totalCost = cpuCost + memoryCost + storageCost + bandwidthCost;

    await this.pool.query(
      `UPDATE billing_periods
       SET cpu_cost = $1, memory_cost = $2, storage_cost = $3, 
           bandwidth_cost = $4, total_cost = $5
       WHERE id = $6`,
      [cpuCost, memoryCost, storageCost, bandwidthCost, totalCost, periodId]
    );
  }

  async getForecast(userId: number, metricType: string): Promise<UsageForecast> {
    // Simple linear regression forecast based on last 30 days
    const historical = await this.pool.query(
      `SELECT 
        DATE(timestamp) as date,
        AVG(value) as avg_value
       FROM resource_metrics
       WHERE user_id = $1
         AND metric_type = $2
         AND timestamp > NOW() - INTERVAL '30 days'
       GROUP BY DATE(timestamp)
       ORDER BY date ASC`,
      [userId, metricType]
    );

    if (historical.rows.length < 7) {
      // Not enough data for forecast
      return {
        metricType,
        currentValue: 0,
        forecastedValue: 0,
        forecastDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        confidence: 0,
        trend: 'stable',
      };
    }

    // Calculate simple moving average and trend
    const values = historical.rows.map((r) => parseFloat(r.avg_value));
    const currentValue = values[values.length - 1];
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

    // Simple trend calculation
    const recentAvg = values.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const olderAvg = values.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
    const trendValue = recentAvg - olderAvg;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(trendValue) > avgValue * 0.1) {
      trend = trendValue > 0 ? 'increasing' : 'decreasing';
    }

    // Forecast for 30 days ahead
    const forecastedValue = currentValue + (trendValue * 4); // 4 weeks
    const confidence = Math.min(historical.rows.length / 30, 0.9);

    return {
      metricType,
      currentValue,
      forecastedValue: Math.max(0, forecastedValue),
      forecastDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      confidence,
      trend,
    };
  }

  async createAlert(
    userId: number,
    metricType: string,
    thresholdValue: number,
    thresholdPercentage?: number
  ): Promise<ResourceAlert> {
    const result = await this.pool.query(
      `INSERT INTO resource_alerts 
        (user_id, metric_type, threshold_value, threshold_percentage)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, metricType, thresholdValue, thresholdPercentage]
    );

    return result.rows[0];
  }

  async getAlerts(userId: number): Promise<ResourceAlert[]> {
    const result = await this.pool.query(
      `SELECT * FROM resource_alerts
       WHERE user_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  private async checkAlerts(
    userId: number,
    metricType: string,
    value: number
  ): Promise<void> {
    const alerts = await this.pool.query(
      `SELECT * FROM resource_alerts
       WHERE user_id = $1
         AND metric_type = $2
         AND is_active = true
         AND (threshold_value <= $3 OR threshold_percentage IS NOT NULL)`,
      [userId, metricType, value]
    );

    for (const alert of alerts.rows) {
      if (alert.threshold_value && value >= alert.threshold_value) {
        // Trigger alert
        await this.pool.query(
          `UPDATE resource_alerts
           SET last_triggered_at = CURRENT_TIMESTAMP, notification_sent = true
           WHERE id = $1`,
          [alert.id]
        );

        // TODO: Send notification
      }
    }
  }
}
