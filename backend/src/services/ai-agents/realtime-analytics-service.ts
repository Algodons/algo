/**
 * Real-Time Analytics Service
 * 
 * Provides real-time analytics, global activity maps, custom dashboards,
 * and revenue impact simulations.
 */

import { Pool } from 'pg';
import { EventEmitter } from 'events';

export interface GlobalActivityMap {
  locations: Array<{
    country: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    activeUsers: number;
    resourceUsage: number;
    recentActions: number;
  }>;
  totalActiveUsers: number;
  timestamp: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'map' | 'list';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: any;
  dataSource: string;
  refreshInterval: number; // seconds
}

export interface CustomDashboard {
  id: string;
  userId: number;
  name: string;
  widgets: DashboardWidget[];
  layout: string; // 'grid' | 'flex'
  shared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueSimulation {
  currentMRR: number;
  projectedMRR: number;
  changes: Array<{
    change: string;
    impact: number;
    impactPercentage: number;
    confidence: number;
  }>;
  totalImpact: number;
  totalImpactPercentage: number;
  timeframe: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RealTimeMetric {
  metric: string;
  value: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  timestamp: Date;
}

export class RealtimeAnalyticsService extends EventEmitter {
  private pool: Pool;
  private activeConnections: Map<string, any>;
  private metricsCache: Map<string, RealTimeMetric>;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(pool: Pool) {
    super();
    this.pool = pool;
    this.activeConnections = new Map();
    this.metricsCache = new Map();
  }

  /**
   * Start real-time analytics streaming
   */
  start(): void {
    if (this.updateInterval) {
      return; // Already running
    }

    // Update metrics every 5 seconds
    this.updateInterval = setInterval(() => {
      this.updateRealTimeMetrics();
    }, 5000);

    console.log('Real-time analytics service started');
  }

  /**
   * Stop real-time analytics streaming
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('Real-time analytics service stopped');
  }

  /**
   * Get global activity map
   */
  async getGlobalActivityMap(timeWindow: number = 300): Promise<GlobalActivityMap> {
    try {
      // Get active users by location in the last timeWindow seconds
      const result = await this.pool.query(
        `SELECT 
          ug.country,
          ug.country_code,
          ug.latitude,
          ug.longitude,
          COUNT(DISTINCT al.user_id) as active_users,
          COUNT(al.id) as recent_actions,
          COALESCE(SUM(CASE WHEN al.resource_type = 'cpu' THEN 1 ELSE 0 END), 0) as resource_usage
         FROM audit_logs al
         JOIN user_geography ug ON al.user_id = ug.user_id
         WHERE al.created_at > NOW() - INTERVAL '${timeWindow} seconds'
         GROUP BY ug.country, ug.country_code, ug.latitude, ug.longitude
         ORDER BY active_users DESC`,
        []
      );

      const locations = result.rows.map(row => ({
        country: row.country,
        countryCode: row.country_code,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        activeUsers: parseInt(row.active_users),
        resourceUsage: parseInt(row.resource_usage),
        recentActions: parseInt(row.recent_actions),
      }));

      const totalActiveUsers = locations.reduce((sum, loc) => sum + loc.activeUsers, 0);

      const map: GlobalActivityMap = {
        locations,
        totalActiveUsers,
        timestamp: new Date(),
      };

      // Emit update event
      this.emit('activity-map-update', map);

      return map;
    } catch (error) {
      console.error('Failed to get global activity map:', error);
      throw error;
    }
  }

  /**
   * Create custom dashboard
   */
  async createDashboard(
    userId: number,
    name: string,
    widgets: DashboardWidget[],
    layout: 'grid' | 'flex' = 'grid'
  ): Promise<CustomDashboard> {
    try {
      const dashboardId = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await this.pool.query(
        `INSERT INTO custom_dashboards (id, user_id, name, widgets, layout, shared, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
         RETURNING *`,
        [dashboardId, userId, name, JSON.stringify(widgets), layout]
      );

      const dashboard = result.rows[0];

      return {
        id: dashboard.id,
        userId: dashboard.user_id,
        name: dashboard.name,
        widgets: JSON.parse(dashboard.widgets),
        layout: dashboard.layout,
        shared: dashboard.shared,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at,
      };
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      throw error;
    }
  }

  /**
   * Get user's dashboards
   */
  async getUserDashboards(userId: number): Promise<CustomDashboard[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM custom_dashboards WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        widgets: JSON.parse(row.widgets),
        layout: row.layout,
        shared: row.shared,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('Failed to get user dashboards:', error);
      throw error;
    }
  }

  /**
   * Update dashboard widgets
   */
  async updateDashboard(
    dashboardId: string,
    userId: number,
    updates: Partial<CustomDashboard>
  ): Promise<CustomDashboard> {
    try {
      const setStatements = [];
      const values = [dashboardId, userId];
      let paramIndex = 3;

      if (updates.name) {
        setStatements.push(`name = $${paramIndex}`);
        values.push(updates.name);
        paramIndex++;
      }

      if (updates.widgets) {
        setStatements.push(`widgets = $${paramIndex}`);
        values.push(JSON.stringify(updates.widgets));
        paramIndex++;
      }

      if (updates.layout) {
        setStatements.push(`layout = $${paramIndex}`);
        values.push(updates.layout);
        paramIndex++;
      }

      if (updates.shared !== undefined) {
        setStatements.push(`shared = $${paramIndex}`);
        values.push(updates.shared);
        paramIndex++;
      }

      setStatements.push('updated_at = NOW()');

      const result = await this.pool.query(
        `UPDATE custom_dashboards 
         SET ${setStatements.join(', ')}
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Dashboard not found or access denied');
      }

      const dashboard = result.rows[0];

      return {
        id: dashboard.id,
        userId: dashboard.user_id,
        name: dashboard.name,
        widgets: JSON.parse(dashboard.widgets),
        layout: dashboard.layout,
        shared: dashboard.shared,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at,
      };
    } catch (error) {
      console.error('Failed to update dashboard:', error);
      throw error;
    }
  }

  /**
   * Simulate revenue impact of platform changes
   */
  async simulateRevenueImpact(changes: Array<{
    type: 'price_change' | 'feature_add' | 'limit_change' | 'promotion';
    description: string;
    details: any;
  }>): Promise<RevenueSimulation> {
    try {
      // Get current MRR
      const currentMRRResult = await this.pool.query(
        `SELECT COALESCE(SUM(mrr), 0) as current_mrr
         FROM subscriptions
         WHERE status = 'active'`
      );

      const currentMRR = parseFloat(currentMRRResult.rows[0].current_mrr);

      // Simulate impact for each change
      const impacts = await Promise.all(
        changes.map(change => this.simulateChangeImpact(change, currentMRR))
      );

      const totalImpact = impacts.reduce((sum, impact) => sum + impact.impact, 0);
      const totalImpactPercentage = (totalImpact / currentMRR) * 100;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high';
      if (Math.abs(totalImpactPercentage) < 5) riskLevel = 'low';
      else if (Math.abs(totalImpactPercentage) < 15) riskLevel = 'medium';
      else riskLevel = 'high';

      return {
        currentMRR,
        projectedMRR: currentMRR + totalImpact,
        changes: impacts,
        totalImpact,
        totalImpactPercentage,
        timeframe: '30 days',
        riskLevel,
      };
    } catch (error) {
      console.error('Failed to simulate revenue impact:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetric[]> {
    const metrics = [
      'active_users',
      'api_requests_per_second',
      'error_rate',
      'avg_response_time',
      'cpu_usage',
      'memory_usage',
      'active_deployments',
      'revenue_today',
    ];

    const results = await Promise.all(
      metrics.map(metric => this.calculateMetric(metric))
    );

    return results;
  }

  /**
   * Stream real-time data to connected clients
   */
  async streamMetrics(connectionId: string, callback: (data: any) => void): Promise<void> {
    this.activeConnections.set(connectionId, callback);

    // Send initial data
    const metrics = await this.getRealTimeMetrics();
    callback({ type: 'metrics', data: metrics });
  }

  /**
   * Disconnect streaming client
   */
  disconnectStream(connectionId: string): void {
    this.activeConnections.delete(connectionId);
  }

  /**
   * Get widget data for dashboard
   */
  async getWidgetData(widget: DashboardWidget, timeRange: string = '24h'): Promise<any> {
    try {
      switch (widget.dataSource) {
        case 'active_users':
          return await this.getActiveUsersData(timeRange);
        case 'revenue':
          return await this.getRevenueData(timeRange);
        case 'resource_usage':
          return await this.getResourceUsageData(timeRange);
        case 'api_performance':
          return await this.getAPIPerformanceData(timeRange);
        case 'user_signups':
          return await this.getUserSignupsData(timeRange);
        default:
          return { error: 'Unknown data source' };
      }
    } catch (error) {
      console.error('Failed to get widget data:', error);
      return { error: 'Failed to fetch data' };
    }
  }

  // Private helper methods

  private async updateRealTimeMetrics(): Promise<void> {
    try {
      const metrics = await this.getRealTimeMetrics();
      
      metrics.forEach(metric => {
        this.metricsCache.set(metric.metric, metric);
      });

      // Broadcast to all connected clients
      this.activeConnections.forEach((callback, connectionId) => {
        callback({ type: 'metrics_update', data: metrics });
      });

      this.emit('metrics-updated', metrics);
    } catch (error) {
      console.error('Failed to update real-time metrics:', error);
    }
  }

  private async calculateMetric(metricName: string): Promise<RealTimeMetric> {
    let value = 0;
    let previousValue = 0;

    switch (metricName) {
      case 'active_users':
        const activeUsersResult = await this.pool.query(
          `SELECT COUNT(DISTINCT user_id) as count
           FROM audit_logs
           WHERE created_at > NOW() - INTERVAL '5 minutes'`
        );
        value = parseInt(activeUsersResult.rows[0].count);
        
        const prevActiveUsersResult = await this.pool.query(
          `SELECT COUNT(DISTINCT user_id) as count
           FROM audit_logs
           WHERE created_at BETWEEN NOW() - INTERVAL '10 minutes' AND NOW() - INTERVAL '5 minutes'`
        );
        previousValue = parseInt(prevActiveUsersResult.rows[0].count);
        break;

      case 'api_requests_per_second':
        const requestsResult = await this.pool.query(
          `SELECT COUNT(*) as count
           FROM audit_logs
           WHERE created_at > NOW() - INTERVAL '1 minute'`
        );
        value = parseInt(requestsResult.rows[0].count) / 60;
        break;

      case 'revenue_today':
        const revenueResult = await this.pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total
           FROM credit_transactions
           WHERE type = 'purchase' AND created_at >= CURRENT_DATE`
        );
        value = parseFloat(revenueResult.rows[0].total);
        break;

      default:
        value = Math.random() * 100; // Mock for other metrics
    }

    const change = value - previousValue;
    const changePercentage = previousValue !== 0 ? (change / previousValue) * 100 : 0;
    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

    return {
      metric: metricName,
      value,
      change,
      changePercentage,
      trend,
      timestamp: new Date(),
    };
  }

  private async simulateChangeImpact(
    change: any,
    currentMRR: number
  ): Promise<{ change: string; impact: number; impactPercentage: number; confidence: number }> {
    let impact = 0;
    let confidence = 0.7;

    switch (change.type) {
      case 'price_change':
        // Calculate impact of price change
        const priceChangePercent = change.details.percentageChange || 0;
        const affectedUsers = change.details.affectedTier || 'all';
        
        // Get users in affected tier
        const tierResult = await this.pool.query(
          `SELECT COUNT(*) as count, AVG(mrr) as avg_mrr
           FROM subscriptions
           WHERE status = 'active' ${affectedUsers !== 'all' ? `AND tier = '${affectedUsers}'` : ''}`
        );
        
        const tierMRR = parseFloat(tierResult.rows[0].avg_mrr) * parseInt(tierResult.rows[0].count);
        
        // Assume some churn with price increase, growth with decrease
        const churnRate = priceChangePercent > 0 ? priceChangePercent * 0.05 : 0;
        impact = (tierMRR * priceChangePercent / 100) * (1 - churnRate);
        confidence = 0.75;
        break;

      case 'feature_add':
        // New feature typically drives 2-5% upgrade rate
        const upgradeRate = 0.03;
        const avgUpgradeValue = 30;
        
        const userCountResult = await this.pool.query(
          'SELECT COUNT(*) as count FROM subscriptions WHERE status = \'active\''
        );
        
        impact = parseInt(userCountResult.rows[0].count) * upgradeRate * avgUpgradeValue;
        confidence = 0.6;
        break;

      case 'limit_change':
        // Changing limits affects upgrades/downgrades
        const limitImpact = change.details.increase ? 0.02 : -0.01;
        impact = currentMRR * limitImpact;
        confidence = 0.65;
        break;

      case 'promotion':
        // Promotions typically boost signups by 10-20%
        const promotionBoost = 0.15;
        const avgSubscriptionValue = 25;
        impact = currentMRR * promotionBoost * (avgSubscriptionValue / (currentMRR / 100));
        confidence = 0.7;
        break;
    }

    return {
      change: change.description,
      impact,
      impactPercentage: (impact / currentMRR) * 100,
      confidence,
    };
  }

  private async getActiveUsersData(timeRange: string): Promise<any> {
    const interval = this.parseTimeRange(timeRange);
    
    const result = await this.pool.query(
      `SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(DISTINCT user_id) as users
       FROM audit_logs
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY hour
       ORDER BY hour ASC`
    );

    return {
      labels: result.rows.map(r => r.hour),
      data: result.rows.map(r => parseInt(r.users)),
    };
  }

  private async getRevenueData(timeRange: string): Promise<any> {
    const interval = this.parseTimeRange(timeRange);
    
    const result = await this.pool.query(
      `SELECT 
        DATE_TRUNC('day', created_at) as day,
        SUM(amount) as revenue
       FROM credit_transactions
       WHERE type = 'purchase' AND created_at > NOW() - INTERVAL '${interval}'
       GROUP BY day
       ORDER BY day ASC`
    );

    return {
      labels: result.rows.map(r => r.day),
      data: result.rows.map(r => parseFloat(r.revenue)),
    };
  }

  private async getResourceUsageData(timeRange: string): Promise<any> {
    // Mock data for resource usage
    return {
      cpu: 65,
      memory: 72,
      storage: 45,
      network: 58,
    };
  }

  private async getAPIPerformanceData(timeRange: string): Promise<any> {
    // Mock data for API performance
    return {
      avgResponseTime: 145,
      p95ResponseTime: 320,
      p99ResponseTime: 850,
      errorRate: 0.02,
    };
  }

  private async getUserSignupsData(timeRange: string): Promise<any> {
    const interval = this.parseTimeRange(timeRange);
    
    const result = await this.pool.query(
      `SELECT 
        DATE_TRUNC('day', created_at) as day,
        COUNT(*) as signups
       FROM users
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY day
       ORDER BY day ASC`
    );

    return {
      labels: result.rows.map(r => r.day),
      data: result.rows.map(r => parseInt(r.signups)),
    };
  }

  private parseTimeRange(timeRange: string): string {
    const map: any = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
    };
    return map[timeRange] || '24 hours';
  }
}

export default RealtimeAnalyticsService;
