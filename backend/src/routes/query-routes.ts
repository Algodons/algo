import { Router, Request, Response } from 'express';
import { ConnectionService } from '../services/connection-service';
import { QueryService } from '../services/query-service';

const router = Router();
const connectionService = new ConnectionService();
const queryService = new QueryService(connectionService);

/**
 * Execute a query on a connection
 */
router.post('/connections/:connectionId/query', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    const { query, params } = req.body;

    if (!query) {
      res.status(400).json({
        error: 'Query is required',
      });
      return;
    }

    const result = await queryService.executeQuery(connectionId, query, params);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to execute query',
    });
  }
});

/**
 * Get query history for a connection
 */
router.get('/connections/:connectionId/query/history', (req: Request, res: Response): void => {
  try {
    const { connectionId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const history = queryService.getHistory(connectionId, limit);

    res.json({
      history,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch query history',
    });
  }
});

/**
 * Clear query history for a connection
 */
router.delete('/connections/:connectionId/query/history', (req: Request, res: Response): void => {
  try {
    const { connectionId } = req.params;
    queryService.clearHistory(connectionId);

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to clear query history',
    });
  }
});

/**
 * Get tables for a connection
 */
router.get('/connections/:connectionId/tables', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    const tables = await queryService.getTables(connectionId);

    res.json({
      tables,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch tables',
    });
  }
});

/**
 * Get schema for a table
 */
router.get('/connections/:connectionId/tables/:tableName/schema', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, tableName } = req.params;
    const schema = await queryService.getTableSchema(connectionId, tableName);

    res.json(schema);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch table schema',
    });
  }
});

/**
 * Get query performance metrics
 */
router.post('/connections/:connectionId/query/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    const { query } = req.body;

    if (!query) {
      res.status(400).json({
        error: 'Query is required',
      });
      return;
    }

    const metrics = await queryService.getQueryMetrics(connectionId, query);

    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to get query metrics',
    });
  }
});

/**
 * Begin a transaction
 */
router.post('/connections/:connectionId/transaction/begin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    await queryService.beginTransaction(connectionId);

    res.json({
      message: 'Transaction started',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to begin transaction',
    });
  }
});

/**
 * Commit a transaction
 */
router.post('/connections/:connectionId/transaction/commit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    await queryService.commitTransaction(connectionId);

    res.json({
      message: 'Transaction committed',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to commit transaction',
    });
  }
});

/**
 * Rollback a transaction
 */
router.post('/connections/:connectionId/transaction/rollback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    await queryService.rollbackTransaction(connectionId);

    res.json({
      message: 'Transaction rolled back',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to rollback transaction',
    });
  }
});

export default router;
