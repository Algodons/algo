import {
  DatabaseCredentials,
  QueryResult,
  SchemaTable,
  BackupConfig,
  PerformanceMetrics,
  ConnectionStatus,
} from '../types/database';

/**
 * Base interface that all database adapters must implement
 */
export interface IDatabaseAdapter {
  /**
   * Connect to the database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;

  /**
   * Check connection health
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus;

  /**
   * Execute a query
   */
  executeQuery(query: string, params?: any[]): Promise<QueryResult>;

  /**
   * Get schema information for a table
   */
  getTableSchema(tableName: string): Promise<SchemaTable>;

  /**
   * Get all tables in the database
   */
  getTables(): Promise<string[]>;

  /**
   * Create a backup
   */
  createBackup(config?: BackupConfig): Promise<string>;

  /**
   * Restore from backup
   */
  restoreBackup(backupPath: string): Promise<void>;

  /**
   * Get performance metrics for a query
   */
  getQueryMetrics(query: string): Promise<PerformanceMetrics>;

  /**
   * Begin a transaction
   */
  beginTransaction(): Promise<void>;

  /**
   * Commit a transaction
   */
  commitTransaction(): Promise<void>;

  /**
   * Rollback a transaction
   */
  rollbackTransaction(): Promise<void>;
}

/**
 * Base abstract class providing common functionality
 */
export abstract class BaseAdapter implements IDatabaseAdapter {
  protected credentials: DatabaseCredentials;
  protected status: ConnectionStatus = ConnectionStatus.DISCONNECTED;

  constructor(credentials: DatabaseCredentials) {
    this.credentials = credentials;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract executeQuery(query: string, params?: any[]): Promise<QueryResult>;
  abstract getTableSchema(tableName: string): Promise<SchemaTable>;
  abstract getTables(): Promise<string[]>;
  abstract createBackup(config?: BackupConfig): Promise<string>;
  abstract restoreBackup(backupPath: string): Promise<void>;
  abstract getQueryMetrics(query: string): Promise<PerformanceMetrics>;
  abstract beginTransaction(): Promise<void>;
  abstract commitTransaction(): Promise<void>;
  abstract rollbackTransaction(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;

  getStatus(): ConnectionStatus {
    return this.status;
  }
}
