import { ConnectionService } from './connection-service';
import { Readable } from 'stream';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';

const csv = require('csv-parser');
const csvStringify = require('csv-stringify/sync');

export interface ImportOptions {
  format: 'csv' | 'json' | 'sql';
  tableName: string;
  columnMapping?: Record<string, string>;
  skipErrors?: boolean;
  batchSize?: number;
  delimiter?: string;
  hasHeader?: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'sql';
  tableName?: string;
  query?: string;
  compress?: boolean;
  schemaOnly?: boolean;
  dataOnly?: boolean;
  delimiter?: string;
  chunkSize?: number;
}

export interface ImportResult {
  rowsProcessed: number;
  rowsImported: number;
  errors: Array<{ row: number; error: string }>;
  duration: number;
}

/**
 * Service for importing and exporting data
 */
export class ImportExportService {
  private connectionService: ConnectionService;
  private tempDir: string;

  constructor(connectionService: ConnectionService) {
    this.connectionService = connectionService;
    this.tempDir = process.env.TEMP_DIR || '/tmp/imports';

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Import data from CSV
   */
  async importCSV(
    connectionId: string,
    filePath: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const startTime = Date.now();
    let rowsProcessed = 0;
    let rowsImported = 0;
    const errors: Array<{ row: number; error: string }> = [];

    const batchSize = options.batchSize || 100;
    let batch: any[] = [];

    return new Promise((resolve, reject) => {
      const stream = fs
        .createReadStream(filePath)
        .pipe(csv({ separator: options.delimiter || ',', headers: options.hasHeader !== false }));

      stream.on('data', async (row: any) => {
        rowsProcessed++;

        try {
          // Apply column mapping if provided
          if (options.columnMapping) {
            const mappedRow: any = {};
            for (const [csvCol, dbCol] of Object.entries(options.columnMapping)) {
              mappedRow[dbCol] = row[csvCol];
            }
            batch.push(mappedRow);
          } else {
            batch.push(row);
          }

          // Insert batch when size is reached
          if (batch.length >= batchSize) {
            stream.pause();
            await this.insertBatch(adapter, options.tableName, batch);
            rowsImported += batch.length;
            batch = [];
            stream.resume();
          }
        } catch (error: any) {
          if (!options.skipErrors) {
            stream.destroy();
            reject(error);
          } else {
            errors.push({ row: rowsProcessed, error: error.message });
          }
        }
      });

      stream.on('end', async () => {
        // Insert remaining batch
        if (batch.length > 0) {
          try {
            await this.insertBatch(adapter, options.tableName, batch);
            rowsImported += batch.length;
          } catch (error: any) {
            errors.push({ row: rowsProcessed, error: error.message });
          }
        }

        resolve({
          rowsProcessed,
          rowsImported,
          errors,
          duration: Date.now() - startTime,
        });
      });

      stream.on('error', (error: any) => {
        reject(error);
      });
    });
  }

  /**
   * Import data from JSON
   */
  async importJSON(
    connectionId: string,
    filePath: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const startTime = Date.now();
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const rows = Array.isArray(data) ? data : [data];

    let rowsImported = 0;
    const errors: Array<{ row: number; error: string }> = [];

    const batchSize = options.batchSize || 100;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      try {
        await this.insertBatch(adapter, options.tableName, batch);
        rowsImported += batch.length;
      } catch (error: any) {
        if (!options.skipErrors) {
          throw error;
        }
        errors.push({ row: i, error: error.message });
      }
    }

    return {
      rowsProcessed: rows.length,
      rowsImported,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Export data to CSV
   */
  async exportCSV(
    connectionId: string,
    options: ExportOptions
  ): Promise<string> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const query = options.query || `SELECT * FROM ${options.tableName}`;
    const result = await adapter.executeQuery(query);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('No data to export');
    }

    const csvData = csvStringify.stringify(result.rows, {
      header: true,
      delimiter: options.delimiter || ',',
    });

    const fileName = `export-${Date.now()}.csv`;
    const filePath = path.join(this.tempDir, fileName);

    if (options.compress) {
      const gzip = zlib.createGzip();
      const writeStream = fs.createWriteStream(filePath + '.gz');
      
      await new Promise<void>((resolve, reject) => {
        Readable.from(csvData)
          .pipe(gzip)
          .pipe(writeStream)
          .on('finish', () => resolve())
          .on('error', reject);
      });

      return filePath + '.gz';
    } else {
      fs.writeFileSync(filePath, csvData);
      return filePath;
    }
  }

  /**
   * Export data to JSON
   */
  async exportJSON(
    connectionId: string,
    options: ExportOptions
  ): Promise<string> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const query = options.query || `SELECT * FROM ${options.tableName}`;
    const result = await adapter.executeQuery(query);

    const jsonData = JSON.stringify(result.rows, null, 2);
    const fileName = `export-${Date.now()}.json`;
    const filePath = path.join(this.tempDir, fileName);

    if (options.compress) {
      const gzip = zlib.createGzip();
      const writeStream = fs.createWriteStream(filePath + '.gz');
      
      await new Promise<void>((resolve, reject) => {
        Readable.from(jsonData)
          .pipe(gzip)
          .pipe(writeStream)
          .on('finish', () => resolve())
          .on('error', reject);
      });

      return filePath + '.gz';
    } else {
      fs.writeFileSync(filePath, jsonData);
      return filePath;
    }
  }

  /**
   * Export data as SQL dump
   */
  async exportSQL(
    connectionId: string,
    options: ExportOptions
  ): Promise<string> {
    const adapter = this.connectionService.getAdapter(connectionId);

    if (!adapter) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const fileName = `export-${Date.now()}.sql`;
    const filePath = path.join(this.tempDir, fileName);
    const writeStream = fs.createWriteStream(filePath);

    // Export schema if needed
    if (!options.dataOnly) {
      const tables = await adapter.getTables();

      for (const tableName of tables) {
        const schema = await adapter.getTableSchema(tableName);
        const createSQL = this.generateCreateTableSQL(schema);
        writeStream.write(createSQL + '\n\n');
      }
    }

    // Export data if needed
    if (!options.schemaOnly) {
      const tables = options.tableName ? [options.tableName] : await adapter.getTables();

      for (const tableName of tables) {
        const result = await adapter.executeQuery(`SELECT * FROM ${tableName}`);

        if (result.rows && result.rows.length > 0) {
          for (const row of result.rows) {
            const insertSQL = this.generateInsertSQL(tableName, row);
            writeStream.write(insertSQL + '\n');
          }
          writeStream.write('\n');
        }
      }
    }

    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    if (options.compress) {
      const gzipPath = filePath + '.gz';
      await this.compressFile(filePath, gzipPath);
      fs.unlinkSync(filePath);
      return gzipPath;
    }

    return filePath;
  }

  /**
   * Insert a batch of rows
   */
  private async insertBatch(adapter: any, tableName: string, rows: any[]): Promise<void> {
    const columns = Object.keys(rows[0]);
    const values = rows.map((row) => columns.map((col) => row[col]));

    // Use simple INSERT with multiple VALUES for better compatibility
    const valueStrings = values
      .map((rowValues) => {
        const escapedValues = rowValues.map((val) => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'number') return val;
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        return `(${escapedValues.join(', ')})`;
      })
      .join(', ');

    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${valueStrings}`;

    await adapter.executeQuery(query);
  }

  /**
   * Generate CREATE TABLE SQL from schema
   */
  private generateCreateTableSQL(schema: any): string {
    const columns = schema.columns
      .map((col: any) => {
        let def = `  ${col.name} ${col.type}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        return def;
      })
      .join(',\n');

    let sql = `CREATE TABLE ${schema.name} (\n${columns}`;

    if (schema.primaryKey && schema.primaryKey.length > 0) {
      sql += `,\n  PRIMARY KEY (${schema.primaryKey.join(', ')})`;
    }

    sql += '\n);';

    return sql;
  }

  /**
   * Generate INSERT SQL from row data
   */
  private generateInsertSQL(tableName: string, row: any): string {
    const columns = Object.keys(row);
    const values = Object.values(row).map((v) => {
      if (v === null) return 'NULL';
      if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
      return v;
    });

    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
  }

  /**
   * Compress a file using gzip
   */
  private async compressFile(inputPath: string, outputPath: string): Promise<void> {
    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);
    const gzip = zlib.createGzip();

    return new Promise((resolve, reject) => {
      readStream
        .pipe(gzip)
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
  }
}
