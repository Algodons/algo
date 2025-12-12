import { ConnectionService } from './connection-service';
import { SchemaTable, SchemaColumn, SchemaIndex, ForeignKey } from '../types/database';

export interface TableCreateOptions {
  name: string;
  columns: SchemaColumn[];
  primaryKey?: string[];
  indexes?: SchemaIndex[];
  foreignKeys?: ForeignKey[];
}

export interface ColumnModification {
  action: 'add' | 'modify' | 'drop';
  column?: SchemaColumn;
  oldName?: string;
  newName?: string;
}

/**
 * Service for schema introspection and modification
 */
export class SchemaService {
  private connectionService: ConnectionService;

  constructor(connectionService: ConnectionService) {
    this.connectionService = connectionService;
  }

  /**
   * Get schema for all tables in a database
   */
  async getSchema(connectionId: string): Promise<SchemaTable[]> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const tables = await adapter.getTables();
    const schemas: SchemaTable[] = [];

    for (const tableName of tables) {
      try {
        const schema = await adapter.getTableSchema(tableName);
        schemas.push(schema);
      } catch (error) {
        console.error(`Failed to get schema for table ${tableName}:`, error);
      }
    }

    return schemas;
  }

  /**
   * Get schema for a specific table
   */
  async getTableSchema(connectionId: string, tableName: string): Promise<SchemaTable> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    return adapter.getTableSchema(tableName);
  }

  /**
   * Create a new table
   */
  async createTable(connectionId: string, options: TableCreateOptions): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const connection = this.connectionService.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Generate CREATE TABLE SQL based on database type
    const sql = this.generateCreateTableSQL(connection.type, options);

    await adapter.executeQuery(sql);
  }

  /**
   * Drop a table
   */
  async dropTable(connectionId: string, tableName: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    await adapter.executeQuery(`DROP TABLE IF EXISTS ${tableName}`);
  }

  /**
   * Modify table columns
   */
  async modifyTable(
    connectionId: string,
    tableName: string,
    modifications: ColumnModification[]
  ): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const connection = this.connectionService.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    for (const mod of modifications) {
      const sql = this.generateModifyColumnSQL(connection.type, tableName, mod);
      await adapter.executeQuery(sql);
    }
  }

  /**
   * Add an index to a table
   */
  async addIndex(connectionId: string, tableName: string, index: SchemaIndex): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const unique = index.unique ? 'UNIQUE' : '';
    const columns = index.columns.join(', ');
    const sql = `CREATE ${unique} INDEX ${index.name} ON ${tableName} (${columns})`;

    await adapter.executeQuery(sql);
  }

  /**
   * Drop an index
   */
  async dropIndex(connectionId: string, tableName: string, indexName: string): Promise<void> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const connection = this.connectionService.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // SQLite uses different syntax
    const sql =
      connection.type === 'sqlite'
        ? `DROP INDEX IF EXISTS ${indexName}`
        : `DROP INDEX IF EXISTS ${indexName} ON ${tableName}`;

    await adapter.executeQuery(sql);
  }

  /**
   * Generate CREATE TABLE SQL for different database types
   */
  private generateCreateTableSQL(dbType: string, options: TableCreateOptions): string {
    const columns = options.columns
      .map((col) => {
        let def = `${col.name} ${col.type}`;

        if (!col.nullable) {
          def += ' NOT NULL';
        }

        if (col.defaultValue !== undefined) {
          def += ` DEFAULT ${col.defaultValue}`;
        }

        if (col.isAutoIncrement) {
          if (dbType === 'mysql') {
            def += ' AUTO_INCREMENT';
          } else if (dbType === 'postgresql') {
            def = `${col.name} SERIAL`;
          } else if (dbType === 'sqlite') {
            def += ' AUTOINCREMENT';
          }
        }

        return def;
      })
      .join(', ');

    let sql = `CREATE TABLE ${options.name} (${columns}`;

    if (options.primaryKey && options.primaryKey.length > 0) {
      sql += `, PRIMARY KEY (${options.primaryKey.join(', ')})`;
    }

    if (options.foreignKeys) {
      for (const fk of options.foreignKeys) {
        sql += `, CONSTRAINT ${fk.name} FOREIGN KEY (${fk.columns.join(', ')}) `;
        sql += `REFERENCES ${fk.referencedTable} (${fk.referencedColumns.join(', ')})`;

        if (fk.onDelete) {
          sql += ` ON DELETE ${fk.onDelete}`;
        }

        if (fk.onUpdate) {
          sql += ` ON UPDATE ${fk.onUpdate}`;
        }
      }
    }

    sql += ')';

    return sql;
  }

  /**
   * Generate column modification SQL
   */
  private generateModifyColumnSQL(
    dbType: string,
    tableName: string,
    mod: ColumnModification
  ): string {
    switch (mod.action) {
      case 'add':
        if (!mod.column) {
          throw new Error('Column definition required for add action');
        }
        const colDef = `${mod.column.name} ${mod.column.type}${mod.column.nullable ? '' : ' NOT NULL'}`;
        return `ALTER TABLE ${tableName} ADD COLUMN ${colDef}`;

      case 'drop':
        if (!mod.column) {
          throw new Error('Column name required for drop action');
        }
        return `ALTER TABLE ${tableName} DROP COLUMN ${mod.column.name}`;

      case 'modify':
        if (!mod.column) {
          throw new Error('Column definition required for modify action');
        }
        if (dbType === 'mysql') {
          const modDef = `${mod.column.name} ${mod.column.type}${mod.column.nullable ? '' : ' NOT NULL'}`;
          return `ALTER TABLE ${tableName} MODIFY COLUMN ${modDef}`;
        } else if (dbType === 'postgresql') {
          return `ALTER TABLE ${tableName} ALTER COLUMN ${mod.column.name} TYPE ${mod.column.type}`;
        } else {
          throw new Error(`Column modification not supported for ${dbType}`);
        }

      default:
        throw new Error(`Unknown modification action: ${mod.action}`);
    }
  }

  /**
   * Compare two schemas and generate differences
   */
  async compareSchemas(
    connectionId1: string,
    connectionId2: string
  ): Promise<{ added: string[]; removed: string[]; modified: string[] }> {
    const schema1 = await this.getSchema(connectionId1);
    const schema2 = await this.getSchema(connectionId2);

    const tables1 = new Set(schema1.map((t) => t.name));
    const tables2 = new Set(schema2.map((t) => t.name));

    const added = Array.from(tables2).filter((t) => !tables1.has(t));
    const removed = Array.from(tables1).filter((t) => !tables2.has(t));
    const common = Array.from(tables1).filter((t) => tables2.has(t));

    const modified: string[] = [];
    for (const tableName of common) {
      const table1 = schema1.find((t) => t.name === tableName)!;
      const table2 = schema2.find((t) => t.name === tableName)!;

      // Simple comparison - compare column count
      if (table1.columns.length !== table2.columns.length) {
        modified.push(tableName);
      }
    }

    return { added, removed, modified };
  }
}
