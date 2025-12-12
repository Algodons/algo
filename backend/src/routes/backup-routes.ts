import { Router, Request, Response } from 'express';
import { ConnectionService } from '../services/connection-service';
import { BackupService } from '../services/backup-service';

const router = Router();
const connectionService = new ConnectionService();
const backupService = new BackupService(connectionService);

/**
 * Create a backup
 */
router.post('/connections/:connectionId/backups', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    const options = req.body;

    const backup = await backupService.createBackup(connectionId, options);

    res.status(201).json(backup);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to create backup',
    });
  }
});

/**
 * List all backups for a connection
 */
router.get('/connections/:connectionId/backups', (req: Request, res: Response): void => {
  try {
    const { connectionId } = req.params;
    const backups = backupService.listBackups(connectionId);

    res.json({
      backups,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to list backups',
    });
  }
});

/**
 * Get a specific backup
 */
router.get('/connections/:connectionId/backups/:backupId', (req: Request, res: Response): void => {
  try {
    const { connectionId, backupId } = req.params;
    const backup = backupService.getBackup(connectionId, backupId);

    if (!backup) {
      res.status(404).json({
        error: `Backup ${backupId} not found`,
      });
      return;
    }

    res.json(backup);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to get backup',
    });
  }
});

/**
 * Restore from a backup
 */
router.post('/connections/:connectionId/backups/:backupId/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId, backupId } = req.params;

    await backupService.restoreBackup(connectionId, backupId);

    res.json({
      message: 'Backup restored successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to restore backup',
    });
  }
});

/**
 * Delete a backup
 */
router.delete('/connections/:connectionId/backups/:backupId', (req: Request, res: Response): void => {
  try {
    const { connectionId, backupId } = req.params;

    backupService.deleteBackup(connectionId, backupId);

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to delete backup',
    });
  }
});

/**
 * Download a backup file
 */
router.get('/connections/:connectionId/backups/:backupId/download', (req: Request, res: Response): void => {
  try {
    const { connectionId, backupId } = req.params;
    const backup = backupService.getBackup(connectionId, backupId);

    if (!backup) {
      res.status(404).json({
        error: `Backup ${backupId} not found`,
      });
      return;
    }

    res.download(backup.path, `${backupId}.${backup.format}${backup.compressed ? '.gz' : ''}`, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to download backup',
    });
  }
});

/**
 * Schedule automated backups
 */
router.post('/connections/:connectionId/backups/schedules', (req: Request, res: Response): void => {
  try {
    const { connectionId } = req.params;
    const { cron, retention, options } = req.body;

    if (!cron || !retention) {
      res.status(400).json({
        error: 'Cron expression and retention count are required',
      });
      return;
    }

    const schedule = backupService.scheduleBackup(connectionId, cron, retention, options);

    res.status(201).json(schedule);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to schedule backup',
    });
  }
});

/**
 * List backup schedules
 */
router.get('/connections/:connectionId/backups/schedules', (req: Request, res: Response): void => {
  try {
    const { connectionId } = req.params;
    const schedules = backupService.listSchedules(connectionId);

    res.json({
      schedules,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to list schedules',
    });
  }
});

/**
 * Update a backup schedule
 */
router.put('/connections/:connectionId/backups/schedules/:scheduleId', (req: Request, res: Response): void => {
  try {
    const { connectionId, scheduleId } = req.params;
    const updates = req.body;

    backupService.updateSchedule(connectionId, scheduleId, updates);

    res.json({
      message: 'Schedule updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to update schedule',
    });
  }
});

/**
 * Delete a backup schedule
 */
router.delete('/connections/:connectionId/backups/schedules/:scheduleId', (req: Request, res: Response): void => {
  try {
    const { connectionId, scheduleId } = req.params;

    backupService.deleteSchedule(connectionId, scheduleId);

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to delete schedule',
    });
  }
});

/**
 * Apply retention policy
 */
router.post('/connections/:connectionId/backups/apply-retention', (req: Request, res: Response): void => {
  try {
    const { connectionId } = req.params;

    backupService.applyRetentionPolicy(connectionId);

    res.json({
      message: 'Retention policy applied successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to apply retention policy',
    });
  }
});

/**
 * Point-in-time recovery
 */
router.post('/connections/:connectionId/backups/pitr', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    const { timestamp } = req.body;

    if (!timestamp) {
      res.status(400).json({
        error: 'Target timestamp is required',
      });
      return;
    }

    await backupService.pointInTimeRecovery(connectionId, new Date(timestamp));

    res.json({
      message: 'Point-in-time recovery completed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to perform point-in-time recovery',
    });
  }
});

export default router;
