/**
 * Predictive Analytics Service
 * 
 * AI-powered predictive analytics for user behavior, churn prediction,
 * and upsell opportunities.
 */

import { Pool } from 'pg';

export interface ChurnPrediction {
  userId: number;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  contributingFactors: string[];
  recommendedActions: string[];
  confidence: number;
}

export interface UpsellOpportunity {
  userId: number;
  currentTier: string;
  suggestedTier: string;
  expectedRevenueLift: number;
  probability: number;
  reasoning: string[];
  optimalTimingDays: number;
}

export interface FraudDetectionResult {
  userId: number;
  fraudScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  anomalies: string[];
  blockedActions: string[];
  requiresReview: boolean;
}

export interface UserBehaviorPrediction {
  userId: number;
  predictedActions: Array<{
    action: string;
    probability: number;
    expectedDate: Date;
  }>;
  engagementScore: number;
  lifetimeValueEstimate: number;
}

export class PredictiveAnalyticsService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Predict user churn risk
   */
  async predictChurn(userId: number): Promise<ChurnPrediction> {
    try {
      // Get user activity data
      const userMetrics = await this.getUserMetrics(userId);
      
      // Calculate churn probability using multiple factors
      const factors = this.analyzeChurnFactors(userMetrics);
      const churnProbability = this.calculateChurnProbability(factors);
      
      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (churnProbability < 0.2) riskLevel = 'low';
      else if (churnProbability < 0.4) riskLevel = 'medium';
      else if (churnProbability < 0.7) riskLevel = 'high';
      else riskLevel = 'critical';

      // Generate recommended actions
      const recommendedActions = this.generateRetentionActions(factors, riskLevel);

      // Store prediction
      await this.pool.query(
        `INSERT INTO churn_predictions (user_id, probability, risk_level, factors, recommended_actions, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, churnProbability, riskLevel, JSON.stringify(factors.contributing), JSON.stringify(recommendedActions)]
      );

      return {
        userId,
        churnProbability,
        riskLevel,
        contributingFactors: factors.contributing,
        recommendedActions,
        confidence: factors.confidence,
      };
    } catch (error) {
      console.error('Churn prediction failed:', error);
      throw error;
    }
  }

  /**
   * Identify upsell opportunities
   */
  async identifyUpsellOpportunity(userId: number): Promise<UpsellOpportunity | null> {
    try {
      const userMetrics = await this.getUserMetrics(userId);
      
      // Check if user is a good candidate for upsell
      const upsellScore = this.calculateUpsellScore(userMetrics);
      
      if (upsellScore < 0.5) {
        return null; // Not a good candidate
      }

      // Determine optimal tier and timing
      const currentTier = userMetrics.subscription_tier || 'free';
      const suggestedTier = this.suggestNextTier(currentTier, userMetrics);
      const expectedRevenueLift = this.calculateRevenueLift(currentTier, suggestedTier);
      const reasoning = this.generateUpsellReasoning(userMetrics);
      
      // Calculate optimal timing (days from now)
      const optimalTimingDays = this.calculateOptimalTiming(userMetrics);

      const opportunity: UpsellOpportunity = {
        userId,
        currentTier,
        suggestedTier,
        expectedRevenueLift,
        probability: upsellScore,
        reasoning,
        optimalTimingDays,
      };

      // Store opportunity
      await this.pool.query(
        `INSERT INTO upsell_opportunities (user_id, current_tier, suggested_tier, probability, expected_revenue, optimal_timing_days, reasoning, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [userId, currentTier, suggestedTier, upsellScore, expectedRevenueLift, optimalTimingDays, JSON.stringify(reasoning)]
      );

      return opportunity;
    } catch (error) {
      console.error('Upsell opportunity identification failed:', error);
      throw error;
    }
  }

  /**
   * Detect fraudulent behavior
   */
  async detectFraud(userId: number, action: string, metadata: any): Promise<FraudDetectionResult> {
    try {
      const userHistory = await this.getUserHistory(userId);
      const anomalies: string[] = [];
      let fraudScore = 0;

      // Check for suspicious patterns
      if (this.isUnusualActivity(action, userHistory)) {
        anomalies.push('Unusual activity pattern detected');
        fraudScore += 0.3;
      }

      if (this.isRapidActionSequence(userHistory)) {
        anomalies.push('Rapid action sequence detected');
        fraudScore += 0.25;
      }

      if (this.isGeoLocationAnomaly(metadata, userHistory)) {
        anomalies.push('Geographic location anomaly');
        fraudScore += 0.2;
      }

      if (this.isDeviceFingerprintMismatch(metadata, userHistory)) {
        anomalies.push('Device fingerprint mismatch');
        fraudScore += 0.25;
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (fraudScore < 0.3) riskLevel = 'low';
      else if (fraudScore < 0.5) riskLevel = 'medium';
      else if (fraudScore < 0.75) riskLevel = 'high';
      else riskLevel = 'critical';

      const blockedActions = riskLevel === 'critical' ? ['payment', 'withdrawal'] : [];
      const requiresReview = riskLevel === 'high' || riskLevel === 'critical';

      // Log fraud detection event
      await this.pool.query(
        `INSERT INTO fraud_detection_events (user_id, action, fraud_score, risk_level, anomalies, requires_review, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [userId, action, fraudScore, riskLevel, JSON.stringify(anomalies), requiresReview]
      );

      return {
        userId,
        fraudScore,
        riskLevel,
        anomalies,
        blockedActions,
        requiresReview,
      };
    } catch (error) {
      console.error('Fraud detection failed:', error);
      throw error;
    }
  }

  /**
   * Predict user behavior patterns
   */
  async predictBehavior(userId: number): Promise<UserBehaviorPrediction> {
    try {
      const userMetrics = await this.getUserMetrics(userId);
      const userHistory = await this.getUserHistory(userId);

      // Predict likely actions
      const predictedActions = this.predictLikelyActions(userHistory);
      
      // Calculate engagement score (0-100)
      const engagementScore = this.calculateEngagementScore(userMetrics);
      
      // Estimate lifetime value
      const lifetimeValueEstimate = this.estimateLifetimeValue(userMetrics, predictedActions);

      return {
        userId,
        predictedActions,
        engagementScore,
        lifetimeValueEstimate,
      };
    } catch (error) {
      console.error('Behavior prediction failed:', error);
      throw error;
    }
  }

  /**
   * Automated subscription upgrade recommendations
   */
  async autoUpgradeRecommendation(userId: number): Promise<{
    shouldAutoUpgrade: boolean;
    confidence: number;
    reasoning: string[];
  }> {
    try {
      const userMetrics = await this.getUserMetrics(userId);
      
      // Check multiple criteria for auto-upgrade
      const criteria = {
        consistentUsage: userMetrics.days_active > 25,
        resourceLimitHits: userMetrics.resource_limit_hits > 10,
        storageUtilization: userMetrics.storage_used / userMetrics.storage_limit > 0.85,
        collaboratorCount: userMetrics.collaborator_count > 3,
        positiveEngagement: userMetrics.support_tickets === 0,
      };

      const metCriteria = Object.values(criteria).filter(v => v).length;
      const confidence = metCriteria / Object.keys(criteria).length;
      const shouldAutoUpgrade = confidence > 0.7;

      const reasoning = [];
      if (criteria.consistentUsage) reasoning.push('Consistent daily usage pattern');
      if (criteria.resourceLimitHits) reasoning.push('Frequently hitting resource limits');
      if (criteria.storageUtilization) reasoning.push('High storage utilization');
      if (criteria.collaboratorCount) reasoning.push('Active collaboration usage');
      if (criteria.positiveEngagement) reasoning.push('Positive user engagement');

      return {
        shouldAutoUpgrade,
        confidence,
        reasoning,
      };
    } catch (error) {
      console.error('Auto upgrade recommendation failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getUserMetrics(userId: number): Promise<any> {
    const result = await this.pool.query(
      `SELECT 
        u.id, u.email, u.created_at,
        s.tier as subscription_tier, s.status as subscription_status,
        COUNT(DISTINCT DATE(al.created_at)) as days_active,
        COUNT(al.id) as total_actions,
        MAX(al.created_at) as last_active,
        COALESCE(uc.credits, 0) as credits,
        0 as resource_limit_hits,
        0 as storage_used,
        1000000 as storage_limit,
        0 as collaborator_count,
        0 as support_tickets
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.user_id
       LEFT JOIN audit_logs al ON u.id = al.user_id
       LEFT JOIN user_credits uc ON u.id = uc.user_id
       WHERE u.id = $1
       GROUP BY u.id, u.email, u.created_at, s.tier, s.status, uc.credits`,
      [userId]
    );
    return result.rows[0] || {};
  }

  private async getUserHistory(userId: number): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT action, resource_type, metadata, ip_address, created_at
       FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );
    return result.rows;
  }

  private analyzeChurnFactors(metrics: any): { contributing: string[]; confidence: number } {
    const factors = [];
    let confidence = 0.85;

    const daysSinceLastActive = metrics.last_active 
      ? Math.floor((Date.now() - new Date(metrics.last_active).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastActive > 14) factors.push('No activity in 14+ days');
    if (metrics.days_active < 5) factors.push('Low engagement (< 5 active days)');
    if (metrics.credits < 10) factors.push('Low credit balance');
    if (metrics.subscription_status === 'trial') factors.push('Trial subscription');
    if (!metrics.subscription_tier || metrics.subscription_tier === 'free') factors.push('Free tier user');

    return { contributing: factors, confidence };
  }

  private calculateChurnProbability(factors: { contributing: string[] }): number {
    const baseRate = 0.15;
    const factorWeight = 0.12;
    return Math.min(0.95, baseRate + (factors.contributing.length * factorWeight));
  }

  private generateRetentionActions(factors: any, riskLevel: string): string[] {
    const actions = [];
    
    if (riskLevel === 'critical' || riskLevel === 'high') {
      actions.push('Send personalized re-engagement email');
      actions.push('Offer 20% discount on next billing cycle');
      actions.push('Schedule customer success call');
    }
    
    if (factors.contributing.includes('Low credit balance')) {
      actions.push('Offer bonus credits');
    }
    
    if (factors.contributing.includes('Free tier user')) {
      actions.push('Highlight premium features they would benefit from');
    }

    actions.push('Request feedback survey');
    
    return actions;
  }

  private calculateUpsellScore(metrics: any): number {
    let score = 0;
    
    if (metrics.days_active > 20) score += 0.3;
    if (metrics.resource_limit_hits > 5) score += 0.25;
    if (metrics.collaborator_count > 2) score += 0.2;
    if (metrics.storage_used / metrics.storage_limit > 0.75) score += 0.15;
    if (metrics.subscription_status === 'active') score += 0.1;
    
    return Math.min(1, score);
  }

  private suggestNextTier(currentTier: string, metrics: any): string {
    if (currentTier === 'free') return 'pro';
    if (currentTier === 'pro' && metrics.collaborator_count > 5) return 'team';
    if (currentTier === 'team' && metrics.resource_limit_hits > 20) return 'enterprise';
    return currentTier;
  }

  private calculateRevenueLift(currentTier: string, suggestedTier: string): number {
    const pricing: any = { free: 0, pro: 20, team: 50, enterprise: 200 };
    return pricing[suggestedTier] - pricing[currentTier];
  }

  private generateUpsellReasoning(metrics: any): string[] {
    const reasons = [];
    
    if (metrics.resource_limit_hits > 5) {
      reasons.push('Frequently hitting resource limits');
    }
    if (metrics.collaborator_count > 2) {
      reasons.push('Active team collaboration');
    }
    if (metrics.days_active > 20) {
      reasons.push('High engagement and consistent usage');
    }
    
    return reasons;
  }

  private calculateOptimalTiming(metrics: any): number {
    // Suggest upgrade after 7-14 days of high engagement
    if (metrics.days_active > 25) return 3;
    if (metrics.days_active > 15) return 7;
    return 14;
  }

  private isUnusualActivity(action: string, history: any[]): boolean {
    const recentActions = history.slice(0, 20);
    const actionFrequency = recentActions.filter(h => h.action === action).length;
    return actionFrequency < 2; // Action is unusual if rarely performed
  }

  private isRapidActionSequence(history: any[]): boolean {
    if (history.length < 5) return false;
    const recent = history.slice(0, 5);
    const timeSpan = new Date(recent[0].created_at).getTime() - new Date(recent[4].created_at).getTime();
    return timeSpan < 5000; // 5 actions in less than 5 seconds
  }

  private isGeoLocationAnomaly(metadata: any, history: any[]): boolean {
    // Simplified: would check if IP location differs significantly from normal pattern
    return false;
  }

  private isDeviceFingerprintMismatch(metadata: any, history: any[]): boolean {
    // Simplified: would check device fingerprint consistency
    return false;
  }

  private predictLikelyActions(history: any[]): Array<{ action: string; probability: number; expectedDate: Date }> {
    // Analyze patterns and predict likely future actions
    const actionCounts: any = {};
    history.forEach(h => {
      actionCounts[h.action] = (actionCounts[h.action] || 0) + 1;
    });

    const predictions = Object.entries(actionCounts)
      .map(([action, count]: [string, any]) => ({
        action,
        probability: Math.min(0.95, count / history.length + 0.2),
        expectedDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Within next 7 days
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);

    return predictions;
  }

  private calculateEngagementScore(metrics: any): number {
    let score = 0;
    
    score += Math.min(40, metrics.days_active * 2); // Max 40 points
    score += Math.min(30, metrics.total_actions / 10); // Max 30 points
    score += metrics.subscription_tier === 'enterprise' ? 20 : metrics.subscription_tier === 'team' ? 15 : metrics.subscription_tier === 'pro' ? 10 : 5;
    score += Math.min(10, metrics.collaborator_count * 2); // Max 10 points
    
    return Math.min(100, score);
  }

  private estimateLifetimeValue(metrics: any, predictedActions: any[]): number {
    const pricing: any = { free: 0, pro: 20, team: 50, enterprise: 200 };
    const currentMonthlyValue = pricing[metrics.subscription_tier] || 0;
    const engagementMultiplier = metrics.days_active > 20 ? 24 : metrics.days_active > 10 ? 12 : 6; // months
    
    return currentMonthlyValue * engagementMultiplier;
  }
}

export default PredictiveAnalyticsService;
