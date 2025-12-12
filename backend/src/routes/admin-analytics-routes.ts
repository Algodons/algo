import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAdmin, logAdminAction } from '../middleware/admin-auth';

export function createAdminAnalyticsRoutes(pool: Pool) {
  const router = express.Router();

  // Apply admin authentication and logging to all routes
  router.use(requireAdmin);
  router.use(logAdminAction(pool));

  /**
   * GET /api/admin/analytics/active-users
   * Real-time active users dashboard
   */
  router.get('/active-users', async (req: Request, res: Response) => {
    try {
      // Get users who logged in within last 15 minutes
      const activeUsersResult = await pool.query(
        `SELECT COUNT(DISTINCT user_id) as active_users
         FROM audit_logs
         WHERE created_at > NOW() - INTERVAL '15 minutes'`
      );

      // Get active sessions (users with recent API activity)
      const activeSessionsResult = await pool.query(
        `SELECT COUNT(DISTINCT user_id) as active_sessions
         FROM api_usage
         WHERE timestamp > NOW() - INTERVAL '30 minutes'`
      );

      // Get concurrent deployments
      const deploymentsResult = await pool.query(
        `SELECT COUNT(*) as concurrent_deployments
         FROM deployment_queue
         WHERE status = 'in_progress'`
      );

      // Get active projects (recently accessed)
      const activeProjectsResult = await pool.query(
        `SELECT COUNT(*) as active_projects
         FROM projects
         WHERE last_accessed > NOW() - INTERVAL '1 hour'`
      );

      res.json({
        activeUsers: parseInt(activeUsersResult.rows[0].active_users),
        activeSessions: parseInt(activeSessionsResult.rows[0].active_sessions),
        concurrentDeployments: parseInt(deploymentsResult.rows[0].concurrent_deployments),
        activeProjects: parseInt(activeProjectsResult.rows[0].active_projects),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching active users:', error);
      res.status(500).json({ error: 'Failed to fetch active users' });
    }
  });

  /**
   * GET /api/admin/analytics/revenue
   * Revenue metrics (MRR, ARR)
   */
  router.get('/revenue', async (req: Request, res: Response) => {
    try {
      const { period = '12m' } = req.query;

      // Calculate MRR (Monthly Recurring Revenue)
      const mrrResult = await pool.query(
        `SELECT 
           SUM(CASE WHEN billing_cycle = 'monthly' THEN amount ELSE amount / 12 END) as mrr
         FROM subscriptions
         WHERE status = 'active'`
      );

      const mrr = parseFloat(mrrResult.rows[0].mrr || 0);
      const arr = mrr * 12; // Annual Recurring Revenue

      // Get revenue trends
      const trendsResult = await pool.query(
        `SELECT 
           DATE_TRUNC('month', created_at) as month,
           COUNT(*) as new_subscriptions,
           SUM(amount) as revenue
         FROM subscriptions
         WHERE created_at > NOW() - INTERVAL '${period}'
         GROUP BY month
         ORDER BY month ASC`
      );

      // Calculate growth rate
      const trends = trendsResult.rows;
      let growthRate = 0;
      if (trends.length >= 2) {
        const lastMonth = parseFloat(trends[trends.length - 1].revenue || 0);
        const prevMonth = parseFloat(trends[trends.length - 2].revenue || 0);
        if (prevMonth > 0) {
          growthRate = ((lastMonth - prevMonth) / prevMonth) * 100;
        }
      }

      // Get subscription distribution
      const distributionResult = await pool.query(
        `SELECT tier, COUNT(*) as count, SUM(amount) as revenue
         FROM subscriptions
         WHERE status = 'active'
         GROUP BY tier`
      );

      res.json({
        mrr: mrr.toFixed(2),
        arr: arr.toFixed(2),
        growthRate: growthRate.toFixed(2),
        trends: trends,
        subscriptionDistribution: distributionResult.rows,
        currency: 'USD',
      });
    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
      res.status(500).json({ error: 'Failed to fetch revenue metrics' });
    }
  });

  /**
   * GET /api/admin/analytics/churn
   * Churn analysis
   */
  router.get('/churn', async (req: Request, res: Response) => {
    try {
      // Calculate monthly churn rate
      const churnResult = await pool.query(
        `WITH monthly_stats AS (
           SELECT 
             DATE_TRUNC('month', event_date) as month,
             COUNT(*) as churned_users,
             (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as total_active
           FROM churn_events
           WHERE event_type = 'cancelled' AND event_date > NOW() - INTERVAL '12 months'
           GROUP BY month
         )
         SELECT 
           month,
           churned_users,
           total_active,
           (churned_users::float / NULLIF(total_active, 0) * 100) as churn_rate
         FROM monthly_stats
         ORDER BY month DESC`
      );

      // Get cancellation reasons
      const reasonsResult = await pool.query(
        `SELECT 
           cancellation_reason,
           COUNT(*) as count,
           (COUNT(*)::float / (SELECT COUNT(*) FROM churn_events WHERE event_type = 'cancelled') * 100) as percentage
         FROM churn_events
         WHERE event_type = 'cancelled' AND event_date > NOW() - INTERVAL '6 months'
         GROUP BY cancellation_reason
         ORDER BY count DESC`
      );

      // Cohort retention analysis (simplified)
      const cohortResult = await pool.query(
        `SELECT 
           DATE_TRUNC('month', u.created_at) as cohort_month,
           COUNT(DISTINCT u.id) as users,
           COUNT(DISTINCT CASE WHEN s.status = 'active' THEN u.id END) as retained_users
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id
         WHERE u.created_at > NOW() - INTERVAL '12 months'
         GROUP BY cohort_month
         ORDER BY cohort_month DESC`
      );

      const cohortAnalysis = cohortResult.rows.map(row => ({
        cohortMonth: row.cohort_month,
        users: parseInt(row.users),
        retainedUsers: parseInt(row.retained_users),
        retentionRate: (parseInt(row.retained_users) / parseInt(row.users) * 100).toFixed(2),
      }));

      res.json({
        monthlyChurn: churnResult.rows,
        cancellationReasons: reasonsResult.rows,
        cohortAnalysis,
      });
    } catch (error) {
      console.error('Error fetching churn analysis:', error);
      res.status(500).json({ error: 'Failed to fetch churn analysis' });
    }
  });

  /**
   * GET /api/admin/analytics/resources
   * Platform-wide resource utilization
   */
  router.get('/resources', async (req: Request, res: Response) => {
    try {
      const { period = '24h' } = req.query;

      let interval = '1 hour';
      if (period === '7d') interval = '6 hours';
      if (period === '30d') interval = '1 day';

      // Get resource metrics
      const metricsResult = await pool.query(
        `SELECT 
           metric_type,
           DATE_TRUNC('${interval}', timestamp) as time_bucket,
           SUM(value) as total,
           AVG(value) as average,
           MAX(value) as peak,
           unit
         FROM resource_metrics
         WHERE timestamp > NOW() - INTERVAL '${period}'
         GROUP BY metric_type, time_bucket, unit
         ORDER BY time_bucket ASC`
      );

      // Get container counts
      const containersResult = await pool.query(
        `SELECT 
           status,
           COUNT(*) as count
         FROM container_metrics
         WHERE timestamp > NOW() - INTERVAL '1 hour'
         GROUP BY status`
      );

      // Get total storage consumption
      const storageResult = await pool.query(
        `SELECT SUM(value) as total_storage
         FROM resource_metrics
         WHERE metric_type = 'storage' 
         AND timestamp = (SELECT MAX(timestamp) FROM resource_metrics WHERE metric_type = 'storage')`
      );

      // Get bandwidth usage
      const bandwidthResult = await pool.query(
        `SELECT SUM(value) as total_bandwidth
         FROM resource_metrics
         WHERE metric_type = 'bandwidth' AND timestamp > NOW() - INTERVAL '${period}'`
      );

      res.json({
        metrics: metricsResult.rows,
        containers: containersResult.rows,
        totalStorage: storageResult.rows[0]?.total_storage || 0,
        totalBandwidth: bandwidthResult.rows[0]?.total_bandwidth || 0,
      });
    } catch (error) {
      console.error('Error fetching resource utilization:', error);
      res.status(500).json({ error: 'Failed to fetch resource utilization' });
    }
  });

  /**
   * GET /api/admin/analytics/templates
   * Most popular templates and frameworks
   */
  router.get('/templates', async (req: Request, res: Response) => {
    try {
      // Get most used templates
      const templatesResult = await pool.query(
        `SELECT 
           pt.name,
           pt.language,
           pt.framework,
           pt.usage_count,
           COUNT(p.id) as project_count
         FROM project_templates pt
         LEFT JOIN projects p ON p.framework = pt.framework
         WHERE pt.is_active = true
         GROUP BY pt.id, pt.name, pt.language, pt.framework, pt.usage_count
         ORDER BY project_count DESC
         LIMIT 20`
      );

      // Get language distribution
      const languagesResult = await pool.query(
        `SELECT 
           language,
           COUNT(*) as count,
           (COUNT(*)::float / (SELECT COUNT(*) FROM projects) * 100) as percentage
         FROM projects
         GROUP BY language
         ORDER BY count DESC`
      );

      // Get framework distribution
      const frameworksResult = await pool.query(
        `SELECT 
           framework,
           COUNT(*) as count,
           (COUNT(*)::float / (SELECT COUNT(*) FROM projects WHERE framework IS NOT NULL) * 100) as percentage
         FROM projects
         WHERE framework IS NOT NULL
         GROUP BY framework
         ORDER BY count DESC
         LIMIT 15`
      );

      res.json({
        topTemplates: templatesResult.rows,
        languageDistribution: languagesResult.rows,
        frameworkDistribution: frameworksResult.rows,
      });
    } catch (error) {
      console.error('Error fetching template statistics:', error);
      res.status(500).json({ error: 'Failed to fetch template statistics' });
    }
  });

  /**
   * GET /api/admin/analytics/geography
   * Geographic distribution of users
   */
  router.get('/geography', async (req: Request, res: Response) => {
    try {
      // Get user distribution by country
      const countriesResult = await pool.query(
        `SELECT 
           country_code,
           country_name,
           COUNT(*) as user_count,
           (COUNT(*)::float / (SELECT COUNT(*) FROM user_geography) * 100) as percentage
         FROM user_geography
         WHERE country_code IS NOT NULL
         GROUP BY country_code, country_name
         ORDER BY user_count DESC`
      );

      // Get regional distribution
      const regionsResult = await pool.query(
        `SELECT 
           region,
           COUNT(*) as user_count
         FROM user_geography
         WHERE region IS NOT NULL
         GROUP BY region
         ORDER BY user_count DESC
         LIMIT 20`
      );

      // Get timezone distribution
      const timezonesResult = await pool.query(
        `SELECT 
           timezone,
           COUNT(*) as user_count
         FROM user_geography
         WHERE timezone IS NOT NULL
         GROUP BY timezone
         ORDER BY user_count DESC
         LIMIT 10`
      );

      res.json({
        countries: countriesResult.rows,
        regions: regionsResult.rows,
        timezones: timezonesResult.rows,
      });
    } catch (error) {
      console.error('Error fetching geographic distribution:', error);
      res.status(500).json({ error: 'Failed to fetch geographic distribution' });
    }
  });

  /**
   * GET /api/admin/analytics/performance
   * Platform performance metrics
   */
  router.get('/performance', async (req: Request, res: Response) => {
    try {
      const { period = '24h' } = req.query;

      // Get API performance metrics
      const apiPerfResult = await pool.query(
        `SELECT 
           endpoint,
           COUNT(*) as request_count,
           AVG(response_time_ms) as avg_response_time,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as p50_latency,
           PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_latency,
           PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_latency,
           COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
         FROM api_usage
         WHERE timestamp > NOW() - INTERVAL '${period}'
         GROUP BY endpoint
         ORDER BY request_count DESC
         LIMIT 20`
      );

      // Get overall platform performance
      const overallResult = await pool.query(
        `SELECT 
           AVG(p50_latency) as avg_p50,
           AVG(p95_latency) as avg_p95,
           AVG(p99_latency) as avg_p99,
           AVG(error_rate) as avg_error_rate
         FROM platform_performance
         WHERE timestamp > NOW() - INTERVAL '${period}'`
      );

      // Get database query performance
      const dbPerfResult = await pool.query(
        `SELECT 
           metric_name,
           avg_response_time,
           request_count,
           error_rate
         FROM platform_performance
         WHERE metric_name LIKE 'db_%' AND timestamp > NOW() - INTERVAL '${period}'
         ORDER BY avg_response_time DESC
         LIMIT 10`
      );

      res.json({
        apiPerformance: apiPerfResult.rows,
        overall: overallResult.rows[0] || {},
        databasePerformance: dbPerfResult.rows,
      });
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  });

  /**
   * GET /api/admin/analytics/summary
   * Executive summary dashboard
   */
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      // Get key metrics
      const usersResult = await pool.query(
        `SELECT 
           COUNT(*) as total_users,
           COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
           COUNT(CASE WHEN is_suspended = false THEN 1 END) as active_users
         FROM users`
      );

      const projectsResult = await pool.query(
        `SELECT 
           COUNT(*) as total_projects,
           COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_projects_30d,
           COUNT(CASE WHEN deployment_status = 'running' THEN 1 END) as running_projects
         FROM projects`
      );

      const subscriptionsResult = await pool.query(
        `SELECT 
           COUNT(*) as total_subscriptions,
           SUM(amount) as monthly_revenue
         FROM subscriptions
         WHERE status = 'active'`
      );

      const deploymentsResult = await pool.query(
        `SELECT 
           COUNT(*) as total_deployments,
           COUNT(CASE WHEN completed_at > NOW() - INTERVAL '24 hours' THEN 1 END) as deployments_24h,
           AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_deployment_time
         FROM deployment_queue
         WHERE status = 'completed'`
      );

      res.json({
        users: usersResult.rows[0],
        projects: projectsResult.rows[0],
        subscriptions: subscriptionsResult.rows[0],
        deployments: deploymentsResult.rows[0],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  return router;
}
