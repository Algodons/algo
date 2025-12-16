/**
 * Gamification Service
 * 
 * Manages leaderboards, achievements, milestone rewards, and gamified
 * experiences for affiliates and users.
 */

import { Pool } from 'pg';

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  score: number;
  tier: string;
  badges: string[];
  streak: number;
  recentAchievements: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'referral' | 'engagement' | 'milestone' | 'special';
  points: number;
  iconUrl: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  requirements: any;
  unlockedAt?: Date;
}

export interface MilestoneReward {
  id: string;
  milestone: string;
  type: 'credit' | 'discount' | 'feature_unlock' | 'badge' | 'nft';
  value: number;
  description: string;
  claimed: boolean;
}

export interface AffiliateStats {
  userId: number;
  totalReferrals: number;
  activeReferrals: number;
  totalRevenue: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  nextLevelProgress: number;
  badges: string[];
  achievements: Achievement[];
  milestones: MilestoneReward[];
}

export class GamificationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get real-time leaderboard
   */
  async getLeaderboard(
    category: 'referrals' | 'revenue' | 'engagement' | 'overall' = 'overall',
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'monthly',
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    try {
      const timeFilter = this.getTimeframeFilter(timeframe);
      
      let scoreColumn = 'overall_score';
      if (category === 'referrals') scoreColumn = 'referral_score';
      else if (category === 'revenue') scoreColumn = 'revenue_score';
      else if (category === 'engagement') scoreColumn = 'engagement_score';

      const result = await this.pool.query(
        `WITH ranked_users AS (
          SELECT 
            u.id, u.name as username, u.avatar_url,
            COALESCE(gs.${scoreColumn}, 0) as score,
            COALESCE(gs.tier, 'bronze') as tier,
            COALESCE(gs.current_streak, 0) as streak,
            COALESCE(gs.badges, '[]'::jsonb) as badges,
            ROW_NUMBER() OVER (ORDER BY COALESCE(gs.${scoreColumn}, 0) DESC) as rank
          FROM users u
          LEFT JOIN gamification_stats gs ON u.id = gs.user_id
          WHERE u.role IN ('user', 'affiliate')
            ${timeFilter}
          ORDER BY score DESC
          LIMIT $1
        )
        SELECT * FROM ranked_users`,
        [limit]
      );

      // Get recent achievements for each user
      const leaderboard: LeaderboardEntry[] = await Promise.all(
        result.rows.map(async (row) => {
          const achievements = await this.getRecentAchievements(row.id, 3);
          
          return {
            rank: row.rank,
            userId: row.id,
            username: row.username,
            avatarUrl: row.avatar_url,
            score: parseFloat(row.score),
            tier: row.tier,
            badges: JSON.parse(row.badges || '[]'),
            streak: row.streak,
            recentAchievements: achievements.map(a => a.name),
          };
        })
      );

      return leaderboard;
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      throw error;
    }
  }

  /**
   * Track and award achievement
   */
  async checkAndAwardAchievements(userId: number, action: string, metadata: any): Promise<Achievement[]> {
    try {
      const newAchievements: Achievement[] = [];
      const allAchievements = this.getAllAchievementDefinitions();

      for (const achievement of allAchievements) {
        // Check if already unlocked
        const existing = await this.pool.query(
          'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
          [userId, achievement.id]
        );

        if (existing.rows.length === 0) {
          // Check if requirements are met
          if (await this.checkAchievementRequirements(userId, achievement, action, metadata)) {
            // Award achievement
            await this.pool.query(
              `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
               VALUES ($1, $2, NOW())`,
              [userId, achievement.id]
            );

            // Add points to user
            await this.addPoints(userId, achievement.points, `Achievement: ${achievement.name}`);

            achievement.unlockedAt = new Date();
            newAchievements.push(achievement);

            // Emit achievement event (for notifications)
            await this.emitAchievementEvent(userId, achievement);
          }
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Failed to check achievements:', error);
      throw error;
    }
  }

  /**
   * Get affiliate statistics with gamification
   */
  async getAffiliateStats(userId: number): Promise<AffiliateStats> {
    try {
      const statsResult = await this.pool.query(
        `SELECT 
          COUNT(r.id) as total_referrals,
          COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_referrals,
          COALESCE(SUM(ap.amount), 0) as total_revenue,
          COALESCE(gs.current_streak, 0) as current_streak,
          COALESCE(gs.longest_streak, 0) as longest_streak,
          COALESCE(gs.level, 1) as level,
          COALESCE(gs.experience_points, 0) as experience_points,
          COALESCE(gs.badges, '[]'::jsonb) as badges
         FROM affiliates a
         LEFT JOIN referrals r ON a.user_id = r.affiliate_id
         LEFT JOIN subscriptions s ON r.referred_user_id = s.user_id
         LEFT JOIN affiliate_payouts ap ON a.id = ap.affiliate_id AND ap.status = 'completed'
         LEFT JOIN gamification_stats gs ON a.user_id = gs.user_id
         WHERE a.user_id = $1
         GROUP BY a.user_id, gs.current_streak, gs.longest_streak, gs.level, gs.experience_points, gs.badges`,
        [userId]
      );

      const stats = statsResult.rows[0] || {
        total_referrals: 0,
        active_referrals: 0,
        total_revenue: 0,
        current_streak: 0,
        longest_streak: 0,
        level: 1,
        experience_points: 0,
        badges: '[]',
      };

      // Calculate next level progress
      const currentLevelXP = this.getXPForLevel(stats.level);
      const nextLevelXP = this.getXPForLevel(stats.level + 1);
      const nextLevelProgress = ((stats.experience_points - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

      // Get achievements
      const achievements = await this.getUserAchievements(userId);

      // Get milestones
      const milestones = await this.getAvailableMilestones(userId);

      return {
        userId,
        totalReferrals: parseInt(stats.total_referrals),
        activeReferrals: parseInt(stats.active_referrals),
        totalRevenue: parseFloat(stats.total_revenue),
        currentStreak: stats.current_streak,
        longestStreak: stats.longest_streak,
        level: stats.level,
        nextLevelProgress: Math.min(100, nextLevelProgress),
        badges: JSON.parse(stats.badges),
        achievements,
        milestones,
      };
    } catch (error) {
      console.error('Failed to get affiliate stats:', error);
      throw error;
    }
  }

  /**
   * Award milestone reward
   */
  async awardMilestone(userId: number, milestoneId: string): Promise<MilestoneReward> {
    try {
      const milestone = await this.pool.query(
        'SELECT * FROM milestone_definitions WHERE id = $1',
        [milestoneId]
      );

      if (milestone.rows.length === 0) {
        throw new Error('Milestone not found');
      }

      const milestoneData = milestone.rows[0];

      // Check if already claimed
      const existing = await this.pool.query(
        'SELECT id FROM user_milestones WHERE user_id = $1 AND milestone_id = $2',
        [userId, milestoneId]
      );

      if (existing.rows.length > 0) {
        throw new Error('Milestone already claimed');
      }

      // Check if requirements are met
      if (!await this.checkMilestoneRequirements(userId, milestoneData)) {
        throw new Error('Milestone requirements not met');
      }

      // Award milestone
      await this.pool.query(
        `INSERT INTO user_milestones (user_id, milestone_id, claimed_at)
         VALUES ($1, $2, NOW())`,
        [userId, milestoneId]
      );

      // Grant reward
      await this.grantMilestoneReward(userId, milestoneData);

      return {
        id: milestoneId,
        milestone: milestoneData.name,
        type: milestoneData.reward_type,
        value: milestoneData.reward_value,
        description: milestoneData.description,
        claimed: true,
      };
    } catch (error) {
      console.error('Failed to award milestone:', error);
      throw error;
    }
  }

  /**
   * Update daily streak
   */
  async updateStreak(userId: number): Promise<{ currentStreak: number; bonusAwarded: boolean }> {
    try {
      const lastActivity = await this.pool.query(
        'SELECT last_activity_date, current_streak FROM gamification_stats WHERE user_id = $1',
        [userId]
      );

      const today = new Date().toISOString().split('T')[0];
      let currentStreak = 1;
      let bonusAwarded = false;

      if (lastActivity.rows.length > 0) {
        const lastDate = lastActivity.rows[0].last_activity_date;
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        if (lastDate === yesterday) {
          currentStreak = lastActivity.rows[0].current_streak + 1;
        } else if (lastDate !== today) {
          currentStreak = 1; // Streak broken
        } else {
          // Already updated today
          return { currentStreak: lastActivity.rows[0].current_streak, bonusAwarded: false };
        }
      }

      // Update streak
      await this.pool.query(
        `INSERT INTO gamification_stats (user_id, current_streak, longest_streak, last_activity_date)
         VALUES ($1, $2, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET
           current_streak = $2,
           longest_streak = GREATEST(gamification_stats.longest_streak, $2),
           last_activity_date = $3`,
        [userId, currentStreak, today]
      );

      // Award streak bonus at milestones
      if (currentStreak % 7 === 0) {
        await this.addPoints(userId, currentStreak * 10, `${currentStreak}-day streak bonus`);
        bonusAwarded = true;
      }

      return { currentStreak, bonusAwarded };
    } catch (error) {
      console.error('Failed to update streak:', error);
      throw error;
    }
  }

  /**
   * Get AI-driven commission structure suggestions
   */
  async getCommissionSuggestions(affiliateId: number): Promise<{
    currentStructure: any;
    suggestedStructure: any;
    reasoning: string[];
    expectedImpact: string;
  }> {
    try {
      // Get affiliate performance data
      const performance = await this.pool.query(
        `SELECT 
          COUNT(r.id) as total_referrals,
          COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_referrals,
          AVG(s.mrr) as avg_revenue_per_referral,
          COUNT(CASE WHEN r.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_referrals
         FROM affiliates a
         LEFT JOIN referrals r ON a.id = r.affiliate_id
         LEFT JOIN subscriptions s ON r.referred_user_id = s.user_id
         WHERE a.user_id = $1
         GROUP BY a.id`,
        [affiliateId]
      );

      const data = performance.rows[0] || {};
      
      // Get current commission structure
      const current = await this.pool.query(
        'SELECT commission_structure FROM affiliates WHERE user_id = $1',
        [affiliateId]
      );

      const currentStructure = current.rows[0]?.commission_structure || { rate: 0.1, type: 'percentage' };

      // AI-driven suggestions based on performance
      const reasoning = [];
      let suggestedRate = currentStructure.rate;

      if (data.total_referrals > 50) {
        suggestedRate = Math.min(0.25, suggestedRate + 0.05);
        reasoning.push('High referral volume warrants increased commission');
      }

      if (data.active_referrals / (data.total_referrals || 1) > 0.8) {
        suggestedRate = Math.min(0.3, suggestedRate + 0.03);
        reasoning.push('Excellent retention rate among referrals');
      }

      if (data.avg_revenue_per_referral > 50) {
        reasoning.push('High-value referrals justify premium commission tier');
      }

      if (data.recent_referrals > 10) {
        reasoning.push('Strong recent performance shows sustained effort');
      }

      const suggestedStructure = {
        ...currentStructure,
        rate: suggestedRate,
        bonuses: {
          volume_bonus: data.total_referrals > 100 ? 0.05 : 0,
          retention_bonus: data.active_referrals > 50 ? 0.03 : 0,
        },
      };

      const expectedImpact = `Estimated ${((suggestedRate - currentStructure.rate) * 100).toFixed(1)}% increase in affiliate earnings`;

      return {
        currentStructure,
        suggestedStructure,
        reasoning,
        expectedImpact,
      };
    } catch (error) {
      console.error('Failed to generate commission suggestions:', error);
      throw error;
    }
  }

  // Private helper methods

  private getTimeframeFilter(timeframe: string): string {
    switch (timeframe) {
      case 'daily':
        return "AND gs.updated_at > NOW() - INTERVAL '1 day'";
      case 'weekly':
        return "AND gs.updated_at > NOW() - INTERVAL '7 days'";
      case 'monthly':
        return "AND gs.updated_at > NOW() - INTERVAL '30 days'";
      default:
        return '';
    }
  }

  private async getRecentAchievements(userId: number, limit: number): Promise<Achievement[]> {
    const result = await this.pool.query(
      `SELECT ad.* FROM user_achievements ua
       JOIN achievement_definitions ad ON ua.achievement_id = ad.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      points: row.points,
      iconUrl: row.icon_url,
      rarity: row.rarity,
      requirements: row.requirements,
    }));
  }

  private getAllAchievementDefinitions(): Achievement[] {
    return [
      {
        id: 'first_referral',
        name: 'First Blood',
        description: 'Make your first referral',
        category: 'referral',
        points: 100,
        iconUrl: '/badges/first_referral.png',
        rarity: 'common',
        requirements: { referrals: 1 },
      },
      {
        id: 'ten_referrals',
        name: 'Rising Star',
        description: 'Successfully refer 10 users',
        category: 'referral',
        points: 500,
        iconUrl: '/badges/ten_referrals.png',
        rarity: 'uncommon',
        requirements: { referrals: 10 },
      },
      {
        id: 'hundred_referrals',
        name: 'Influencer',
        description: 'Reach 100 referrals',
        category: 'referral',
        points: 5000,
        iconUrl: '/badges/hundred_referrals.png',
        rarity: 'epic',
        requirements: { referrals: 100 },
      },
      {
        id: 'week_streak',
        name: 'Dedicated',
        description: 'Maintain a 7-day streak',
        category: 'engagement',
        points: 250,
        iconUrl: '/badges/week_streak.png',
        rarity: 'uncommon',
        requirements: { streak: 7 },
      },
      {
        id: 'month_streak',
        name: 'Committed',
        description: 'Maintain a 30-day streak',
        category: 'engagement',
        points: 1000,
        iconUrl: '/badges/month_streak.png',
        rarity: 'rare',
        requirements: { streak: 30 },
      },
      {
        id: 'revenue_1k',
        name: 'Sales Champion',
        description: 'Generate $1,000 in referral revenue',
        category: 'sales',
        points: 2000,
        iconUrl: '/badges/revenue_1k.png',
        rarity: 'rare',
        requirements: { revenue: 1000 },
      },
      {
        id: 'revenue_10k',
        name: 'Sales Legend',
        description: 'Generate $10,000 in referral revenue',
        category: 'sales',
        points: 10000,
        iconUrl: '/badges/revenue_10k.png',
        rarity: 'legendary',
        requirements: { revenue: 10000 },
      },
    ];
  }

  private async checkAchievementRequirements(
    userId: number,
    achievement: Achievement,
    action: string,
    metadata: any
  ): Promise<boolean> {
    const req = achievement.requirements;

    if (req.referrals) {
      const result = await this.pool.query(
        'SELECT COUNT(*) as count FROM referrals WHERE affiliate_id = (SELECT id FROM affiliates WHERE user_id = $1)',
        [userId]
      );
      return parseInt(result.rows[0].count) >= req.referrals;
    }

    if (req.streak) {
      const result = await this.pool.query(
        'SELECT current_streak FROM gamification_stats WHERE user_id = $1',
        [userId]
      );
      return result.rows[0]?.current_streak >= req.streak;
    }

    if (req.revenue) {
      const result = await this.pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM affiliate_payouts
         WHERE affiliate_id = (SELECT id FROM affiliates WHERE user_id = $1) AND status = 'completed'`,
        [userId]
      );
      return parseFloat(result.rows[0].total) >= req.revenue;
    }

    return false;
  }

  private async addPoints(userId: number, points: number, reason: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO gamification_stats (user_id, experience_points)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET
         experience_points = gamification_stats.experience_points + $2`,
      [userId, points]
    );

    // Check for level up
    await this.checkLevelUp(userId);
  }

  private async checkLevelUp(userId: number): Promise<void> {
    const result = await this.pool.query(
      'SELECT level, experience_points FROM gamification_stats WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) return;

    const { level, experience_points } = result.rows[0];
    const requiredXP = this.getXPForLevel(level + 1);

    if (experience_points >= requiredXP) {
      await this.pool.query(
        'UPDATE gamification_stats SET level = level + 1 WHERE user_id = $1',
        [userId]
      );

      // Award level-up bonus
      await this.emitLevelUpEvent(userId, level + 1);
    }
  }

  private getXPForLevel(level: number): number {
    // Exponential XP curve
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  private async emitAchievementEvent(userId: number, achievement: Achievement): Promise<void> {
    // Emit event for real-time notifications
    await this.pool.query(
      `INSERT INTO notification_events (user_id, type, title, message, metadata, created_at)
       VALUES ($1, 'achievement', $2, $3, $4, NOW())`,
      [
        userId,
        'Achievement Unlocked!',
        `You've earned the "${achievement.name}" achievement!`,
        JSON.stringify({ achievementId: achievement.id, points: achievement.points }),
      ]
    );
  }

  private async emitLevelUpEvent(userId: number, newLevel: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO notification_events (user_id, type, title, message, metadata, created_at)
       VALUES ($1, 'level_up', $2, $3, $4, NOW())`,
      [userId, 'Level Up!', `Congratulations! You've reached level ${newLevel}!`, JSON.stringify({ level: newLevel })]
    );
  }

  private async getUserAchievements(userId: number): Promise<Achievement[]> {
    const result = await this.pool.query(
      `SELECT ad.*, ua.unlocked_at
       FROM user_achievements ua
       JOIN achievement_definitions ad ON ua.achievement_id = ad.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      points: row.points,
      iconUrl: row.icon_url,
      rarity: row.rarity,
      requirements: row.requirements,
      unlockedAt: row.unlocked_at,
    }));
  }

  private async getAvailableMilestones(userId: number): Promise<MilestoneReward[]> {
    const result = await this.pool.query(
      `SELECT md.*, um.claimed_at IS NOT NULL as claimed
       FROM milestone_definitions md
       LEFT JOIN user_milestones um ON md.id = um.milestone_id AND um.user_id = $1
       ORDER BY md.required_value ASC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      milestone: row.name,
      type: row.reward_type,
      value: row.reward_value,
      description: row.description,
      claimed: row.claimed,
    }));
  }

  private async checkMilestoneRequirements(userId: number, milestone: any): Promise<boolean> {
    // Check if user meets milestone requirements
    const stats = await this.getAffiliateStats(userId);
    
    switch (milestone.metric) {
      case 'referrals':
        return stats.totalReferrals >= milestone.required_value;
      case 'revenue':
        return stats.totalRevenue >= milestone.required_value;
      case 'level':
        return stats.level >= milestone.required_value;
      default:
        return false;
    }
  }

  private async grantMilestoneReward(userId: number, milestone: any): Promise<void> {
    switch (milestone.reward_type) {
      case 'credit':
        await this.pool.query(
          `INSERT INTO credit_transactions (user_id, amount, type, description, created_at)
           VALUES ($1, $2, 'reward', $3, NOW())`,
          [userId, milestone.reward_value, `Milestone: ${milestone.name}`]
        );
        break;
      case 'badge':
        await this.pool.query(
          `UPDATE gamification_stats
           SET badges = badges || $2::jsonb
           WHERE user_id = $1`,
          [userId, JSON.stringify([milestone.reward_value])]
        );
        break;
      case 'feature_unlock':
        // Unlock premium feature
        await this.pool.query(
          `INSERT INTO feature_unlocks (user_id, feature_id, unlocked_at)
           VALUES ($1, $2, NOW())`,
          [userId, milestone.reward_value]
        );
        break;
    }
  }
}

export default GamificationService;
