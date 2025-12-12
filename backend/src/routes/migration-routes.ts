import { Router, Request, Response } from 'express';
import { ConnectionService } from '../services/connection-service';
import { MigrationService } from '../services/migration-service';

const router = Router();
const connectionService = new ConnectionService();
const migrationService = new MigrationService(connectionService);

/**
 * Initialize migration system for a connection
 */
router.post('/connections/:connectionId/migrations/init', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;

    await migrationService.initialize(connectionId);

    res.json({
      message: 'Migration system initialized',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to initialize migration system',
    });
  }
});

/**
 * Create a new migration
 */
router.post('/connections/:connectionId/migrations', (req: Request, res: Response): void => {
  try {
    const { connectionId } = req.params;
    const { name, up, down, dependencies } = req.body;

    if (!name || !up || !down) {
      res.status(400).json({
        error: 'Name, up, and down SQL are required',
      });
      return;
    }

    const migration = migrationService.createMigration(connectionId, name, up, down, dependencies);

    res.status(201).json(migration);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to create migration',
    });
  }
});

/**
 * Get all migrations for a connection
 */
router.get('/connections/:connectionId/migrations', (req: Request, res: Response): void => {
  try {
    const { connectionId } = req.params;
    const migrations = migrationService.getMigrations(connectionId);

    res.json({
      migrations,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch migrations',
    });
  }
});

/**
 * Get a specific migration
 */
router.get('/connections/:connectionId/migrations/:migrationId', (req: Request, res: Response): void => {
  try {
    const { connectionId, migrationId } = req.params;
    const migration = migrationService.getMigration(connectionId, migrationId);

    if (!migration) {
      res.status(404).json({
        error: `Migration ${migrationId} not found`,
      });
      return;
    }

    res.json(migration);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch migration',
    });
  }
});

/**
 * Apply a specific migration
 */
router.post('/connections/:connectionId/migrations/:migrationId/apply', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, migrationId } = req.params;

    await migrationService.applyMigration(connectionId, migrationId);

    res.json({
      message: 'Migration applied successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to apply migration',
    });
  }
});

/**
 * Rollback a specific migration
 */
router.post('/connections/:connectionId/migrations/:migrationId/rollback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, migrationId } = req.params;

    await migrationService.rollbackMigration(connectionId, migrationId);

    res.json({
      message: 'Migration rolled back successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to rollback migration',
    });
  }
});

/**
 * Apply all pending migrations
 */
router.post('/connections/:connectionId/migrations/apply-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;

    await migrationService.applyAll(connectionId);

    res.json({
      message: 'All pending migrations applied successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to apply migrations',
    });
  }
});

/**
 * Rollback to a specific version
 */
router.post('/connections/:connectionId/migrations/rollback-to/:version', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, version } = req.params;

    await migrationService.rollbackTo(connectionId, parseInt(version));

    res.json({
      message: `Rolled back to version ${version}`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to rollback migrations',
    });
  }
});

/**
 * Get migration status
 */
router.get('/connections/:connectionId/migrations/status', (req: Request, res: Response): void => {
  try {
    const { connectionId } = req.params;
    const status = migrationService.getStatus(connectionId);

    res.json(status);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to get migration status',
    });
  }
});

/**
 * Dry run a migration
 */
router.get('/connections/:connectionId/migrations/:migrationId/dry-run', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, migrationId } = req.params;
    const sql = await migrationService.dryRun(connectionId, migrationId);

    res.json({
      sql,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to perform dry run',
    });
  }
});

export default router;
