import crypto from 'crypto';
import { DatabaseConnection, DatabaseType, DatabaseCredentials, ConnectionStatus } from '../types/database';
import { IDatabaseAdapter } from '../adapters/base-adapter';
import { AdapterFactory } from '../adapters';

/**
 * Service for managing database connections
 */
export class ConnectionService {
  private connections: Map<string, DatabaseConnection>;
  private adapters: Map<string, IDatabaseAdapter>;
  private encryptionKey: string;

  constructor(encryptionKey?: string) {
    this.connections = new Map();
    this.adapters = new Map();
    this.encryptionKey = encryptionKey || process.env.ENCRYPTION_KEY || 'default-key-change-me';
  }

  /**
   * Create a new database connection
   */
  async createConnection(
    name: string,
    type: DatabaseType,
    credentials: DatabaseCredentials
  ): Promise<DatabaseConnection> {
    const id = crypto.randomUUID();

    // Encrypt credentials
    const encryptedCredentials = this.encryptCredentials(credentials);

    const connection: DatabaseConnection = {
      id,
      name,
      type,
      credentials: encryptedCredentials,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: ConnectionStatus.DISCONNECTED,
    };

    this.connections.set(id, connection);

    // Create and connect adapter
    const adapter = AdapterFactory.createAdapter(type, credentials);
    this.adapters.set(id, adapter);

    try {
      await adapter.connect();
      connection.status = ConnectionStatus.CONNECTED;
    } catch (error) {
      connection.status = ConnectionStatus.ERROR;
      throw error;
    }

    return connection;
  }

  /**
   * Get a connection by ID
   */
  getConnection(id: string): DatabaseConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * Get all connections
   */
  getAllConnections(): DatabaseConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get adapter for a connection
   */
  getAdapter(id: string): IDatabaseAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * Update a connection
   */
  async updateConnection(
    id: string,
    updates: Partial<Pick<DatabaseConnection, 'name' | 'credentials'>>
  ): Promise<DatabaseConnection> {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`Connection ${id} not found`);
    }

    if (updates.name) {
      connection.name = updates.name;
    }

    if (updates.credentials) {
      // Disconnect old adapter
      const oldAdapter = this.adapters.get(id);
      if (oldAdapter) {
        await oldAdapter.disconnect();
      }

      // Encrypt new credentials
      connection.credentials = this.encryptCredentials(updates.credentials);

      // Create new adapter with new credentials
      const newAdapter = AdapterFactory.createAdapter(connection.type, updates.credentials);
      this.adapters.set(id, newAdapter);

      try {
        await newAdapter.connect();
        connection.status = ConnectionStatus.CONNECTED;
      } catch (error) {
        connection.status = ConnectionStatus.ERROR;
        throw error;
      }
    }

    connection.updatedAt = new Date();
    return connection;
  }

  /**
   * Delete a connection
   */
  async deleteConnection(id: string): Promise<void> {
    const adapter = this.adapters.get(id);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(id);
    }

    this.connections.delete(id);
  }

  /**
   * Test a connection
   */
  async testConnection(id: string): Promise<boolean> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return false;
    }

    return adapter.healthCheck();
  }

  /**
   * Reconnect a connection
   */
  async reconnect(id: string): Promise<void> {
    const connection = this.connections.get(id);
    const adapter = this.adapters.get(id);

    if (!connection || !adapter) {
      throw new Error(`Connection ${id} not found`);
    }

    try {
      connection.status = ConnectionStatus.CONNECTING;
      await adapter.disconnect();

      const credentials = this.decryptCredentials(connection.credentials);
      const newAdapter = AdapterFactory.createAdapter(connection.type, credentials);
      this.adapters.set(id, newAdapter);

      await newAdapter.connect();
      connection.status = ConnectionStatus.CONNECTED;
    } catch (error) {
      connection.status = ConnectionStatus.ERROR;
      throw error;
    }
  }

  /**
   * Encrypt credentials for secure storage
   */
  private encryptCredentials(credentials: DatabaseCredentials): DatabaseCredentials {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

    const encryptField = (value: string): string => {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
      return `encrypted:${iv.toString('hex')}:${encrypted.toString('hex')}`;
    };

    return {
      ...credentials,
      password: credentials.password ? encryptField(credentials.password) : undefined,
      apiKey: credentials.apiKey ? encryptField(credentials.apiKey) : undefined,
    };
  }

  /**
   * Decrypt credentials for use
   */
  private decryptCredentials(credentials: DatabaseCredentials): DatabaseCredentials {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

    const decryptField = (field: string | undefined): string | undefined => {
      if (!field || !field.startsWith('encrypted:')) {
        return field;
      }

      const parts = field.split(':');
      const iv = Buffer.from(parts[1], 'hex');
      const encrypted = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return decrypted.toString();
    };

    return {
      ...credentials,
      password: decryptField(credentials.password),
      apiKey: decryptField(credentials.apiKey),
    };
  }

  /**
   * Get connection statistics
   */
  getStatistics() {
    const stats = {
      total: this.connections.size,
      connected: 0,
      disconnected: 0,
      error: 0,
      byType: new Map<DatabaseType, number>(),
    };

    for (const connection of this.connections.values()) {
      switch (connection.status) {
        case ConnectionStatus.CONNECTED:
          stats.connected++;
          break;
        case ConnectionStatus.DISCONNECTED:
          stats.disconnected++;
          break;
        case ConnectionStatus.ERROR:
          stats.error++;
          break;
      }

      const typeCount = stats.byType.get(connection.type) || 0;
      stats.byType.set(connection.type, typeCount + 1);
    }

    return stats;
  }
}
