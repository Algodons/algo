// Database types and interfaces

export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  MONGODB = 'mongodb',
  REDIS = 'redis',
  SQLITE = 'sqlite',
  PINECONE = 'pinecone',
  WEAVIATE = 'weaviate',
}

export interface DatabaseCredentials {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  connectionString?: string;
  apiKey?: string;
  environment?: string;
  indexName?: string;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  credentials: DatabaseCredentials;
  poolConfig?: PoolConfig;
  createdAt: Date;
  updatedAt: Date;
  status: ConnectionStatus;
}

export interface PoolConfig {
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  CONNECTING = 'connecting',
}

export interface QueryResult {
  rows?: any[];
  fields?: any[];
  rowCount?: number;
  command?: string;
  error?: string;
}

export interface SchemaTable {
  name: string;
  schema?: string;
  columns: SchemaColumn[];
  indexes?: SchemaIndex[];
  foreignKeys?: ForeignKey[];
  primaryKey?: string[];
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isAutoIncrement?: boolean;
  isPrimaryKey?: boolean;
}

export interface SchemaIndex {
  name: string;
  columns: string[];
  unique: boolean;
  type?: string;
}

export interface ForeignKey {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: string;
  onUpdate?: string;
}

export interface BackupConfig {
  format?: 'sql' | 'custom' | 'tar' | 'plain';
  compress?: boolean;
  schemaOnly?: boolean;
  dataOnly?: boolean;
}

export interface PerformanceMetrics {
  executionTime: number;
  rowsScanned?: number;
  rowsReturned?: number;
  bufferUsage?: number;
  planningTime?: number;
  queryPlan?: any;
}
