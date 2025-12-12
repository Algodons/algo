import weaviate, { WeaviateClient } from 'weaviate-ts-client';
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

export class WeaviateAdapter extends BaseAdapter {
  private client: WeaviateClient | null = null;

  constructor(credentials: DatabaseCredentials) {
    super(credentials);
  }

  async connect(): Promise<void> {
    try {
      this.status = ConnectionStatus.CONNECTING;

      const scheme = this.credentials.host?.startsWith('https') ? 'https' : 'http';
      const host = this.credentials.host?.replace(/^https?:\/\//, '') || 'localhost:8080';

      this.client = weaviate.client({
        scheme,
        host,
        apiKey: this.credentials.apiKey
          ? new weaviate.ApiKey(this.credentials.apiKey)
          : undefined,
      });

      // Test connection
      await this.client.misc.metaGetter().do();

      this.status = ConnectionStatus.CONNECTED;
    } catch (error) {
      this.status = ConnectionStatus.ERROR;
      throw new Error(`Failed to connect to Weaviate: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.client = null;
      this.status = ConnectionStatus.DISCONNECTED;
    } catch (error) {
      throw new Error(`Failed to disconnect from Weaviate: ${error}`);
    }
  }

  async executeQuery(query: string, _params: any[] = []): Promise<QueryResult> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    try {
      const operation = JSON.parse(query);

      let result;
      switch (operation.type) {
        case 'query':
          result = await this.client.graphql
            .get()
            .withClassName(operation.className)
            .withFields(operation.fields || ['_additional { id }'])
            .withLimit(operation.limit || 10)
            .do();
          return {
            rows: result.data?.Get?.[operation.className] || [],
            rowCount: result.data?.Get?.[operation.className]?.length || 0,
          };

        case 'nearVector':
          result = await this.client.graphql
            .get()
            .withClassName(operation.className)
            .withFields(operation.fields || ['_additional { id }'])
            .withNearVector({
              vector: operation.vector,
              certainty: operation.certainty || 0.7,
            })
            .withLimit(operation.limit || 10)
            .do();
          return {
            rows: result.data?.Get?.[operation.className] || [],
            rowCount: result.data?.Get?.[operation.className]?.length || 0,
          };

        case 'create':
          result = await this.client.data
            .creator()
            .withClassName(operation.className)
            .withProperties(operation.properties)
            .do();
          return {
            rows: [result],
            rowCount: 1,
          };

        case 'update':
          result = await this.client.data
            .updater()
            .withId(operation.id)
            .withClassName(operation.className)
            .withProperties(operation.properties)
            .do();
          return {
            rows: [result],
            rowCount: 1,
          };

        case 'delete':
          result = await this.client.data
            .deleter()
            .withClassName(operation.className)
            .withId(operation.id)
            .do();
          return {
            rows: [],
            rowCount: 1,
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

  async getTableSchema(className: string): Promise<SchemaTable> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    try {
      const schema = await this.client.schema.classGetter().withClassName(className).do();

      const columns: SchemaColumn[] = (schema.properties || []).map((prop: any) => ({
        name: prop.name,
        type: prop.dataType?.join(', ') || 'unknown',
        nullable: !prop.indexInverted,
      }));

      return {
        name: className,
        columns,
      };
    } catch (error) {
      throw new Error(`Failed to get class schema: ${error}`);
    }
  }

  async getTables(): Promise<string[]> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const schema = await this.client.schema.getter().do();
    return (schema.classes || []).map((cls: any) => cls.class);
  }

  async createBackup(_config?: BackupConfig): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const backupId = `backup-${Date.now()}`;
    await this.client.backup.creator().withIncludeClassNames('*').withBackupId(backupId).do();

    return backupId;
  }

  async restoreBackup(backupId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    await this.client.backup.restorer().withIncludeClassNames('*').withBackupId(backupId).do();
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
    throw new Error('Weaviate does not support traditional transactions');
  }

  async commitTransaction(): Promise<void> {
    throw new Error('Weaviate does not support traditional transactions');
  }

  async rollbackTransaction(): Promise<void> {
    throw new Error('Weaviate does not support traditional transactions');
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      await this.client.misc.liveChecker().do();
      return true;
    } catch {
      return false;
    }
  }
}
