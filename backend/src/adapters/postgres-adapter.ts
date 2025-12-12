import { Pool, PoolClient, PoolConfig as PgPoolConfig } from 'pg';
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

export class PostgresAdapter extends BaseAdapter {
  private pool: Pool | null = null;
  private client: PoolClient | null = null;

  constructor(credentials: DatabaseCredentials) {
    super(credentials);
  }

  async connect(): Promise<void> {
    try {
      this.status = ConnectionStatus.CONNECTING;

      const poolConfig: PgPoolConfig = {
        host: this.credentials.host,
        port: this.credentials.port || 5432,
        user: this.credentials.username,
        password: this.credentials.password,
        database: this.credentials.database,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      this.pool = new Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      client.release();

      this.status = ConnectionStatus.CONNECTED;
    } catch (error) {
      this.status = ConnectionStatus.ERROR;
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      this.status = ConnectionStatus.DISCONNECTED;
    } catch (error) {
      throw new Error(`Failed to disconnect from PostgreSQL: ${error}`);
    }
  }

  async executeQuery(query: string, params: any[] = []): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }

    try {
      const result = await this.pool.query(query, params);
      return {
        rows: result.rows,
        fields: result.fields,
        rowCount: result.rowCount || 0,
        command: result.command,
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
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;

    const primaryKeyQuery = `
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `;

    const indexesQuery = `
      SELECT
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1
      ORDER BY i.relname, a.attnum
    `;

    const foreignKeysQuery = `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
    `;

    try {
      const [columnsResult, primaryKeyResult, indexesResult, foreignKeysResult] =
        await Promise.all([
          this.executeQuery(columnsQuery, [tableName]),
          this.executeQuery(primaryKeyQuery, [tableName]),
          this.executeQuery(indexesQuery, [tableName]),
          this.executeQuery(foreignKeysQuery, [tableName]),
        ]);

      const columns: SchemaColumn[] = (columnsResult.rows || []).map((row: any) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default,
        maxLength: row.character_maximum_length,
        precision: row.numeric_precision,
        scale: row.numeric_scale,
        isAutoIncrement: row.column_default?.includes('nextval'),
        isPrimaryKey: (primaryKeyResult.rows || []).some(
          (pk: any) => pk.attname === row.column_name
        ),
      }));

      // Group indexes by name
      const indexMap = new Map<string, SchemaIndex>();
      (indexesResult.rows || []).forEach((row: any) => {
        if (!indexMap.has(row.index_name)) {
          indexMap.set(row.index_name, {
            name: row.index_name,
            columns: [],
            unique: row.is_unique,
          });
        }
        indexMap.get(row.index_name)!.columns.push(row.column_name);
      });

      // Group foreign keys by constraint name
      const fkMap = new Map<string, ForeignKey>();
      (foreignKeysResult.rows || []).forEach((row: any) => {
        if (!fkMap.has(row.constraint_name)) {
          fkMap.set(row.constraint_name, {
            name: row.constraint_name,
            columns: [],
            referencedTable: row.foreign_table_name,
            referencedColumns: [],
          });
        }
        const fk = fkMap.get(row.constraint_name)!;
        fk.columns.push(row.column_name);
        fk.referencedColumns.push(row.foreign_column_name);
      });

      return {
        name: tableName,
        columns,
        indexes: Array.from(indexMap.values()),
        foreignKeys: Array.from(fkMap.values()),
        primaryKey: (primaryKeyResult.rows || []).map((row: any) => row.attname),
      };
    } catch (error) {
      throw new Error(`Failed to get table schema: ${error}`);
    }
  }

  async getTables(): Promise<string[]> {
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const result = await this.executeQuery(query);
    return (result.rows || []).map((row: any) => row.table_name);
  }

  async createBackup(_config?: BackupConfig): Promise<string> {
    // For PostgreSQL, we would typically use pg_dump
    // This is a placeholder implementation
    throw new Error('Backup functionality requires pg_dump to be installed');
  }

  async restoreBackup(_backupPath: string): Promise<void> {
    // For PostgreSQL, we would typically use pg_restore or psql
    throw new Error('Restore functionality requires pg_restore/psql to be installed');
  }

  async getQueryMetrics(query: string): Promise<PerformanceMetrics> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;

    try {
      const result = await this.executeQuery(explainQuery);
      const plan = result.rows?.[0]?.['QUERY PLAN']?.[0];

      return {
        executionTime: plan?.['Execution Time'] || 0,
        planningTime: plan?.['Planning Time'] || 0,
        rowsReturned: plan?.['Plan']?.['Actual Rows'] || 0,
        rowsScanned: plan?.['Plan']?.['Plan Rows'] || 0,
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
    this.client = await this.pool.connect();
    await this.client.query('BEGIN');
  }

  async commitTransaction(): Promise<void> {
    if (!this.client) {
      throw new Error('No active transaction');
    }
    await this.client.query('COMMIT');
    this.client.release();
    this.client = null;
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.client) {
      throw new Error('No active transaction');
    }
    await this.client.query('ROLLBACK');
    this.client.release();
    this.client = null;
  }
}
