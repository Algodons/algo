import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate } from '../../middleware/auth';

export function createAIRoutes(pool: Pool): Router {
  const router = Router();

  // GET /api/v1/ai/agents - List available agents
  router.get(
    '/agents',
    authenticate(pool),
    [
      query('category').optional().isString(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const category = req.query.category as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      try {
        let query = 'SELECT * FROM ai_agents WHERE active = true';
        let countQuery = 'SELECT COUNT(*) FROM ai_agents WHERE active = true';
        const values: any[] = [];

        if (category) {
          query += ' AND category = $1';
          countQuery += ' AND category = $1';
          values.push(category);
        }

        query += ` ORDER BY name LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        const [result, countResult] = await Promise.all([
          pool.query(query, values),
          pool.query(countQuery, category ? [category] : []),
        ]);

        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);

        res.json({
          success: true,
          data: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        });
      } catch (error: any) {
        console.error('Error listing AI agents:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to list AI agents',
          details: error.message,
        });
      }
    }
  );

  // POST /api/v1/ai/agents/:agentId/invoke - Invoke AI agent
  router.post(
    '/agents/:agentId/invoke',
    authenticate(pool),
    [
      param('agentId').isString(),
      body('input').notEmpty(),
      body('context').optional().isObject(),
      body('parameters').optional().isObject(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { agentId } = req.params;
      const { input, context, parameters } = req.body;
      const userId = (req as any).user?.id;

      try {
        // Get agent details
        const agent = await pool.query(
          'SELECT * FROM ai_agents WHERE id = $1 AND active = true',
          [agentId]
        );

        if (agent.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'AI agent not found or inactive',
          });
        }

        // Create invocation record
        const invocation = await pool.query(
          `INSERT INTO ai_agent_invocations (agent_id, user_id, input, context, parameters, status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
           RETURNING *`,
          [agentId, userId, JSON.stringify(input), JSON.stringify(context || {}), JSON.stringify(parameters || {})]
        );

        // Simulate AI agent processing (in real implementation, this would call the actual agent)
        const result = {
          output: `Processed by ${agent.rows[0].name}`,
          tokens_used: 150,
          execution_time_ms: 500,
        };

        // Update invocation with result
        await pool.query(
          `UPDATE ai_agent_invocations
           SET status = 'completed', output = $1, tokens_used = $2, execution_time_ms = $3, completed_at = NOW()
           WHERE id = $4`,
          [JSON.stringify(result.output), result.tokens_used, result.execution_time_ms, invocation.rows[0].id]
        );

        res.json({
          success: true,
          data: {
            invocation_id: invocation.rows[0].id,
            agent_id: agentId,
            ...result,
          },
          message: 'Agent invoked successfully',
        });
      } catch (error: any) {
        console.error('Error invoking AI agent:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to invoke AI agent',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/ai/models - List available models
  router.get(
    '/models',
    authenticate(pool),
    [
      query('type').optional().isIn(['classification', 'regression', 'nlp', 'cv', 'all']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const type = req.query.type as string || 'all';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      try {
        let query = 'SELECT * FROM ml_models WHERE active = true';
        let countQuery = 'SELECT COUNT(*) FROM ml_models WHERE active = true';
        const values: any[] = [];

        if (type !== 'all') {
          query += ' AND type = $1';
          countQuery += ' AND type = $1';
          values.push(type);
        }

        query += ` ORDER BY name LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        const [result, countResult] = await Promise.all([
          pool.query(query, values),
          pool.query(countQuery, type !== 'all' ? [type] : []),
        ]);

        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);

        res.json({
          success: true,
          data: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        });
      } catch (error: any) {
        console.error('Error listing ML models:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to list ML models',
          details: error.message,
        });
      }
    }
  );

  // POST /api/v1/ai/models/:modelId/predict - ML model prediction
  router.post(
    '/models/:modelId/predict',
    authenticate(pool),
    [
      param('modelId').isString(),
      body('input').notEmpty(),
      body('parameters').optional().isObject(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { modelId } = req.params;
      const { input, parameters } = req.body;
      const userId = (req as any).user?.id;

      try {
        // Get model details
        const model = await pool.query(
          'SELECT * FROM ml_models WHERE id = $1 AND active = true',
          [modelId]
        );

        if (model.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'ML model not found or inactive',
          });
        }

        // Create prediction record
        const prediction = await pool.query(
          `INSERT INTO ml_predictions (model_id, user_id, input, parameters, status, created_at)
           VALUES ($1, $2, $3, $4, 'pending', NOW())
           RETURNING *`,
          [modelId, userId, JSON.stringify(input), JSON.stringify(parameters || {})]
        );

        // Simulate ML model prediction (in real implementation, this would call the actual model)
        const result = {
          prediction: 'Sample prediction result',
          confidence: 0.95,
          execution_time_ms: 150,
        };

        // Update prediction with result
        await pool.query(
          `UPDATE ml_predictions
           SET status = 'completed', output = $1, confidence = $2, execution_time_ms = $3, completed_at = NOW()
           WHERE id = $4`,
          [JSON.stringify(result.prediction), result.confidence, result.execution_time_ms, prediction.rows[0].id]
        );

        res.json({
          success: true,
          data: {
            prediction_id: prediction.rows[0].id,
            model_id: modelId,
            ...result,
          },
          message: 'Prediction completed successfully',
        });
      } catch (error: any) {
        console.error('Error running prediction:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to run prediction',
          details: error.message,
        });
      }
    }
  );

  return router;
}
