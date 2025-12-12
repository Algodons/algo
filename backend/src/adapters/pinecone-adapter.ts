import { Pinecone } from '@pinecone-database/pinecone';
import { BaseAdapter } from './base-adapter';
import {
  DatabaseCredentials,
  QueryResult,
  SchemaTable,
  BackupConfig,
  PerformanceMetrics,
  ConnectionStatus,
} from '../types/database';

export class PineconeAdapter extends BaseAdapter {
  private client: Pinecone | null = null;
  private indexName: string;

  constructor(credentials: DatabaseCredentials) {
    super(credentials);
    this.indexName = credentials.indexName || credentials.database || 'default';
  }

  async connect(): Promise<void> {
    try {
      this.status = ConnectionStatus.CONNECTING;

      if (!this.credentials.apiKey) {
        throw new Error('Pinecone API key is required');
      }

      this.client = new Pinecone({
        apiKey: this.credentials.apiKey,
      });

      // Test connection by listing indexes
      await this.client.listIndexes();

      this.status = ConnectionStatus.CONNECTED;
    } catch (error) {
      this.status = ConnectionStatus.ERROR;
      throw new Error(`Failed to connect to Pinecone: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.client = null;
      this.status = ConnectionStatus.DISCONNECTED;
    } catch (error) {
      throw new Error(`Failed to disconnect from Pinecone: ${error}`);
    }
  }

  async executeQuery(query: string, _params: any[] = []): Promise<QueryResult> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    try {
      const operation = JSON.parse(query);
      const index = this.client.index(this.indexName);

      let result;
      switch (operation.type) {
        case 'query':
          result = await index.query({
            vector: operation.vector,
            topK: operation.topK || 10,
            filter: operation.filter,
            includeMetadata: true,
            includeValues: true,
          });
          return {
            rows: result.matches || [],
            rowCount: result.matches?.length || 0,
          };

        case 'upsert':
          result = await index.upsert(operation.vectors);
          return {
            rows: [result],
            rowCount: operation.vectors.length,
          };

        case 'fetch':
          result = await index.fetch(operation.ids);
          return {
            rows: Object.values(result.records || {}),
            rowCount: Object.keys(result.records || {}).length,
          };

        case 'delete':
          await index.deleteOne(operation.id);
          return {
            rows: [],
            rowCount: 1,
          };

        case 'deleteAll':
          await index.deleteAll();
          return {
            rows: [],
            rowCount: 0,
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

  async getTableSchema(indexName: string): Promise<SchemaTable> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    try {
      const indexList = await this.client.listIndexes();
      const indexInfo = indexList.indexes?.find((idx) => idx.name === indexName);

      if (!indexInfo) {
        throw new Error(`Index ${indexName} not found`);
      }

      return {
        name: indexName,
        columns: [
          {
            name: 'id',
            type: 'string',
            nullable: false,
          },
          {
            name: 'values',
            type: `vector[${indexInfo.dimension}]`,
            nullable: false,
          },
          {
            name: 'metadata',
            type: 'object',
            nullable: true,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get index schema: ${error}`);
    }
  }

  async getTables(): Promise<string[]> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const indexList = await this.client.listIndexes();
    return indexList.indexes?.map((idx) => idx.name) || [];
  }

  async createBackup(_config?: BackupConfig): Promise<string> {
    throw new Error('Pinecone does not support traditional backups');
  }

  async restoreBackup(_backupPath: string): Promise<void> {
    throw new Error('Pinecone does not support traditional restores');
  }

  async getQueryMetrics(query: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    await this.executeQuery(query);
    const executionTime = Date.now() - startTime;

    return {
      executionTime,
    };
  }

  async beginTransaction(): Promise<void> {
    throw new Error('Pinecone does not support transactions');
  }

  async commitTransaction(): Promise<void> {
    throw new Error('Pinecone does not support transactions');
  }

  async rollbackTransaction(): Promise<void> {
    throw new Error('Pinecone does not support transactions');
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      await this.client.listIndexes();
      return true;
    } catch {
      return false;
    }
  }
}
