import Database from 'better-sqlite3';
import { BaseAdapter } from './base-adapter';
import {
  DatabaseCredentials,
  QueryResult,
  SchemaTable,
  SchemaColumn,
  SchemaIndex,
  ForeignKey,
  BackupConfig,
  PerformanceMetrics,
  ConnectionStatus,
} from '../types/database';
import * as fs from 'fs';
import * as path from 'path';

export class SQLiteAdapter extends BaseAdapter {
  private db: Database.Database | null = null;
  private filePath: string;

  constructor(credentials: DatabaseCredentials) {
    super(credentials);
    this.filePath = credentials.database || ':memory:';
  }

  async connect(): Promise<void> {
    try {
      this.status = ConnectionStatus.CONNECTING;

      // Ensure directory exists if not in-memory
      if (this.filePath !== ':memory:') {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      this.db = new Database(this.filePath);

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      this.status = ConnectionStatus.CONNECTED;
    } catch (error) {
      this.status = ConnectionStatus.ERROR;
      throw new Error(`Failed to connect to SQLite: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.status = ConnectionStatus.DISCONNECTED;
    } catch (error) {
      throw new Error(`Failed to disconnect from SQLite: ${error}`);
    }
  }

  async executeQuery(query: string, params: any[] = []): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      const trimmedQuery = query.trim().toLowerCase();

      if (trimmedQuery.startsWith('select') || trimmedQuery.startsWith('pragma')) {
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params);
        return {
          rows,
          rowCount: rows.length,
        };
      } else {
        const stmt = this.db.prepare(query);
        const info = stmt.run(...params);
        return {
          rows: [],
          rowCount: info.changes,
        };
      }
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  }

  async getTableSchema(tableName: string): Promise<SchemaTable> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      // Get columns
      const columnsQuery = `PRAGMA table_info(${tableName})`;
      const columnsResult = await this.executeQuery(columnsQuery);

      const columns: SchemaColumn[] = (columnsResult.rows || []).map((row: any) => ({
        name: row.name,
        type: row.type,
        nullable: row.notnull === 0,
        defaultValue: row.dflt_value,
        isPrimaryKey: row.pk === 1,
      }));

      // Get indexes
      const indexesQuery = `PRAGMA index_list(${tableName})`;
      const indexesResult = await this.executeQuery(indexesQuery);

      const indexes: SchemaIndex[] = [];
      for (const indexRow of indexesResult.rows || []) {
        const indexInfoQuery = `PRAGMA index_info(${indexRow.name})`;
        const indexInfoResult = await this.executeQuery(indexInfoQuery);

        indexes.push({
          name: indexRow.name,
          columns: (indexInfoResult.rows || []).map((col: any) => col.name),
          unique: indexRow.unique === 1,
        });
      }

      // Get foreign keys
      const foreignKeysQuery = `PRAGMA foreign_key_list(${tableName})`;
      const foreignKeysResult = await this.executeQuery(foreignKeysQuery);

      const fkMap = new Map<number, ForeignKey>();
      (foreignKeysResult.rows || []).forEach((row: any) => {
        if (!fkMap.has(row.id)) {
          fkMap.set(row.id, {
            name: `fk_${row.id}`,
            columns: [],
            referencedTable: row.table,
            referencedColumns: [],
            onDelete: row.on_delete,
            onUpdate: row.on_update,
          });
        }
        const fk = fkMap.get(row.id)!;
        fk.columns.push(row.from);
        fk.referencedColumns.push(row.to);
      });

      const primaryKey = columns.filter((col) => col.isPrimaryKey).map((col) => col.name);

      return {
        name: tableName,
        columns,
        indexes,
        foreignKeys: Array.from(fkMap.values()),
        primaryKey,
      };
    } catch (error) {
      throw new Error(`Failed to get table schema: ${error}`);
    }
  }

  async getTables(): Promise<string[]> {
    const query = `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;

    const result = await this.executeQuery(query);
    return (result.rows || []).map((row: any) => row.name);
  }

  async createBackup(_config?: BackupConfig): Promise<string> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    if (this.filePath === ':memory:') {
      throw new Error('Cannot backup in-memory database');
    }

    try {
      const backupPath = `${this.filePath}.backup-${Date.now()}`;
      this.db.backup(backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  async restoreBackup(backupPath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      // Close current connection
      this.db.close();

      // Copy backup file to current file
      fs.copyFileSync(backupPath, this.filePath);

      // Reconnect
      await this.connect();
    } catch (error) {
      throw new Error(`Failed to restore backup: ${error}`);
    }
  }

  async getQueryMetrics(query: string): Promise<PerformanceMetrics> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
      const result = await this.executeQuery(explainQuery);

      const startTime = Date.now();
      await this.executeQuery(query);
      const executionTime = Date.now() - startTime;

      return {
        executionTime,
        queryPlan: result.rows,
      };
    } catch (error) {
      throw new Error(`Failed to get query metrics: ${error}`);
    }
  }

  async beginTransaction(): Promise<void> {
    await this.executeQuery('BEGIN TRANSACTION');
  }

  async commitTransaction(): Promise<void> {
    await this.executeQuery('COMMIT');
  }

  async rollbackTransaction(): Promise<void> {
    await this.executeQuery('ROLLBACK');
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }
      await this.executeQuery('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
