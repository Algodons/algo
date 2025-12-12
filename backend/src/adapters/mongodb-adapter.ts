import { MongoClient, Db } from 'mongodb';
import { BaseAdapter } from './base-adapter';
import {
  DatabaseCredentials,
  QueryResult,
  SchemaTable,
  SchemaColumn,
  BackupConfig,
  PerformanceMetrics,
  ConnectionStatus,
} from '../types/database';

export class MongoDBAdapter extends BaseAdapter {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor(credentials: DatabaseCredentials) {
    super(credentials);
  }

  async connect(): Promise<void> {
    try {
      this.status = ConnectionStatus.CONNECTING;

      const uri =
        this.credentials.connectionString ||
        `mongodb://${this.credentials.username}:${this.credentials.password}@${this.credentials.host}:${this.credentials.port || 27017}`;

      this.client = new MongoClient(uri, {
        maxPoolSize: 20,
        minPoolSize: 5,
      });

      await this.client.connect();
      this.db = this.client.db(this.credentials.database);

      // Test connection
      await this.db.admin().ping();

      this.status = ConnectionStatus.CONNECTED;
    } catch (error) {
      this.status = ConnectionStatus.ERROR;
      throw new Error(`Failed to connect to MongoDB: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
      }
      this.status = ConnectionStatus.DISCONNECTED;
    } catch (error) {
      throw new Error(`Failed to disconnect from MongoDB: ${error}`);
    }
  }

  async executeQuery(query: string, _params: any[] = []): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      // For MongoDB, we interpret "query" as a JSON string containing operation details
      const operation = JSON.parse(query);
      const collection = this.db.collection(operation.collection);

      let result;
      switch (operation.type) {
        case 'find':
          result = await collection.find(operation.filter || {}).toArray();
          return {
            rows: result,
            rowCount: result.length,
          };
        case 'findOne':
          result = await collection.findOne(operation.filter || {});
          return {
            rows: result ? [result] : [],
            rowCount: result ? 1 : 0,
          };
        case 'insertOne':
          result = await collection.insertOne(operation.document);
          return {
            rows: [{ insertedId: result.insertedId }],
            rowCount: 1,
          };
        case 'insertMany':
          result = await collection.insertMany(operation.documents);
          return {
            rows: [{ insertedIds: result.insertedIds }],
            rowCount: operation.documents.length,
          };
        case 'updateOne':
          result = await collection.updateOne(operation.filter, operation.update);
          return {
            rows: [result],
            rowCount: result.modifiedCount,
          };
        case 'updateMany':
          result = await collection.updateMany(operation.filter, operation.update);
          return {
            rows: [result],
            rowCount: result.modifiedCount,
          };
        case 'deleteOne':
          result = await collection.deleteOne(operation.filter);
          return {
            rows: [result],
            rowCount: result.deletedCount,
          };
        case 'deleteMany':
          result = await collection.deleteMany(operation.filter);
          return {
            rows: [result],
            rowCount: result.deletedCount,
          };
        case 'aggregate':
          result = await collection.aggregate(operation.pipeline).toArray();
          return {
            rows: result,
            rowCount: result.length,
          };
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  }

  async getTableSchema(collectionName: string): Promise<SchemaTable> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      const collection = this.db.collection(collectionName);

      // Sample documents to infer schema
      const samples = await collection.find().limit(100).toArray();

      if (samples.length === 0) {
        return {
          name: collectionName,
          columns: [],
        };
      }

      // Infer schema from samples
      const fieldTypes = new Map<string, Set<string>>();

      samples.forEach((doc) => {
        this.inferFieldTypes(doc, '', fieldTypes);
      });

      const columns: SchemaColumn[] = Array.from(fieldTypes.entries()).map(
        ([fieldName, types]) => ({
          name: fieldName,
          type: types.size === 1 ? Array.from(types)[0] : `Mixed (${Array.from(types).join(', ')})`,
          nullable: true, // MongoDB fields are inherently nullable
        })
      );

      // Get indexes
      const indexes = await collection.listIndexes().toArray();

      return {
        name: collectionName,
        columns,
        indexes: indexes.map((idx) => ({
          name: idx.name,
          columns: Object.keys(idx.key),
          unique: idx.unique || false,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get collection schema: ${error}`);
    }
  }

  private inferFieldTypes(
    obj: any,
    prefix: string,
    fieldTypes: Map<string, Set<string>>
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      const type = Array.isArray(value) ? 'Array' : typeof value;

      if (!fieldTypes.has(fieldName)) {
        fieldTypes.set(fieldName, new Set());
      }
      fieldTypes.get(fieldName)!.add(type);

      // Recurse for nested objects
      if (type === 'object' && value !== null && !Array.isArray(value)) {
        this.inferFieldTypes(value, fieldName, fieldTypes);
      }
    }
  }

  async getTables(): Promise<string[]> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    const collections = await this.db.listCollections().toArray();
    return collections.map((col) => col.name);
  }

  async createBackup(_config?: BackupConfig): Promise<string> {
    // For MongoDB, we would typically use mongodump
    throw new Error('Backup functionality requires mongodump to be installed');
  }

  async restoreBackup(_backupPath: string): Promise<void> {
    // For MongoDB, we would typically use mongorestore
    throw new Error('Restore functionality requires mongorestore to be installed');
  }

  async getQueryMetrics(query: string): Promise<PerformanceMetrics> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    try {
      const operation = JSON.parse(query);
      const collection = this.db.collection(operation.collection);

      const startTime = Date.now();

      // Get explain plan
      let explain;
      if (operation.type === 'find') {
        explain = await collection.find(operation.filter || {}).explain();
      } else if (operation.type === 'aggregate') {
        explain = await collection.aggregate(operation.pipeline).explain();
      }

      const executionTime = Date.now() - startTime;

      return {
        executionTime,
        queryPlan: explain,
      };
    } catch (error) {
      throw new Error(`Failed to get query metrics: ${error}`);
    }
  }

  async beginTransaction(): Promise<void> {
    // MongoDB transactions require replica sets
    // This is a placeholder for transaction support
    throw new Error('Transaction support requires MongoDB replica set configuration');
  }

  async commitTransaction(): Promise<void> {
    throw new Error('Transaction support requires MongoDB replica set configuration');
  }

  async rollbackTransaction(): Promise<void> {
    throw new Error('Transaction support requires MongoDB replica set configuration');
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }
      await this.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}
