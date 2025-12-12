import mysql, { Pool, PoolConnection, PoolOptions } from 'mysql2/promise';
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

export class MySQLAdapter extends BaseAdapter {
  private pool: Pool | null = null;
  private connection: PoolConnection | null = null;

  constructor(credentials: DatabaseCredentials) {
    super(credentials);
  }

  async connect(): Promise<void> {
    try {
      this.status = ConnectionStatus.CONNECTING;

      const poolConfig: PoolOptions = {
        host: this.credentials.host,
        port: this.credentials.port || 3306,
        user: this.credentials.username,
        password: this.credentials.password,
        database: this.credentials.database,
        connectionLimit: 20,
        waitForConnections: true,
        queueLimit: 0,
      };

      this.pool = mysql.createPool(poolConfig);

      // Test connection
      const connection = await this.pool.getConnection();
      connection.release();

      this.status = ConnectionStatus.CONNECTED;
    } catch (error) {
      this.status = ConnectionStatus.ERROR;
      throw new Error(`Failed to connect to MySQL: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        this.connection.release();
        this.connection = null;
      }
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      this.status = ConnectionStatus.DISCONNECTED;
    } catch (error) {
      throw new Error(`Failed to disconnect from MySQL: ${error}`);
    }
  }

  async executeQuery(query: string, params: any[] = []): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }

    try {
      const [rows, fields] = await this.pool.query(query, params);
      return {
        rows: Array.isArray(rows) ? rows : [],
        fields: fields as any[],
        rowCount: Array.isArray(rows) ? rows.length : 0,
      };
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  }

  async getTableSchema(tableName: string): Promise<SchemaTable> {
    const columnsQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        COLUMN_KEY,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const indexesQuery = `
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `;

    const foreignKeysQuery = `
      SELECT
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `;

    try {
      const [columnsResult, indexesResult, foreignKeysResult] = await Promise.all([
        this.executeQuery(columnsQuery, [this.credentials.database, tableName]),
        this.executeQuery(indexesQuery, [this.credentials.database, tableName]),
        this.executeQuery(foreignKeysQuery, [this.credentials.database, tableName]),
      ]);

      const columns: SchemaColumn[] = (columnsResult.rows || []).map((row: any) => ({
        name: row.COLUMN_NAME,
        type: row.DATA_TYPE,
        nullable: row.IS_NULLABLE === 'YES',
        defaultValue: row.COLUMN_DEFAULT,
        maxLength: row.CHARACTER_MAXIMUM_LENGTH,
        precision: row.NUMERIC_PRECISION,
        scale: row.NUMERIC_SCALE,
        isAutoIncrement: row.EXTRA?.includes('auto_increment'),
        isPrimaryKey: row.COLUMN_KEY === 'PRI',
      }));

      // Group indexes by name
      const indexMap = new Map<string, SchemaIndex>();
      (indexesResult.rows || []).forEach((row: any) => {
        if (!indexMap.has(row.INDEX_NAME)) {
          indexMap.set(row.INDEX_NAME, {
            name: row.INDEX_NAME,
            columns: [],
            unique: row.NON_UNIQUE === 0,
          });
        }
        indexMap.get(row.INDEX_NAME)!.columns.push(row.COLUMN_NAME);
      });

      // Group foreign keys by constraint name
      const fkMap = new Map<string, ForeignKey>();
      (foreignKeysResult.rows || []).forEach((row: any) => {
        if (!fkMap.has(row.CONSTRAINT_NAME)) {
          fkMap.set(row.CONSTRAINT_NAME, {
            name: row.CONSTRAINT_NAME,
            columns: [],
            referencedTable: row.REFERENCED_TABLE_NAME,
            referencedColumns: [],
          });
        }
        const fk = fkMap.get(row.CONSTRAINT_NAME)!;
        fk.columns.push(row.COLUMN_NAME);
        fk.referencedColumns.push(row.REFERENCED_COLUMN_NAME);
      });

      const primaryKey = columns.filter((col) => col.isPrimaryKey).map((col) => col.name);

      return {
        name: tableName,
        columns,
        indexes: Array.from(indexMap.values()),
        foreignKeys: Array.from(fkMap.values()),
        primaryKey,
      };
    } catch (error) {
      throw new Error(`Failed to get table schema: ${error}`);
    }
  }

  async getTables(): Promise<string[]> {
    const query = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `;

    const result = await this.executeQuery(query, [this.credentials.database]);
    return (result.rows || []).map((row: any) => row.TABLE_NAME);
  }

  async createBackup(_config?: BackupConfig): Promise<string> {
    // For MySQL, we would typically use mysqldump
    throw new Error('Backup functionality requires mysqldump to be installed');
  }

  async restoreBackup(_backupPath: string): Promise<void> {
    // For MySQL, we would typically use mysql client
    throw new Error('Restore functionality requires mysql client to be installed');
  }

  async getQueryMetrics(query: string): Promise<PerformanceMetrics> {
    const explainQuery = `EXPLAIN FORMAT=JSON ${query}`;

    try {
      const startTime = Date.now();
      const result = await this.executeQuery(explainQuery);
      const executionTime = Date.now() - startTime;

      const plan = result.rows?.[0]?.['EXPLAIN'];

      return {
        executionTime,
        queryPlan: plan,
      };
    } catch (error) {
      throw new Error(`Failed to get query metrics: ${error}`);
    }
  }

  async beginTransaction(): Promise<void> {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }
    this.connection = await this.pool.getConnection();
    await this.connection.beginTransaction();
  }

  async commitTransaction(): Promise<void> {
    if (!this.connection) {
      throw new Error('No active transaction');
    }
    await this.connection.commit();
    this.connection.release();
    this.connection = null;
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.connection) {
      throw new Error('No active transaction');
    }
    await this.connection.rollback();
    this.connection.release();
    this.connection = null;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.executeQuery('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
