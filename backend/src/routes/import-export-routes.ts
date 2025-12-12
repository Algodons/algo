import { Router, Request, Response } from 'express';
import { ConnectionService } from '../services/connection-service';
import { ImportExportService } from '../services/import-export-service';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();
const connectionService = new ConnectionService();
const importExportService = new ImportExportService(connectionService);

// Configure multer for file uploads
const upload = multer({
  dest: process.env.UPLOAD_DIR || '/tmp/uploads',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

/**
 * Import data from CSV
 */
router.post(
  '/connections/:connectionId/import/csv',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { connectionId } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: 'No file uploaded',
        });
        return;
      }

      const options = {
        format: 'csv' as const,
        tableName: req.body.tableName,
        columnMapping: req.body.columnMapping ? JSON.parse(req.body.columnMapping) : undefined,
        skipErrors: req.body.skipErrors === 'true',
        batchSize: req.body.batchSize ? parseInt(req.body.batchSize) : 100,
        delimiter: req.body.delimiter || ',',
        hasHeader: req.body.hasHeader !== 'false',
      };

      const result = await importExportService.importCSV(connectionId, file.path, options);

      // Clean up uploaded file
      fs.unlinkSync(file.path);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        error: error.message || 'Failed to import CSV',
      });
    }
  }
);

/**
 * Import data from JSON
 */
router.post(
  '/connections/:connectionId/import/json',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { connectionId } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: 'No file uploaded',
        });
        return;
      }

      const options = {
        format: 'json' as const,
        tableName: req.body.tableName,
        skipErrors: req.body.skipErrors === 'true',
        batchSize: req.body.batchSize ? parseInt(req.body.batchSize) : 100,
      };

      const result = await importExportService.importJSON(connectionId, file.path, options);

      // Clean up uploaded file
      fs.unlinkSync(file.path);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        error: error.message || 'Failed to import JSON',
      });
    }
  }
);

/**
 * Export data to CSV
 */
router.post('/connections/:connectionId/export/csv', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    const { tableName, query, compress, delimiter } = req.body;

    const options = {
      format: 'csv' as const,
      tableName,
      query,
      compress,
      delimiter,
    };

    const filePath = await importExportService.exportCSV(connectionId, options);

    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      fs.unlinkSync(filePath);
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to export CSV',
    });
  }
});

/**
 * Export data to JSON
 */
router.post('/connections/:connectionId/export/json', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    const { tableName, query, compress } = req.body;

    const options = {
      format: 'json' as const,
      tableName,
      query,
      compress,
    };

    const filePath = await importExportService.exportJSON(connectionId, options);

    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      fs.unlinkSync(filePath);
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to export JSON',
    });
  }
});

/**
 * Export data to SQL
 */
router.post('/connections/:connectionId/export/sql', async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;
    const { tableName, schemaOnly, dataOnly, compress } = req.body;

    const options = {
      format: 'sql' as const,
      tableName,
      schemaOnly,
      dataOnly,
      compress,
    };

    const filePath = await importExportService.exportSQL(connectionId, options);

    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      fs.unlinkSync(filePath);
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to export SQL',
    });
  }
});

export default router;
