import { DatabaseType, DatabaseCredentials } from '../types/database';
import { IDatabaseAdapter } from './base-adapter';
import { PostgresAdapter } from './postgres-adapter';
import { MySQLAdapter } from './mysql-adapter';
import { MongoDBAdapter } from './mongodb-adapter';
import { RedisAdapter } from './redis-adapter';
import { SQLiteAdapter } from './sqlite-adapter';
import { PineconeAdapter } from './pinecone-adapter';
import { WeaviateAdapter } from './weaviate-adapter';

export class AdapterFactory {
  static createAdapter(type: DatabaseType, credentials: DatabaseCredentials): IDatabaseAdapter {
    switch (type) {
      case DatabaseType.POSTGRESQL:
        return new PostgresAdapter(credentials);
      case DatabaseType.MYSQL:
        return new MySQLAdapter(credentials);
      case DatabaseType.MONGODB:
        return new MongoDBAdapter(credentials);
      case DatabaseType.REDIS:
        return new RedisAdapter(credentials);
      case DatabaseType.SQLITE:
        return new SQLiteAdapter(credentials);
      case DatabaseType.PINECONE:
        return new PineconeAdapter(credentials);
      case DatabaseType.WEAVIATE:
        return new WeaviateAdapter(credentials);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
}

export * from './base-adapter';
export * from './postgres-adapter';
export * from './mysql-adapter';
export * from './mongodb-adapter';
export * from './redis-adapter';
export * from './sqlite-adapter';
export * from './pinecone-adapter';
export * from './weaviate-adapter';
