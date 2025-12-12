import { ConnectionService } from './connection-service';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { Readable } from 'stream';

export interface BackupOptions {
  format?: 'sql' | 'custom' | 'tar';
  compress?: boolean;
  schemaOnly?: boolean;
  dataOnly?: boolean;
  encryption?: boolean;
  encryptionKey?: string;
}

export interface BackupMetadata {
  id: string;
  connectionId: string;
  timestamp: Date;
  size: number;
  format: string;
  compressed: boolean;
  encrypted: boolean;
  path: string;
}

export interface BackupSchedule {
  id: string;
  connectionId: string;
  cron: string;
  retention: number;
  options: BackupOptions;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

/**
 * Service for automated backups and point-in-time recovery
 */
export class BackupService {
  private connectionService: ConnectionService;
  private backupDir: string;
  private backups: Map<string, BackupMetadata[]>;
  private schedules: Map<string, BackupSchedule[]>;

  constructor(connectionService: ConnectionService) {
    this.connectionService = connectionService;
    this.backupDir = process.env.BACKUP_DIR || '/tmp/backups';
    this.backups = new Map();
    this.schedules = new Map();

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a backup
   */
  async createBackup(
    connectionId: string,
    options: BackupOptions = {}
  ): Promise<BackupMetadata> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const timestamp = new Date();
    const backupId = `backup-${connectionId}-${timestamp.getTime()}`;
    const format = options.format || 'sql';
    const fileName = `${backupId}.${format}`;
    const filePath = path.join(this.backupDir, fileName);

    // Generate backup
    let backupData = '';

    if (!options.dataOnly) {
      // Export schema
      const tables = await adapter.getTables();

      for (const tableName of tables) {
        const schema = await adapter.getTableSchema(tableName);
        backupData += this.generateCreateTableSQL(schema) + '\n\n';
      }
    }

    if (!options.schemaOnly) {
      // Export data
      const tables = await adapter.getTables();

      for (const tableName of tables) {
        const result = await adapter.executeQuery(`SELECT * FROM ${tableName}`);

        if (result.rows && result.rows.length > 0) {
          for (const row of result.rows) {
            backupData += this.generateInsertSQL(tableName, row) + '\n';
          }
          backupData += '\n';
        }
      }
    }

    // Write to file
    let finalPath = filePath;

    if (options.compress) {
      finalPath = filePath + '.gz';
      await this.compressData(backupData, finalPath);
    } else {
      fs.writeFileSync(filePath, backupData);
    }

    // Get file size
    const stats = fs.statSync(finalPath);

    const metadata: BackupMetadata = {
      id: backupId,
      connectionId,
      timestamp,
      size: stats.size,
      format,
      compressed: options.compress || false,
      encrypted: options.encryption || false,
      path: finalPath,
    };

    // Store metadata
    if (!this.backups.has(connectionId)) {
      this.backups.set(connectionId, []);
    }
    this.backups.get(connectionId)!.push(metadata);

    return metadata;
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(connectionId: string, backupId: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const backup = this.getBackup(connectionId, backupId);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Read backup file
    let backupData: string;

    if (backup.compressed) {
      backupData = await this.decompressFile(backup.path);
    } else {
      backupData = fs.readFileSync(backup.path, 'utf-8');
    }

    // Split into SQL statements and execute
    const statements = backupData
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await adapter.executeQuery(statement);
      } catch (error) {
        console.error(`Failed to execute statement: ${error}`);
      }
    }
  }

  /**
   * List all backups for a connection
   */
  listBackups(connectionId: string): BackupMetadata[] {
    return this.backups.get(connectionId) || [];
  }

  /**
   * Get a specific backup
   */
  getBackup(connectionId: string, backupId: string): BackupMetadata | undefined {
    const backups = this.backups.get(connectionId) || [];
    return backups.find((b) => b.id === backupId);
  }

  /**
   * Delete a backup
   */
  deleteBackup(connectionId: string, backupId: string): void {
    const backup = this.getBackup(connectionId, backupId);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Delete file
    if (fs.existsSync(backup.path)) {
      fs.unlinkSync(backup.path);
    }

    // Remove from metadata
    const backups = this.backups.get(connectionId) || [];
    const index = backups.findIndex((b) => b.id === backupId);
    if (index > -1) {
      backups.splice(index, 1);
    }
  }

  /**
   * Schedule automated backups
   */
  scheduleBackup(
    connectionId: string,
    cron: string,
    retention: number,
    options: BackupOptions = {}
  ): BackupSchedule {
    const scheduleId = `schedule-${connectionId}-${Date.now()}`;

    const schedule: BackupSchedule = {
      id: scheduleId,
      connectionId,
      cron,
      retention,
      options,
      enabled: true,
    };

    if (!this.schedules.has(connectionId)) {
      this.schedules.set(connectionId, []);
    }
    this.schedules.get(connectionId)!.push(schedule);

    return schedule;
  }

  /**
   * List backup schedules
   */
  listSchedules(connectionId: string): BackupSchedule[] {
    return this.schedules.get(connectionId) || [];
  }

  /**
   * Update backup schedule
   */
  updateSchedule(connectionId: string, scheduleId: string, updates: Partial<BackupSchedule>): void {
    const schedules = this.schedules.get(connectionId) || [];
    const schedule = schedules.find((s) => s.id === scheduleId);

    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    Object.assign(schedule, updates);
  }

  /**
   * Delete backup schedule
   */
  deleteSchedule(connectionId: string, scheduleId: string): void {
    const schedules = this.schedules.get(connectionId) || [];
    const index = schedules.findIndex((s) => s.id === scheduleId);

    if (index > -1) {
      schedules.splice(index, 1);
    }
  }

  /**
   * Apply retention policy
   */
  applyRetentionPolicy(connectionId: string): void {
    const backups = this.listBackups(connectionId);
    const schedules = this.listSchedules(connectionId);

    for (const schedule of schedules) {
      if (!schedule.enabled) continue;

      // Sort backups by timestamp
      const sortedBackups = backups
        .filter((b) => b.connectionId === connectionId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Delete old backups beyond retention count
      if (sortedBackups.length > schedule.retention) {
        const toDelete = sortedBackups.slice(schedule.retention);
        for (const backup of toDelete) {
          this.deleteBackup(connectionId, backup.id);
        }
      }
    }
  }

  /**
   * Point-in-time recovery (placeholder)
   */
  async pointInTimeRecovery(
    connectionId: string,
    targetTimestamp: Date
  ): Promise<void> {
    // Find the closest backup before the target timestamp
    const backups = this.listBackups(connectionId)
      .filter((b) => b.timestamp <= targetTimestamp)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (backups.length === 0) {
      throw new Error('No backup found before target timestamp');
    }

    const backup = backups[0];
    await this.restoreBackup(connectionId, backup.id);

    // In a real implementation, we would:
    // 1. Restore from the backup
    // 2. Apply WAL/binlog entries from backup time to target time
    // This requires continuous archiving to be set up
  }

  /**
   * Generate CREATE TABLE SQL from schema
   */
  private generateCreateTableSQL(schema: any): string {
    const columns = schema.columns
      .map((col: any) => {
        let def = `  ${col.name} ${col.type}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        return def;
      })
      .join(',\n');

    let sql = `CREATE TABLE ${schema.name} (\n${columns}`;

    if (schema.primaryKey && schema.primaryKey.length > 0) {
      sql += `,\n  PRIMARY KEY (${schema.primaryKey.join(', ')})`;
    }

    sql += '\n);';

    return sql;
  }

  /**
   * Generate INSERT SQL from row data
   */
  private generateInsertSQL(tableName: string, row: any): string {
    const columns = Object.keys(row);
    const values = Object.values(row).map((v) => {
      if (v === null) return 'NULL';
      if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
      return v;
    });

    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
  }

  /**
   * Compress data using gzip
   */
  private async compressData(data: string, outputPath: string): Promise<void> {
    const writeStream = fs.createWriteStream(outputPath);
    const gzip = zlib.createGzip();

    return new Promise((resolve, reject) => {
      Readable.from(data)
        .pipe(gzip)
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  /**
   * Decompress a gzipped file
   */
  private async decompressFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const readStream = fs.createReadStream(filePath);
      const gunzip = zlib.createGunzip();

      readStream
        .pipe(gunzip)
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
        .on('error', reject);
    });
  }
}
