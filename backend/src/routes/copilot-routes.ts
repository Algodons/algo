/**
 * Copilot API Routes
 * Endpoints for Copilot SaaS functionality testing
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { getCopilotService } from '../services/copilot-service';
import { Pool } from 'pg';
import { authenticate } from '../middleware/auth';

// Rate limiter for Copilot endpoints to prevent abuse
const copilotRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs for Copilot endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many Copilot API requests, please try again later.',
});

export function createCopilotRoutes(pool: Pool): Router {
  const router = Router();
  const copilotService = getCopilotService();

  /**
   * GET /api/copilot/status
   * Get Copilot service status
   */
  router.get('/status', (req: Request, res: Response) => {
    const status = copilotService.getStatus();
    res.json({
      success: true,
      data: status,
    });
  });

  /**
   * GET /api/copilot/health
   * Check Copilot service health
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const isHealthy = await copilotService.healthCheck();
      res.json({
        success: true,
        healthy: isHealthy,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        healthy: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/copilot/complete
   * Get code completion from Copilot
   */
  router.post(
    '/complete',
    copilotRateLimiter,
    authenticate(pool),
    [
      body('prompt').notEmpty().withMessage('Prompt is required'),
      body('context').optional().isObject(),
      body('parameters').optional().isObject(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { prompt, context, parameters } = req.body;

      try {
        const result = await copilotService.complete({
          prompt,
          context,
          parameters,
        });

        if (!result.success) {
          return res.status(500).json(result);
        }

        res.json(result);
      } catch (error: any) {
        console.error('Copilot complete error:', error);
        res.status(500).json({
          success: false,
          error: 'An unexpected error occurred',
        });
      }
    }
  );

  /**
   * POST /api/copilot/generate
   * Generate code using Copilot
   */
  router.post(
    '/generate',
    copilotRateLimiter,
    authenticate(pool),
    [
      body('prompt').notEmpty().withMessage('Prompt is required'),
      body('language').notEmpty().withMessage('Language is required'),
      body('context').optional().isObject(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { prompt, language, context } = req.body;

      try {
        const result = await copilotService.generateCode(prompt, language, context);

        if (!result.success) {
          return res.status(500).json(result);
        }

        res.json(result);
      } catch (error: any) {
        console.error('Copilot generate error:', error);
        res.status(500).json({
          success: false,
          error: 'An unexpected error occurred',
        });
      }
    }
  );

  /**
   * POST /api/copilot/explain
   * Explain code using Copilot
   */
  router.post(
    '/explain',
    copilotRateLimiter,
    authenticate(pool),
    [
      body('code').notEmpty().withMessage('Code is required'),
      body('language').notEmpty().withMessage('Language is required'),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { code, language } = req.body;

      try {
        const result = await copilotService.explainCode(code, language);

        if (!result.success) {
          return res.status(500).json(result);
        }

        res.json(result);
      } catch (error: any) {
        console.error('Copilot explain error:', error);
        res.status(500).json({
          success: false,
          error: 'An unexpected error occurred',
        });
      }
    }
  );

  /**
   * POST /api/copilot/suggestions
   * Get code suggestions from Copilot
   */
  router.post(
    '/suggestions',
    copilotRateLimiter,
    authenticate(pool),
    [
      body('code').notEmpty().withMessage('Code is required'),
      body('cursorPosition').isInt({ min: 0 }).withMessage('Valid cursor position is required'),
      body('language').notEmpty().withMessage('Language is required'),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { code, cursorPosition, language } = req.body;

      try {
        const result = await copilotService.getSuggestions(code, cursorPosition, language);

        if (!result.success) {
          return res.status(500).json(result);
        }

        res.json(result);
      } catch (error: any) {
        console.error('Copilot suggestions error:', error);
        res.status(500).json({
          success: false,
          error: 'An unexpected error occurred',
        });
      }
    }
  );

  return router;
}

export default createCopilotRoutes;
