import { Pool, PoolClient } from 'pg';

export interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  storageMb: number;
  computeHoursMonthly: number;
  bandwidthGbMonthly: number;
  concurrentDeployments: number;
  features: Record<string, any>;
  hasPrioritySupport: boolean;
  hasAdvancedAnalytics: boolean;
  hasSso: boolean;
  hasTeamManagement: boolean;
  bringOwnApiKeys: boolean;
  platformManagedAi: boolean;
}

export interface UserSubscription {
  id: number;
  userId: number;
  tier: string;
  status: string;
  billingCycle: string;
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
}

export class SubscriptionService {
  constructor(private pool: Pool) {}

  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const result = await this.pool.query(
      `SELECT 
        id, name, display_name as "displayName", description,
        price_monthly as "priceMonthly", price_yearly as "priceYearly", currency,
        storage_mb as "storageMb", compute_hours_monthly as "computeHoursMonthly",
        bandwidth_gb_monthly as "bandwidthGbMonthly", concurrent_deployments as "concurrentDeployments",
        features, has_priority_support as "hasPrioritySupport",
        has_advanced_analytics as "hasAdvancedAnalytics", has_sso as "hasSso",
        has_team_management as "hasTeamManagement", bring_own_api_keys as "bringOwnApiKeys",
        platform_managed_ai as "platformManagedAi"
      FROM subscription_plans
      WHERE is_active = true
      ORDER BY sort_order`
    );
    return result.rows;
  }

  /**
   * Get a specific plan by name
   */
  async getPlanByName(planName: string): Promise<SubscriptionPlan | null> {
    const result = await this.pool.query(
      `SELECT 
        id, name, display_name as "displayName", description,
        price_monthly as "priceMonthly", price_yearly as "priceYearly", currency,
        storage_mb as "storageMb", compute_hours_monthly as "computeHoursMonthly",
        bandwidth_gb_monthly as "bandwidthGbMonthly", concurrent_deployments as "concurrentDeployments",
        features, has_priority_support as "hasPrioritySupport",
        has_advanced_analytics as "hasAdvancedAnalytics", has_sso as "hasSso",
        has_team_management as "hasTeamManagement", bring_own_api_keys as "bringOwnApiKeys",
        platform_managed_ai as "platformManagedAi"
      FROM subscription_plans
      WHERE name = $1 AND is_active = true`,
      [planName]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: number): Promise<UserSubscription | null> {
    const result = await this.pool.query(
      `SELECT 
        id, user_id as "userId", tier, status, billing_cycle as "billingCycle",
        amount, currency, current_period_start as "currentPeriodStart",
        current_period_end as "currentPeriodEnd", trial_ends_at as "trialEndsAt",
        cancelled_at as "cancelledAt"
      FROM subscriptions
      WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    userId: number,
    planName: string,
    billingCycle: 'monthly' | 'yearly',
    trialDays?: number
  ): Promise<UserSubscription> {
    const plan = await this.getPlanByName(planName);
    if (!plan) {
      throw new Error(`Plan ${planName} not found`);
    }

    const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    
    if (billingCycle === 'yearly') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    let trialEndsAt: Date | null = null;
    if (trialDays && trialDays > 0) {
      trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create subscription
      const result = await client.query(
        `INSERT INTO subscriptions 
          (user_id, tier, status, billing_cycle, amount, currency, 
           current_period_start, current_period_end, trial_ends_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) DO UPDATE SET
          tier = EXCLUDED.tier,
          billing_cycle = EXCLUDED.billing_cycle,
          amount = EXCLUDED.amount,
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = EXCLUDED.current_period_end,
          trial_ends_at = EXCLUDED.trial_ends_at,
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
        RETURNING 
          id, user_id as "userId", tier, status, billing_cycle as "billingCycle",
          amount, currency, current_period_start as "currentPeriodStart",
          current_period_end as "currentPeriodEnd", trial_ends_at as "trialEndsAt"`,
        [userId, planName, 'active', billingCycle, amount, plan.currency,
         currentPeriodStart, currentPeriodEnd, trialEndsAt]
      );

      // Log the change
      await client.query(
        `INSERT INTO subscription_change_history 
          (user_id, subscription_id, change_type, new_tier, new_billing_cycle)
        VALUES ($1, $2, $3, $4, $5)`,
        [userId, result.rows[0].id, 'created', planName, billingCycle]
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
   * Upgrade subscription
   */
  async upgradeSubscription(
    userId: number,
    newPlanName: string,
    newBillingCycle?: 'monthly' | 'yearly'
  ): Promise<UserSubscription> {
    const currentSubscription = await this.getUserSubscription(userId);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    const newPlan = await this.getPlanByName(newPlanName);
    if (!newPlan) {
      throw new Error(`Plan ${newPlanName} not found`);
    }

    const billingCycle = newBillingCycle || currentSubscription.billingCycle;
    const amount = billingCycle === 'yearly' ? newPlan.priceYearly : newPlan.priceMonthly;

    // Calculate proration
    const proration = await this.calculateProration(
      currentSubscription,
      amount,
      billingCycle as 'monthly' | 'yearly'
    );

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update subscription
      const result = await client.query(
        `UPDATE subscriptions 
        SET tier = $1, billing_cycle = $2, amount = $3, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4
        RETURNING 
          id, user_id as "userId", tier, status, billing_cycle as "billingCycle",
          amount, currency, current_period_start as "currentPeriodStart",
          current_period_end as "currentPeriodEnd"`,
        [newPlanName, billingCycle, amount, userId]
      );

      // Log the change
      await client.query(
        `INSERT INTO subscription_change_history 
          (user_id, subscription_id, change_type, old_tier, new_tier, 
           old_billing_cycle, new_billing_cycle, proration_amount)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, result.rows[0].id, 'upgraded', currentSubscription.tier, newPlanName,
         currentSubscription.billingCycle, billingCycle, proration]
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
   * Downgrade subscription
   */
  async downgradeSubscription(
    userId: number,
    newPlanName: string
  ): Promise<UserSubscription> {
    const currentSubscription = await this.getUserSubscription(userId);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    const newPlan = await this.getPlanByName(newPlanName);
    if (!newPlan) {
      throw new Error(`Plan ${newPlanName} not found`);
    }

    const amount = currentSubscription.billingCycle === 'yearly' 
      ? newPlan.priceYearly 
      : newPlan.priceMonthly;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Downgrade takes effect at the end of current period
      const result = await client.query(
        `UPDATE subscriptions 
        SET tier = $1, amount = $2, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3
        RETURNING 
          id, user_id as "userId", tier, status, billing_cycle as "billingCycle",
          amount, currency, current_period_start as "currentPeriodStart",
          current_period_end as "currentPeriodEnd"`,
        [newPlanName, amount, userId]
      );

      // Log the change
      await client.query(
        `INSERT INTO subscription_change_history 
          (user_id, subscription_id, change_type, old_tier, new_tier)
        VALUES ($1, $2, $3, $4, $5)`,
        [userId, result.rows[0].id, 'downgraded', currentSubscription.tier, newPlanName]
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
   * Cancel subscription
   */
  async cancelSubscription(userId: number, reason?: string): Promise<UserSubscription> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE subscriptions 
        SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING 
          id, user_id as "userId", tier, status, billing_cycle as "billingCycle",
          amount, currency, current_period_start as "currentPeriodStart",
          current_period_end as "currentPeriodEnd", cancelled_at as "cancelledAt"`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('No active subscription found');
      }

      // Log the change
      await client.query(
        `INSERT INTO subscription_change_history 
          (user_id, subscription_id, change_type, old_tier, reason)
        VALUES ($1, $2, $3, $4, $5)`,
        [userId, result.rows[0].id, 'cancelled', result.rows[0].tier, reason]
      );

      // Log churn event
      await client.query(
        `INSERT INTO churn_events 
          (user_id, subscription_id, event_type, previous_tier, cancellation_reason, cancellation_details)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, result.rows[0].id, 'cancelled', result.rows[0].tier, 'user_cancelled', reason]
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
   * Calculate proration for subscription changes
   */
  private async calculateProration(
    currentSubscription: UserSubscription,
    newAmount: number,
    newBillingCycle: 'monthly' | 'yearly'
  ): Promise<number> {
    const now = new Date();
    const periodStart = new Date(currentSubscription.currentPeriodStart);
    const periodEnd = new Date(currentSubscription.currentPeriodEnd);
    
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const unusedAmount = (currentSubscription.amount * remainingDays) / totalDays;
    const newPeriodAmount = (newAmount * remainingDays) / totalDays;
    
    return Math.max(0, newPeriodAmount - unusedAmount);
  }

  /**
   * Check if user has exceeded resource limits
   */
  async checkResourceLimits(userId: number): Promise<{
    withinLimits: boolean;
    limits: any;
    usage: any;
  }> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      // User is on free tier by default
      subscription.tier = 'free';
    }

    const plan = await this.getPlanByName(subscription.tier);
    if (!plan) {
      throw new Error('Invalid subscription plan');
    }

    // Get current period usage
    const usageResult = await this.pool.query(
      `SELECT 
        metric_type,
        SUM(value) as total_value
      FROM usage_metrics
      WHERE user_id = $1 
        AND billing_period_start = $2
        AND billing_period_end = $3
      GROUP BY metric_type`,
      [userId, subscription.currentPeriodStart, subscription.currentPeriodEnd]
    );

    const usage = usageResult.rows.reduce((acc, row) => {
      acc[row.metric_type] = parseFloat(row.total_value);
      return acc;
    }, {} as Record<string, number>);

    const limits = {
      storage: plan.storageMb,
      compute_hours: plan.computeHoursMonthly,
      bandwidth: plan.bandwidthGbMonthly,
      concurrent_deployments: plan.concurrentDeployments,
    };

    const withinLimits = 
      (usage.storage || 0) <= limits.storage &&
      (usage.deployment_hours || 0) <= limits.compute_hours &&
      (usage.bandwidth || 0) <= limits.bandwidth;

    return { withinLimits, limits, usage };
  }
}
