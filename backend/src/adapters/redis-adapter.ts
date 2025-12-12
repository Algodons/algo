import Redis from 'ioredis';
import { BaseAdapter } from './base-adapter';
import {
  DatabaseCredentials,
  QueryResult,
  SchemaTable,
  BackupConfig,
  PerformanceMetrics,
  ConnectionStatus,
} from '../types/database';

export class RedisAdapter extends BaseAdapter {
  private client: Redis | null = null;

  constructor(credentials: DatabaseCredentials) {
    super(credentials);
  }

  async connect(): Promise<void> {
    try {
      this.status = ConnectionStatus.CONNECTING;

      this.client = new Redis({
        host: this.credentials.host,
        port: this.credentials.port || 6379,
        password: this.credentials.password,
        db: parseInt(this.credentials.database || '0'),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Client not initialized'));
          return;
        }

        this.client.on('ready', () => resolve());
        this.client.on('error', (err) => reject(err));

        // Set timeout
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      this.status = ConnectionStatus.CONNECTED;
    } catch (error) {
      this.status = ConnectionStatus.ERROR;
      throw new Error(`Failed to connect to Redis: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
      }
      this.status = ConnectionStatus.DISCONNECTED;
    } catch (error) {
      throw new Error(`Failed to disconnect from Redis: ${error}`);
    }
  }

  async executeQuery(query: string, _params: any[] = []): Promise<QueryResult> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    try {
      // Parse Redis command from query
      const operation = JSON.parse(query);
      const { command, args = [] } = operation;

      let result;
      switch (command.toLowerCase()) {
        case 'get':
          result = await this.client.get(args[0]);
          break;
        case 'set':
          result = await this.client.set(args[0], args[1]);
          break;
        case 'del':
          result = await this.client.del(...args);
          break;
        case 'keys':
          result = await this.client.keys(args[0] || '*');
          break;
        case 'scan':
          result = await this.client.scan(args[0] || '0', 'MATCH', args[1] || '*');
          break;
        case 'hget':
          result = await this.client.hget(args[0], args[1]);
          break;
        case 'hgetall':
          result = await this.client.hgetall(args[0]);
          break;
        case 'hset':
          result = await this.client.hset(args[0], args[1], args[2]);
          break;
        case 'lpush':
          result = await this.client.lpush(args[0], ...args.slice(1));
          break;
        case 'rpush':
          result = await this.client.rpush(args[0], ...args.slice(1));
          break;
        case 'lrange':
          result = await this.client.lrange(args[0], args[1], args[2]);
          break;
        case 'sadd':
          result = await this.client.sadd(args[0], ...args.slice(1));
          break;
        case 'smembers':
          result = await this.client.smembers(args[0]);
          break;
        default:
          throw new Error(`Unsupported Redis command: ${command}`);
      }

      return {
        rows: Array.isArray(result) ? result.map((r) => ({ value: r })) : [{ value: result }],
        rowCount: Array.isArray(result) ? result.length : 1,
      };
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  }

  async getTableSchema(keyPattern: string): Promise<SchemaTable> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    try {
      // For Redis, we can scan keys and analyze their types
      const keys = await this.client.keys(keyPattern);
      const types = await Promise.all(keys.map((key) => this.client!.type(key)));

      const typeCount = new Map<string, number>();
      types.forEach((type) => {
        typeCount.set(type, (typeCount.get(type) || 0) + 1);
      });

      return {
        name: keyPattern,
        columns: Array.from(typeCount.entries()).map(([type, count]) => ({
          name: type,
          type: 'Redis Type',
          nullable: false,
          defaultValue: `${count} keys`,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get key schema: ${error}`);
    }
  }

  async getTables(): Promise<string[]> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    // For Redis, we return key patterns
    const keys = await this.client.keys('*');
    return keys;
  }

  async createBackup(_config?: BackupConfig): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    // Trigger Redis BGSAVE
    await this.client.bgsave();
    return 'Backup initiated via BGSAVE';
  }

  async restoreBackup(_backupPath: string): Promise<void> {
    // Redis restore typically involves replacing dump.rdb file
    throw new Error('Redis restore requires manual RDB file replacement');
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
    if (!this.client) {
      throw new Error('Not connected to database');
    }
    await this.client.multi();
  }

  async commitTransaction(): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }
    // Redis transactions are executed with EXEC
    await this.client.exec();
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }
    // Redis transactions can be discarded
    await this.client.discard();
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
