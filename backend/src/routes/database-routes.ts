import { Router, Request, Response } from 'express';
import { ConnectionService } from '../services/connection-service';
import { DatabaseType } from '../types/database';

const router = Router();
const connectionService = new ConnectionService();

/**
 * Create a new database connection
 */
router.post('/connections', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, type, credentials } = req.body;

    if (!name || !type || !credentials) {
      res.status(400).json({
        error: 'Missing required fields: name, type, credentials',
      });
      return;
    }

    if (!Object.values(DatabaseType).includes(type)) {
      res.status(400).json({
        error: `Invalid database type: ${type}`,
      });
      return;
    }

    const connection = await connectionService.createConnection(name, type, credentials);

    res.status(201).json({
      id: connection.id,
      name: connection.name,
      type: connection.type,
      status: connection.status,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to create connection',
    });
  }
});

/**
 * Get all database connections
 */
router.get('/connections', (_req: Request, res: Response) => {
  try {
    const connections = connectionService.getAllConnections();

    res.json({
      connections: connections.map((conn) => ({
        id: conn.id,
        name: conn.name,
        type: conn.type,
        status: conn.status,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch connections',
    });
  }
});

/**
 * Get a specific connection
 */
router.get('/connections/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const connection = connectionService.getConnection(id);

    if (!connection) {
      res.status(404).json({
        error: `Connection ${id} not found`,
      });
      return;
    }

    res.json({
      id: connection.id,
      name: connection.name,
      type: connection.type,
      status: connection.status,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch connection',
    });
  }
});

/**
 * Update a connection
 */
router.put('/connections/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const connection = await connectionService.updateConnection(id, updates);

    res.json({
      id: connection.id,
      name: connection.name,
      type: connection.type,
      status: connection.status,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to update connection',
    });
  }
});

/**
 * Delete a connection
 */
router.delete('/connections/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await connectionService.deleteConnection(id);

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to delete connection',
    });
  }
});

/**
 * Test a connection
 */
router.post('/connections/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isHealthy = await connectionService.testConnection(id);

    res.json({
      healthy: isHealthy,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to test connection',
    });
  }
});

/**
 * Reconnect a connection
 */
router.post('/connections/:id/reconnect', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await connectionService.reconnect(id);

    res.json({
      message: 'Connection reestablished',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to reconnect',
    });
  }
});

/**
 * Get connection statistics
 */
router.get('/connections/stats/overview', (_req: Request, res: Response) => {
  try {
    const stats = connectionService.getStatistics();

    res.json({
      total: stats.total,
      connected: stats.connected,
      disconnected: stats.disconnected,
      error: stats.error,
      byType: Object.fromEntries(stats.byType),
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch statistics',
    });
  }
});

export default router;
