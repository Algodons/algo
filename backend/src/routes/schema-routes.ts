import { Router, Request, Response } from 'express';
import { ConnectionService } from '../services/connection-service';
import { SchemaService } from '../services/schema-service';

const router = Router();
const connectionService = new ConnectionService();
const schemaService = new SchemaService(connectionService);

/**
 * Get schema for all tables
 */
router.get('/connections/:connectionId/schema', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    const schema = await schemaService.getSchema(connectionId);

    res.json({
      tables: schema,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch schema',
    });
  }
});

/**
 * Get schema for a specific table
 */
router.get('/connections/:connectionId/schema/:tableName', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, tableName } = req.params;
    const schema = await schemaService.getTableSchema(connectionId, tableName);

    res.json(schema);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch table schema',
    });
  }
});

/**
 * Create a new table
 */
router.post('/connections/:connectionId/schema/tables', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    const options = req.body;

    await schemaService.createTable(connectionId, options);

    res.status(201).json({
      message: `Table ${options.name} created successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to create table',
    });
  }
});

/**
 * Drop a table
 */
router.delete('/connections/:connectionId/schema/tables/:tableName', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, tableName } = req.params;

    await schemaService.dropTable(connectionId, tableName);

    res.status(200).json({
      message: `Table ${tableName} dropped successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to drop table',
    });
  }
});

/**
 * Modify table columns
 */
router.put('/connections/:connectionId/schema/tables/:tableName', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, tableName } = req.params;
    const { modifications } = req.body;

    await schemaService.modifyTable(connectionId, tableName, modifications);

    res.json({
      message: `Table ${tableName} modified successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to modify table',
    });
  }
});

/**
 * Add an index to a table
 */
router.post('/connections/:connectionId/schema/tables/:tableName/indexes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, tableName } = req.params;
    const index = req.body;

    await schemaService.addIndex(connectionId, tableName, index);

    res.status(201).json({
      message: `Index ${index.name} created successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to create index',
    });
  }
});

/**
 * Drop an index from a table
 */
router.delete('/connections/:connectionId/schema/tables/:tableName/indexes/:indexName', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, tableName, indexName } = req.params;

    await schemaService.dropIndex(connectionId, tableName, indexName);

    res.status(200).json({
      message: `Index ${indexName} dropped successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to drop index',
    });
  }
});

/**
 * Compare two schemas
 */
router.post('/schema/compare', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId1, connectionId2 } = req.body;

    if (!connectionId1 || !connectionId2) {
      res.status(400).json({
        error: 'Both connectionId1 and connectionId2 are required',
      });
      return;
    }

    const diff = await schemaService.compareSchemas(connectionId1, connectionId2);

    res.json(diff);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to compare schemas',
    });
  }
});

export default router;
