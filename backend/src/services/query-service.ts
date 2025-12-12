import { ConnectionService } from './connection-service';
import { QueryResult } from '../types/database';

export interface QueryHistory {
  id: string;
  connectionId: string;
  query: string;
  params?: any[];
  result?: QueryResult;
  executionTime: number;
  timestamp: Date;
  error?: string;
}

/**
 * Service for executing queries and managing query history
 */
export class QueryService {
  private connectionService: ConnectionService;
  private queryHistory: Map<string, QueryHistory[]>;

  constructor(connectionService: ConnectionService) {
    this.connectionService = connectionService;
    this.queryHistory = new Map();
  }

  /**
   * Execute a query on a specific connection
   */
  async executeQuery(
    connectionId: string,
    query: string,
    params?: any[]
  ): Promise<QueryResult> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const startTime = Date.now();
    let result: QueryResult;
    let error: string | undefined;

    try {
      result = await adapter.executeQuery(query, params);
      error = result.error;
    } catch (err: any) {
      result = { error: err.message };
      error = err.message;
    }

    const executionTime = Date.now() - startTime;

    // Save to history
    this.addToHistory({
      id: crypto.randomUUID(),
      connectionId,
      query,
      params,
      result,
      executionTime,
      timestamp: new Date(),
      error,
    });

    return result;
  }

  /**
   * Get query history for a connection
   */
  getHistory(connectionId: string, limit: number = 50): QueryHistory[] {
    const history = this.queryHistory.get(connectionId) || [];
    return history.slice(-limit);
  }

  /**
   * Clear query history for a connection
   */
  clearHistory(connectionId: string): void {
    this.queryHistory.delete(connectionId);
  }

  /**
   * Add query to history
   */
  private addToHistory(entry: QueryHistory): void {
    if (!this.queryHistory.has(entry.connectionId)) {
      this.queryHistory.set(entry.connectionId, []);
    }

    const history = this.queryHistory.get(entry.connectionId)!;
    history.push(entry);

    // Keep only last 100 queries per connection
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get tables for a connection
   */
  async getTables(connectionId: string): Promise<string[]> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    return adapter.getTables();
  }

  /**
   * Get schema for a table
   */
  async getTableSchema(connectionId: string, tableName: string) {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    return adapter.getTableSchema(tableName);
  }

  /**
   * Get query performance metrics
   */
  async getQueryMetrics(connectionId: string, query: string) {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    return adapter.getQueryMetrics(query);
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(connectionId: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    await adapter.beginTransaction();
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(connectionId: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    await adapter.commitTransaction();
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(connectionId: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    await adapter.rollbackTransaction();
  }
}
