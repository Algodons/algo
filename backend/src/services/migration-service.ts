import { ConnectionService } from './connection-service';
import crypto from 'crypto';

export interface Migration {
  id: string;
  name: string;
  version: number;
  up: string;
  down: string;
  dependencies?: string[];
  createdAt: Date;
  appliedAt?: Date;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
  error?: string;
}

export interface MigrationHistory {
  connectionId: string;
  migrations: Migration[];
}

/**
 * Service for managing database migrations
 */
export class MigrationService {
  private connectionService: ConnectionService;
  private migrations: Map<string, Migration[]>;
  private lockTable = '_migration_lock';
  private historyTable = '_migration_history';

  constructor(connectionService: ConnectionService) {
    this.connectionService = connectionService;
    this.migrations = new Map();
  }

  /**
   * Initialize migration tables
   */
  async initialize(connectionId: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Create migration history table
    const historyTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.historyTable} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version INT NOT NULL,
        up_sql TEXT NOT NULL,
        down_sql TEXT NOT NULL,
        applied_at TIMESTAMP,
        status VARCHAR(50) NOT NULL,
        error TEXT
      )
    `;

    // Create migration lock table
    const lockTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.lockTable} (
        id INT PRIMARY KEY,
        locked_at TIMESTAMP,
        locked_by VARCHAR(255)
      )
    `;

    await adapter.executeQuery(historyTableSQL);
    await adapter.executeQuery(lockTableSQL);
  }

  /**
   * Create a new migration
   */
  createMigration(
    connectionId: string,
    name: string,
    up: string,
    down: string,
    dependencies?: string[]
  ): Migration {
    if (!this.migrations.has(connectionId)) {
      this.migrations.set(connectionId, []);
    }

    const migrations = this.migrations.get(connectionId)!;
    const version = migrations.length + 1;

    const migration: Migration = {
      id: crypto.randomUUID(),
      name,
      version,
      up,
      down,
      dependencies,
      createdAt: new Date(),
      status: 'pending',
    };

    migrations.push(migration);

    return migration;
  }

  /**
   * Get all migrations for a connection
   */
  getMigrations(connectionId: string): Migration[] {
    return this.migrations.get(connectionId) || [];
  }

  /**
   * Get a specific migration
   */
  getMigration(connectionId: string, migrationId: string): Migration | undefined {
    const migrations = this.migrations.get(connectionId) || [];
    return migrations.find((m) => m.id === migrationId);
  }

  /**
   * Apply a migration
   */
  async applyMigration(connectionId: string, migrationId: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const migration = this.getMigration(connectionId, migrationId);

    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    if (migration.status === 'applied') {
      throw new Error(`Migration ${migrationId} already applied`);
    }

    // Check dependencies
    if (migration.dependencies) {
      for (const depId of migration.dependencies) {
        const dep = this.getMigration(connectionId, depId);
        if (!dep || dep.status !== 'applied') {
          throw new Error(`Dependency ${depId} not applied`);
        }
      }
    }

    // Acquire lock
    await this.acquireLock(connectionId);

    try {
      // Execute migration
      await adapter.executeQuery(migration.up);

      // Update status
      migration.status = 'applied';
      migration.appliedAt = new Date();

      // Save to history table
      await this.saveMigrationHistory(connectionId, migration);
    } catch (error: any) {
      migration.status = 'failed';
      migration.error = error.message;
      throw error;
    } finally {
      // Release lock
      await this.releaseLock(connectionId);
    }
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(connectionId: string, migrationId: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const migration = this.getMigration(connectionId, migrationId);

    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    if (migration.status !== 'applied') {
      throw new Error(`Migration ${migrationId} is not applied`);
    }

    // Acquire lock
    await this.acquireLock(connectionId);

    try {
      // Execute rollback
      await adapter.executeQuery(migration.down);

      // Update status
      migration.status = 'rolled_back';
      migration.appliedAt = undefined;

      // Update history table
      await this.saveMigrationHistory(connectionId, migration);
    } catch (error: any) {
      migration.status = 'failed';
      migration.error = error.message;
      throw error;
    } finally {
      // Release lock
      await this.releaseLock(connectionId);
    }
  }

  /**
   * Apply all pending migrations
   */
  async applyAll(connectionId: string): Promise<void> {
    const migrations = this.getMigrations(connectionId);
    const pending = migrations.filter((m) => m.status === 'pending');

    for (const migration of pending) {
      await this.applyMigration(connectionId, migration.id);
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollbackTo(connectionId: string, version: number): Promise<void> {
    const migrations = this.getMigrations(connectionId);
    const toRollback = migrations
      .filter((m) => m.status === 'applied' && m.version > version)
      .sort((a, b) => b.version - a.version);

    for (const migration of toRollback) {
      await this.rollbackMigration(connectionId, migration.id);
    }
  }

  /**
   * Get migration status
   */
  getStatus(connectionId: string): {
    total: number;
    pending: number;
    applied: number;
    failed: number;
    latest?: Migration;
  } {
    const migrations = this.getMigrations(connectionId);

    const status = {
      total: migrations.length,
      pending: migrations.filter((m) => m.status === 'pending').length,
      applied: migrations.filter((m) => m.status === 'applied').length,
      failed: migrations.filter((m) => m.status === 'failed').length,
      latest: migrations[migrations.length - 1],
    };

    return status;
  }

  /**
   * Dry run a migration
   */
  async dryRun(connectionId: string, migrationId: string): Promise<string> {
    const migration = this.getMigration(connectionId, migrationId);

    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    return migration.up;
  }

  /**
   * Acquire migration lock
   */
  private async acquireLock(connectionId: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const lockId = 1;
    const lockedBy = `process-${process.pid}`;

    // Try to insert lock
    const insertSQL = `
      INSERT INTO ${this.lockTable} (id, locked_at, locked_by)
      VALUES (${lockId}, NOW(), '${lockedBy}')
    `;

    try {
      await adapter.executeQuery(insertSQL);
    } catch {
      throw new Error('Migration is locked by another process');
    }
  }

  /**
   * Release migration lock
   */
  private async releaseLock(connectionId: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const deleteSQL = `DELETE FROM ${this.lockTable} WHERE id = 1`;
    await adapter.executeQuery(deleteSQL);
  }

  /**
   * Save migration to history table
   */
  private async saveMigrationHistory(connectionId: string, migration: Migration): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const connection = this.connectionService.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Use simple INSERT/UPDATE logic that works across databases
    // First try to delete existing record, then insert new one
    const deleteSQL = `DELETE FROM ${this.historyTable} WHERE id = '${migration.id}'`;
    await adapter.executeQuery(deleteSQL);

    const insertSQL = `
      INSERT INTO ${this.historyTable} (id, name, version, up_sql, down_sql, applied_at, status, error)
      VALUES (
        '${migration.id}',
        '${migration.name.replace(/'/g, "''")}',
        ${migration.version},
        '${migration.up.replace(/'/g, "''")}',
        '${migration.down.replace(/'/g, "''")}',
        ${migration.appliedAt ? `'${migration.appliedAt.toISOString()}'` : 'NULL'},
        '${migration.status}',
        ${migration.error ? `'${migration.error.replace(/'/g, "''")}'` : 'NULL'}
      )
    `;

    await adapter.executeQuery(insertSQL);
  }
}
