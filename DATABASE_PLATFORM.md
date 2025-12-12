# Database Management Platform

A comprehensive database management and tooling platform that supports multiple database types with full lifecycle management capabilities.

## Supported Databases

### Relational Databases
- **PostgreSQL** - Full support with connection pooling, schema introspection, and EXPLAIN/ANALYZE
- **MySQL** - Complete CRUD operations with schema management
- **SQLite** - Lightweight embedded database with backup/restore capabilities

### NoSQL Databases
- **MongoDB** - Document database with aggregation pipeline support
- **Redis** - Key-value store for caching and real-time applications

### Vector Databases (AI/ML)
- **Pinecone** - Vector database for semantic search and embeddings
- **Weaviate** - Vector search engine with GraphQL API

## Core Features

### 1. Database Connection & Management

**Unified Connection Manager**
- Single interface for all database types
- Connection pooling with configurable limits
- Secure credential storage with AES-256 encryption
- Connection health monitoring and auto-reconnect
- Multi-tenant connection isolation

**API Endpoints:**
```
POST   /api/databases/connections              - Create a new connection
GET    /api/databases/connections              - List all connections
GET    /api/databases/connections/:id          - Get connection details
PUT    /api/databases/connections/:id          - Update connection
DELETE /api/databases/connections/:id          - Delete connection
POST   /api/databases/connections/:id/test     - Test connection health
POST   /api/databases/connections/:id/reconnect - Reconnect
GET    /api/databases/connections/stats/overview - Get statistics
```

**Example:**
```bash
# Create a PostgreSQL connection
curl -X POST http://localhost:4000/api/databases/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production DB",
    "type": "postgresql",
    "credentials": {
      "host": "localhost",
      "port": 5432,
      "username": "admin",
      "password": "secret",
      "database": "mydb"
    }
  }'
```

### 2. Query Execution & History

**Query Service Features:**
- Execute SQL queries with parameter binding
- Query history tracking (last 100 queries per connection)
- Transaction support (BEGIN, COMMIT, ROLLBACK)
- Performance metrics collection
- Error handling and logging

**API Endpoints:**
```
POST   /api/databases/connections/:id/query                 - Execute query
GET    /api/databases/connections/:id/query/history         - Get query history
DELETE /api/databases/connections/:id/query/history         - Clear history
POST   /api/databases/connections/:id/query/metrics         - Get query metrics
POST   /api/databases/connections/:id/transaction/begin     - Begin transaction
POST   /api/databases/connections/:id/transaction/commit    - Commit transaction
POST   /api/databases/connections/:id/transaction/rollback  - Rollback transaction
```

**Example:**
```bash
# Execute a query
curl -X POST http://localhost:4000/api/databases/connections/{id}/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM users WHERE age > $1",
    "params": [18]
  }'
```

### 3. Schema Management

**Schema Service Features:**
- Complete schema introspection
- Create, modify, and drop tables
- Column modifications (add, modify, drop)
- Index management (create, drop)
- Foreign key relationships
- Schema comparison and diff views
- Multi-database schema export

**API Endpoints:**
```
GET    /api/databases/connections/:id/schema                     - Get full schema
GET    /api/databases/connections/:id/schema/:table              - Get table schema
POST   /api/databases/connections/:id/schema/tables              - Create table
DELETE /api/databases/connections/:id/schema/tables/:table       - Drop table
PUT    /api/databases/connections/:id/schema/tables/:table       - Modify table
POST   /api/databases/connections/:id/schema/tables/:table/indexes - Add index
DELETE /api/databases/connections/:id/schema/tables/:table/indexes/:index - Drop index
GET    /api/databases/connections/:id/tables                     - List tables
GET    /api/databases/connections/:id/tables/:table/schema       - Get table schema
POST   /api/databases/schema/compare                             - Compare schemas
```

**Example:**
```bash
# Create a new table
curl -X POST http://localhost:4000/api/databases/connections/{id}/schema/tables \
  -H "Content-Type: application/json" \
  -d '{
    "name": "users",
    "columns": [
      {"name": "id", "type": "INTEGER", "nullable": false, "isPrimaryKey": true},
      {"name": "email", "type": "VARCHAR(255)", "nullable": false},
      {"name": "created_at", "type": "TIMESTAMP", "nullable": false}
    ],
    "primaryKey": ["id"]
  }'
```

### 4. Migration Manager

**Migration Service Features:**
- Version-controlled schema changes
- Up/down migration support
- Dependency tracking between migrations
- Dry-run mode for testing
- Migration history and status tracking
- Rollback capabilities
- Locking mechanism to prevent concurrent runs

**API Endpoints:**
```
POST   /api/databases/connections/:id/migrations/init              - Initialize system
POST   /api/databases/connections/:id/migrations                   - Create migration
GET    /api/databases/connections/:id/migrations                   - List migrations
GET    /api/databases/connections/:id/migrations/:migrationId      - Get migration
POST   /api/databases/connections/:id/migrations/:migrationId/apply - Apply migration
POST   /api/databases/connections/:id/migrations/:migrationId/rollback - Rollback
POST   /api/databases/connections/:id/migrations/apply-all         - Apply all pending
POST   /api/databases/connections/:id/migrations/rollback-to/:version - Rollback to version
GET    /api/databases/connections/:id/migrations/status            - Get status
GET    /api/databases/connections/:id/migrations/:migrationId/dry-run - Dry run
```

**Example:**
```bash
# Create a migration
curl -X POST http://localhost:4000/api/databases/connections/{id}/migrations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "add_users_table",
    "up": "CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255));",
    "down": "DROP TABLE users;"
  }'
```

### 5. Import/Export Tools

**Import Features:**
- CSV import with column mapping
- JSON import (single records or arrays)
- SQL dump import
- Data type inference
- Validation and error handling
- Batch processing for large files
- Resume interrupted imports
- Duplicate handling strategies

**Export Features:**
- CSV export with custom delimiters
- JSON export (formatted or compact)
- SQL dump generation (schema + data)
- Chunked export for large datasets
- Compression (gzip)
- Schema-only or data-only exports

**API Endpoints:**
```
POST /api/databases/connections/:id/import/csv     - Import CSV file
POST /api/databases/connections/:id/import/json    - Import JSON file
POST /api/databases/connections/:id/export/csv     - Export to CSV
POST /api/databases/connections/:id/export/json    - Export to JSON
POST /api/databases/connections/:id/export/sql     - Export to SQL dump
```

**Example:**
```bash
# Export data to CSV
curl -X POST http://localhost:4000/api/databases/connections/{id}/export/csv \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "users",
    "compress": true,
    "delimiter": ","
  }' \
  --output export.csv.gz
```

### 6. Backup Automation

**Backup Service Features:**
- Manual on-demand backups
- Scheduled automated backups (cron-based)
- Incremental and full backup strategies
- Backup retention policies
- Compression and encryption support
- Backup verification
- Multi-format support (SQL, custom, tar)
- Point-in-time recovery (PITR)

**API Endpoints:**
```
POST   /api/databases/connections/:id/backups                       - Create backup
GET    /api/databases/connections/:id/backups                       - List backups
GET    /api/databases/connections/:id/backups/:backupId             - Get backup details
POST   /api/databases/connections/:id/backups/:backupId/restore     - Restore backup
DELETE /api/databases/connections/:id/backups/:backupId             - Delete backup
GET    /api/databases/connections/:id/backups/:backupId/download    - Download backup
POST   /api/databases/connections/:id/backups/schedules             - Schedule backup
GET    /api/databases/connections/:id/backups/schedules             - List schedules
PUT    /api/databases/connections/:id/backups/schedules/:scheduleId - Update schedule
DELETE /api/databases/connections/:id/backups/schedules/:scheduleId - Delete schedule
POST   /api/databases/connections/:id/backups/apply-retention       - Apply retention
POST   /api/databases/connections/:id/backups/pitr                  - Point-in-time recovery
```

**Example:**
```bash
# Create a backup
curl -X POST http://localhost:4000/api/databases/connections/{id}/backups \
  -H "Content-Type: application/json" \
  -d '{
    "format": "sql",
    "compress": true,
    "schemaOnly": false,
    "dataOnly": false
  }'

# Schedule automated backups
curl -X POST http://localhost:4000/api/databases/connections/{id}/backups/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "cron": "0 2 * * *",
    "retention": 7,
    "options": {
      "format": "sql",
      "compress": true
    }
  }'
```

### 7. Performance Metrics

**Query Performance Features:**
- EXPLAIN/ANALYZE query plan visualization
- Execution time tracking
- Rows scanned vs returned analysis
- Buffer usage statistics
- Query plan tree inspection

**Example:**
```bash
# Get query metrics
curl -X POST http://localhost:4000/api/databases/connections/{id}/query/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM users WHERE age > 18"
  }'
```

## Technical Architecture

### Database Adapters

Each database type has a dedicated adapter implementing a unified interface:

```typescript
interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  executeQuery(query: string, params?: any[]): Promise<QueryResult>;
  getTableSchema(tableName: string): Promise<SchemaTable>;
  getTables(): Promise<string[]>;
  createBackup(config?: BackupConfig): Promise<string>;
  restoreBackup(backupPath: string): Promise<void>;
  getQueryMetrics(query: string): Promise<PerformanceMetrics>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
}
```

### Services Layer

- **ConnectionService** - Database connection lifecycle management
- **QueryService** - Query execution and history
- **SchemaService** - Schema introspection and modifications
- **MigrationService** - Migration creation and execution
- **ImportExportService** - Data import/export operations
- **BackupService** - Backup scheduling and restoration

### Security Features

- **Credential Encryption** - AES-256 encryption for stored credentials
- **Connection Pooling** - Configurable pool limits to prevent resource exhaustion
- **Input Validation** - SQL injection prevention and parameter binding
- **Health Monitoring** - Automatic connection health checks
- **Transaction Safety** - ACID compliance for supported databases

## Installation

```bash
# Install dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Build the project
npm run build

# Start the development server
npm run dev
```

## Configuration

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=4000
FRONTEND_URL=http://localhost:3000

# Security
ENCRYPTION_KEY=your-secure-encryption-key-change-me

# Storage Paths
TEMP_DIR=/tmp/imports
UPLOAD_DIR=/tmp/uploads
BACKUP_DIR=/tmp/backups
```

## Usage Examples

### Complete Workflow Example

```bash
# 1. Create a connection
CONNECTION_ID=$(curl -s -X POST http://localhost:4000/api/databases/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Database",
    "type": "postgresql",
    "credentials": {
      "host": "localhost",
      "port": 5432,
      "username": "admin",
      "password": "secret",
      "database": "mydb"
    }
  }' | jq -r '.id')

# 2. List all tables
curl http://localhost:4000/api/databases/connections/$CONNECTION_ID/tables

# 3. Get schema for a table
curl http://localhost:4000/api/databases/connections/$CONNECTION_ID/tables/users/schema

# 4. Execute a query
curl -X POST http://localhost:4000/api/databases/connections/$CONNECTION_ID/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM users LIMIT 10"
  }'

# 5. Create a backup
curl -X POST http://localhost:4000/api/databases/connections/$CONNECTION_ID/backups \
  -H "Content-Type: application/json" \
  -d '{
    "format": "sql",
    "compress": true
  }'

# 6. Export data
curl -X POST http://localhost:4000/api/databases/connections/$CONNECTION_ID/export/csv \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "users",
    "compress": false
  }' \
  --output users.csv
```

## API Documentation

Full API documentation is available at `/api/docs` when running the server.

## Development

```bash
# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/Algodons/algo/issues
- Documentation: See `/docs` directory
