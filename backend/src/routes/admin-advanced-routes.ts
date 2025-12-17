/**
 * Advanced Admin Routes
 * 
 * Routes for AI-powered analytics, blockchain, gamification, real-time analytics,
 * accessibility, and infrastructure management.
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAdmin, requireSuperAdmin, logAdminAction } from '../middleware/admin-auth';
import PredictiveAnalyticsService from '../services/ai-agents/predictive-analytics-service';
import GamificationService from '../services/ai-agents/gamification-service';
import BlockchainService from '../services/ai-agents/blockchain-service';
import RealtimeAnalyticsService from '../services/ai-agents/realtime-analytics-service';
import AccessibilityService from '../services/ai-agents/accessibility-service';
import InfrastructureService from '../services/ai-agents/infrastructure-service';

export function createAdminAdvancedRoutes(pool: Pool) {
  const router = Router();

  // Initialize services
  const predictiveService = new PredictiveAnalyticsService(pool);
  const gamificationService = new GamificationService(pool);
  const blockchainService = new BlockchainService(pool);
  const analyticsService = new RealtimeAnalyticsService(pool);
  const accessibilityService = new AccessibilityService(pool);
  const infrastructureService = new InfrastructureService(pool);

  // Start real-time services
  analyticsService.start();
  infrastructureService.start();

  // Apply admin authentication to all routes
  router.use(requireAdmin);
  router.use(logAdminAction(pool));

  // ============================================================================
  // AI & PREDICTIVE ANALYTICS ROUTES
  // ============================================================================

  /**
   * POST /api/admin/advanced/ai/predict-churn/:userId
   * Predict user churn risk
   */
  router.post('/ai/predict-churn/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const prediction = await predictiveService.predictChurn(userId);
      res.json(prediction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/ai/identify-upsell/:userId
   * Identify upsell opportunities
   */
  router.post('/ai/identify-upsell/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const opportunity = await predictiveService.identifyUpsellOpportunity(userId);
      res.json(opportunity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/ai/detect-fraud/:userId
   * Detect fraudulent behavior
   */
  router.post('/ai/detect-fraud/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { action, metadata } = req.body;
      const result = await predictiveService.detectFraud(userId, action, metadata);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/ai/behavior-prediction/:userId
   * Predict user behavior patterns
   */
  router.get('/ai/behavior-prediction/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const prediction = await predictiveService.predictBehavior(userId);
      res.json(prediction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/ai/auto-upgrade-recommendation/:userId
   * Get automated upgrade recommendation
   */
  router.get('/ai/auto-upgrade-recommendation/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const recommendation = await predictiveService.autoUpgradeRecommendation(userId);
      res.json(recommendation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // GAMIFICATION ROUTES
  // ============================================================================

  /**
   * GET /api/admin/advanced/gamification/leaderboard
   * Get gamification leaderboard
   */
  router.get('/gamification/leaderboard', async (req: Request, res: Response) => {
    try {
      const { category = 'overall', timeframe = 'monthly', limit = '100' } = req.query;
      const leaderboard = await gamificationService.getLeaderboard(
        category as any,
        timeframe as any,
        parseInt(limit as string)
      );
      res.json(leaderboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/gamification/affiliate-stats/:userId
   * Get affiliate gamification stats
   */
  router.get('/gamification/affiliate-stats/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const stats = await gamificationService.getAffiliateStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/gamification/award-achievement/:userId
   * Manually award achievement
   */
  router.post('/gamification/award-achievement/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { action, metadata } = req.body;
      const achievements = await gamificationService.checkAndAwardAchievements(userId, action, metadata);
      res.json({ awarded: achievements });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/gamification/award-milestone/:userId/:milestoneId
   * Award milestone reward
   */
  router.post('/gamification/award-milestone/:userId/:milestoneId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { milestoneId } = req.params;
      const milestone = await gamificationService.awardMilestone(userId, milestoneId);
      res.json(milestone);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/gamification/commission-suggestions/:affiliateId
   * Get AI-driven commission structure suggestions
   */
  router.get('/gamification/commission-suggestions/:affiliateId', async (req: Request, res: Response) => {
    try {
      const affiliateId = parseInt(req.params.affiliateId);
      const suggestions = await gamificationService.getCommissionSuggestions(affiliateId);
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // BLOCKCHAIN & WEB3 ROUTES
  // ============================================================================

  /**
   * POST /api/admin/advanced/blockchain/process-crypto-payment
   * Process cryptocurrency payment
   */
  router.post('/blockchain/process-crypto-payment', async (req: Request, res: Response) => {
    try {
      const { userId, amount, cryptocurrency, walletAddress } = req.body;
      const payment = await blockchainService.processCryptoPayment(
        userId,
        amount,
        cryptocurrency,
        walletAddress
      );
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/blockchain/payment-status/:paymentId
   * Check crypto payment status
   */
  router.get('/blockchain/payment-status/:paymentId', async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const status = await blockchainService.checkPaymentStatus(paymentId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/blockchain/mint-nft
   * Mint NFT reward for achievement
   */
  router.post('/blockchain/mint-nft', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, achievementId, achievementData } = req.body;
      const nft = await blockchainService.mintNFTReward(userId, achievementId, achievementData);
      res.json(nft);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/blockchain/user-nfts/:userId
   * Get user's NFT collection
   */
  router.get('/blockchain/user-nfts/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const nfts = await blockchainService.getUserNFTs(userId);
      res.json(nfts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/blockchain/audit-log
   * Create immutable blockchain audit log
   */
  router.post('/blockchain/audit-log', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { action, resourceType, resourceId, metadata } = req.body;
      const adminId = req.user!.id;
      const log = await blockchainService.createBlockchainAuditLog(
        action,
        adminId,
        resourceType,
        resourceId,
        metadata
      );
      res.json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/blockchain/verify-audit-log/:logId
   * Verify audit log integrity
   */
  router.get('/blockchain/verify-audit-log/:logId', async (req: Request, res: Response) => {
    try {
      const { logId } = req.params;
      const verification = await blockchainService.verifyAuditLog(logId);
      res.json(verification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/blockchain/supported-cryptocurrencies
   * Get supported cryptocurrencies
   */
  router.get('/blockchain/supported-cryptocurrencies', async (req: Request, res: Response) => {
    try {
      const cryptos = await blockchainService.getSupportedCryptocurrencies();
      res.json(cryptos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // REAL-TIME ANALYTICS ROUTES
  // ============================================================================

  /**
   * GET /api/admin/advanced/analytics/global-activity-map
   * Get global real-time activity map
   */
  router.get('/analytics/global-activity-map', async (req: Request, res: Response) => {
    try {
      const { timeWindow = '300' } = req.query;
      const map = await analyticsService.getGlobalActivityMap(parseInt(timeWindow as string));
      res.json(map);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/analytics/create-dashboard
   * Create custom dashboard
   */
  router.post('/analytics/create-dashboard', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { name, widgets, layout } = req.body;
      const dashboard = await analyticsService.createDashboard(userId, name, widgets, layout);
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/analytics/dashboards
   * Get user's dashboards
   */
  router.get('/analytics/dashboards', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const dashboards = await analyticsService.getUserDashboards(userId);
      res.json(dashboards);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/admin/advanced/analytics/update-dashboard/:dashboardId
   * Update dashboard
   */
  router.put('/analytics/update-dashboard/:dashboardId', async (req: Request, res: Response) => {
    try {
      const { dashboardId } = req.params;
      const userId = req.user!.id;
      const updates = req.body;
      const dashboard = await analyticsService.updateDashboard(dashboardId, userId, updates);
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/analytics/simulate-revenue-impact
   * Simulate revenue impact of changes
   */
  router.post('/analytics/simulate-revenue-impact', async (req: Request, res: Response) => {
    try {
      const { changes } = req.body;
      const simulation = await analyticsService.simulateRevenueImpact(changes);
      res.json(simulation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/analytics/realtime-metrics
   * Get real-time metrics
   */
  router.get('/analytics/realtime-metrics', async (req: Request, res: Response) => {
    try {
      const metrics = await analyticsService.getRealTimeMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ACCESSIBILITY ROUTES
  // ============================================================================

  /**
   * POST /api/admin/advanced/accessibility/translate
   * Translate text in real-time
   */
  router.post('/accessibility/translate', async (req: Request, res: Response) => {
    try {
      const request = req.body;
      const translation = await accessibilityService.translateText(request);
      res.json(translation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/accessibility/voice-command
   * Process voice command
   */
  router.post('/accessibility/voice-command', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { audioInput, context } = req.body;
      const result = await accessibilityService.processVoiceCommand(userId, audioInput, context);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/accessibility/check-compliance
   * Check accessibility compliance
   */
  router.post('/accessibility/check-compliance', async (req: Request, res: Response) => {
    try {
      const { url, targetLevel = 'AA' } = req.body;
      const report = await accessibilityService.checkAccessibilityCompliance(url, targetLevel);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/accessibility/language-preferences
   * Get user language preferences
   */
  router.get('/accessibility/language-preferences', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const preferences = await accessibilityService.getUserLanguagePreferences(userId);
      res.json(preferences);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/admin/advanced/accessibility/language-preferences
   * Update language preferences
   */
  router.put('/accessibility/language-preferences', async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const preferences = req.body;
      const updated = await accessibilityService.updateLanguagePreferences(userId, preferences);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/accessibility/supported-languages
   * Get supported languages
   */
  router.get('/accessibility/supported-languages', async (req: Request, res: Response) => {
    try {
      const languages = accessibilityService.getSupportedLanguages();
      res.json(languages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/accessibility/voice-commands
   * Get available voice commands
   */
  router.get('/accessibility/voice-commands', async (req: Request, res: Response) => {
    try {
      const commands = accessibilityService.getAvailableVoiceCommands();
      res.json(commands);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // INFRASTRUCTURE ROUTES
  // ============================================================================

  /**
   * GET /api/admin/advanced/infrastructure/health
   * Get infrastructure health
   */
  router.get('/infrastructure/health', async (req: Request, res: Response) => {
    try {
      const health = await infrastructureService.getInfrastructureHealth();
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/infrastructure/k8s-health
   * Get Kubernetes cluster health
   */
  router.get('/infrastructure/k8s-health', async (req: Request, res: Response) => {
    try {
      const { clusterName = 'production' } = req.query;
      const health = await infrastructureService.getK8sClusterHealth(clusterName as string);
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/advanced/infrastructure/trigger-recovery
   * Trigger automated recovery
   */
  router.post('/infrastructure/trigger-recovery', requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { incident, severity } = req.body;
      const recovery = await infrastructureService.triggerAutoRecovery(incident, severity);
      res.json(recovery);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/infrastructure/optimize-cdn
   * Get CDN optimization suggestions
   */
  router.get('/infrastructure/optimize-cdn', async (req: Request, res: Response) => {
    try {
      const { provider = 'cloudflare' } = req.query;
      const optimization = await infrastructureService.optimizeCDN(provider as string);
      res.json(optimization);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/admin/advanced/infrastructure/recovery-history
   * Get recovery history
   */
  router.get('/infrastructure/recovery-history', async (req: Request, res: Response) => {
    try {
      const { limit = '50' } = req.query;
      const history = await infrastructureService.getRecoveryHistory(parseInt(limit as string));
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    analyticsService.stop();
    infrastructureService.stop();
  });

  return router;
}

export default createAdminAdvancedRoutes;
