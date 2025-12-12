# Database Management Platform API Reference

## Base URL
```
http://localhost:4000/api/databases
```

## Authentication
Currently, the API does not require authentication. In production, implement JWT or API key authentication.

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

## Connection Management

### Create Connection
```http
POST /connections
Content-Type: application/json

{
  "name": "string",
  "type": "postgresql|mysql|mongodb|redis|sqlite|pinecone|weaviate",
  "credentials": {
    "host": "string",
    "port": number,
    "username": "string",
    "password": "string",
    "database": "string",
    "connectionString": "string (optional)",
    "apiKey": "string (for vector DBs)",
    "indexName": "string (for Pinecone)"
  },
  "poolConfig": {
    "min": number,
    "max": number,
    "idleTimeoutMillis": number,
    "connectionTimeoutMillis": number
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "type": "string",
  "status": "connected|disconnected|error",
  "createdAt": "ISO8601 timestamp",
  "updatedAt": "ISO8601 timestamp"
}
```

### List Connections
```http
GET /connections
```

**Response:**
```json
{
  "connections": [
    {
      "id": "uuid",
      "name": "string",
      "type": "string",
      "status": "string",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

### Get Connection
```http
GET /connections/:id
```

### Update Connection
```http
PUT /connections/:id
Content-Type: application/json

{
  "name": "string (optional)",
  "credentials": { ... } (optional)
}
```

### Delete Connection
```http
DELETE /connections/:id
```

**Response:** `204 No Content`

### Test Connection
```http
POST /connections/:id/test
```

**Response:**
```json
{
  "healthy": boolean
}
```

### Reconnect
```http
POST /connections/:id/reconnect
```

### Get Statistics
```http
GET /connections/stats/overview
```

**Response:**
```json
{
  "total": number,
  "connected": number,
  "disconnected": number,
  "error": number,
  "byType": {
    "postgresql": number,
    "mysql": number,
    ...
  }
}
```

## Query Operations

### Execute Query
```http
POST /connections/:connectionId/query
Content-Type: application/json

{
  "query": "string",
  "params": [any] (optional)
}
```

**Response:**
```json
{
  "rows": [object],
  "fields": [object],
  "rowCount": number,
  "command": "string",
  "error": "string (if error)"
}
```

### Get Query History
```http
GET /connections/:connectionId/query/history?limit=50
```

**Response:**
```json
{
  "history": [
    {
      "id": "uuid",
      "connectionId": "uuid",
      "query": "string",
      "params": [any],
      "result": { ... },
      "executionTime": number,
      "timestamp": "ISO8601",
      "error": "string (optional)"
    }
  ]
}
```

### Clear Query History
```http
DELETE /connections/:connectionId/query/history
```

**Response:** `204 No Content`

### Get Tables
```http
GET /connections/:connectionId/tables
```

**Response:**
```json
{
  "tables": ["string"]
}
```

### Get Table Schema
```http
GET /connections/:connectionId/tables/:tableName/schema
```

**Response:**
```json
{
  "name": "string",
  "columns": [
    {
      "name": "string",
      "type": "string",
      "nullable": boolean,
      "defaultValue": any,
      "maxLength": number,
      "precision": number,
      "scale": number,
      "isAutoIncrement": boolean,
      "isPrimaryKey": boolean
    }
  ],
  "indexes": [
    {
      "name": "string",
      "columns": ["string"],
      "unique": boolean,
      "type": "string"
    }
  ],
  "foreignKeys": [
    {
      "name": "string",
      "columns": ["string"],
      "referencedTable": "string",
      "referencedColumns": ["string"],
      "onDelete": "string",
      "onUpdate": "string"
    }
  ],
  "primaryKey": ["string"]
}
```

### Get Query Metrics
```http
POST /connections/:connectionId/query/metrics
Content-Type: application/json

{
  "query": "string"
}
```

**Response:**
```json
{
  "executionTime": number,
  "rowsScanned": number,
  "rowsReturned": number,
  "bufferUsage": number,
  "planningTime": number,
  "queryPlan": object
}
```

### Transaction Operations
```http
POST /connections/:connectionId/transaction/begin
POST /connections/:connectionId/transaction/commit
POST /connections/:connectionId/transaction/rollback
```

## Schema Management

### Get Full Schema
```http
GET /connections/:connectionId/schema
```

**Response:**
```json
{
  "tables": [
    {
      "name": "string",
      "columns": [...],
      "indexes": [...],
      "foreignKeys": [...],
      "primaryKey": [...]
    }
  ]
}
```

### Get Table Schema
```http
GET /connections/:connectionId/schema/:tableName
```

### Create Table
```http
POST /connections/:connectionId/schema/tables
Content-Type: application/json

{
  "name": "string",
  "columns": [
    {
      "name": "string",
      "type": "string",
      "nullable": boolean,
      "defaultValue": any,
      "isAutoIncrement": boolean,
      "isPrimaryKey": boolean
    }
  ],
  "primaryKey": ["string"],
  "indexes": [
    {
      "name": "string",
      "columns": ["string"],
      "unique": boolean
    }
  ],
  "foreignKeys": [
    {
      "name": "string",
      "columns": ["string"],
      "referencedTable": "string",
      "referencedColumns": ["string"],
      "onDelete": "CASCADE|SET NULL|RESTRICT",
      "onUpdate": "CASCADE|SET NULL|RESTRICT"
    }
  ]
}
```

### Drop Table
```http
DELETE /connections/:connectionId/schema/tables/:tableName
```

### Modify Table
```http
PUT /connections/:connectionId/schema/tables/:tableName
Content-Type: application/json

{
  "modifications": [
    {
      "action": "add|modify|drop",
      "column": {
        "name": "string",
        "type": "string",
        "nullable": boolean
      }
    }
  ]
}
```

### Add Index
```http
POST /connections/:connectionId/schema/tables/:tableName/indexes
Content-Type: application/json

{
  "name": "string",
  "columns": ["string"],
  "unique": boolean
}
```

### Drop Index
```http
DELETE /connections/:connectionId/schema/tables/:tableName/indexes/:indexName
```

### Compare Schemas
```http
POST /schema/compare
Content-Type: application/json

{
  "connectionId1": "uuid",
  "connectionId2": "uuid"
}
```

**Response:**
```json
{
  "added": ["string"],
  "removed": ["string"],
  "modified": ["string"]
}
```

## Migration Management

### Initialize Migration System
```http
POST /connections/:connectionId/migrations/init
```

### Create Migration
```http
POST /connections/:connectionId/migrations
Content-Type: application/json

{
  "name": "string",
  "up": "string (SQL)",
  "down": "string (SQL)",
  "dependencies": ["migrationId"] (optional)
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "version": number,
  "up": "string",
  "down": "string",
  "dependencies": ["string"],
  "createdAt": "ISO8601",
  "status": "pending|applied|failed|rolled_back"
}
```

### List Migrations
```http
GET /connections/:connectionId/migrations
```

### Get Migration
```http
GET /connections/:connectionId/migrations/:migrationId
```

### Apply Migration
```http
POST /connections/:connectionId/migrations/:migrationId/apply
```

### Rollback Migration
```http
POST /connections/:connectionId/migrations/:migrationId/rollback
```

### Apply All Pending
```http
POST /connections/:connectionId/migrations/apply-all
```

### Rollback to Version
```http
POST /connections/:connectionId/migrations/rollback-to/:version
```

### Get Migration Status
```http
GET /connections/:connectionId/migrations/status
```

**Response:**
```json
{
  "total": number,
  "pending": number,
  "applied": number,
  "failed": number,
  "latest": {
    "id": "uuid",
    "name": "string",
    "version": number,
    "status": "string"
  }
}
```

### Dry Run
```http
GET /connections/:connectionId/migrations/:migrationId/dry-run
```

**Response:**
```json
{
  "sql": "string"
}
```

## Import/Export

### Import CSV
```http
POST /connections/:connectionId/import/csv
Content-Type: multipart/form-data

file: <file>
tableName: string
columnMapping: JSON string (optional)
skipErrors: boolean
batchSize: number
delimiter: string
hasHeader: boolean
```

**Response:**
```json
{
  "rowsProcessed": number,
  "rowsImported": number,
  "errors": [
    {
      "row": number,
      "error": "string"
    }
  ],
  "duration": number
}
```

### Import JSON
```http
POST /connections/:connectionId/import/json
Content-Type: multipart/form-data

file: <file>
tableName: string
skipErrors: boolean
batchSize: number
```

### Export CSV
```http
POST /connections/:connectionId/export/csv
Content-Type: application/json

{
  "tableName": "string",
  "query": "string (optional)",
  "compress": boolean,
  "delimiter": "string"
}
```

**Response:** File download

### Export JSON
```http
POST /connections/:connectionId/export/json
Content-Type: application/json

{
  "tableName": "string",
  "query": "string (optional)",
  "compress": boolean
}
```

### Export SQL
```http
POST /connections/:connectionId/export/sql
Content-Type: application/json

{
  "tableName": "string (optional)",
  "schemaOnly": boolean,
  "dataOnly": boolean,
  "compress": boolean
}
```

## Backup Management

### Create Backup
```http
POST /connections/:connectionId/backups
Content-Type: application/json

{
  "format": "sql|custom|tar",
  "compress": boolean,
  "schemaOnly": boolean,
  "dataOnly": boolean,
  "encryption": boolean,
  "encryptionKey": "string (if encryption enabled)"
}
```

**Response:**
```json
{
  "id": "string",
  "connectionId": "uuid",
  "timestamp": "ISO8601",
  "size": number,
  "format": "string",
  "compressed": boolean,
  "encrypted": boolean,
  "path": "string"
}
```

### List Backups
```http
GET /connections/:connectionId/backups
```

### Get Backup
```http
GET /connections/:connectionId/backups/:backupId
```

### Restore Backup
```http
POST /connections/:connectionId/backups/:backupId/restore
```

### Delete Backup
```http
DELETE /connections/:connectionId/backups/:backupId
```

### Download Backup
```http
GET /connections/:connectionId/backups/:backupId/download
```

**Response:** File download

### Schedule Backup
```http
POST /connections/:connectionId/backups/schedules
Content-Type: application/json

{
  "cron": "string (cron expression)",
  "retention": number,
  "options": {
    "format": "string",
    "compress": boolean
  }
}
```

**Response:**
```json
{
  "id": "string",
  "connectionId": "uuid",
  "cron": "string",
  "retention": number,
  "options": object,
  "enabled": boolean
}
```

### List Backup Schedules
```http
GET /connections/:connectionId/backups/schedules
```

### Update Backup Schedule
```http
PUT /connections/:connectionId/backups/schedules/:scheduleId
Content-Type: application/json

{
  "cron": "string (optional)",
  "retention": number (optional),
  "enabled": boolean (optional)
}
```

### Delete Backup Schedule
```http
DELETE /connections/:connectionId/backups/schedules/:scheduleId
```

### Apply Retention Policy
```http
POST /connections/:connectionId/backups/apply-retention
```

### Point-in-Time Recovery
```http
POST /connections/:connectionId/backups/pitr
Content-Type: application/json

{
  "timestamp": "ISO8601"
}
```

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

## Rate Limiting

Currently no rate limiting is implemented. In production, consider implementing:
- 100 requests per 15 minutes for query execution
- 10 requests per minute for backup operations
- 50 requests per minute for schema operations

## Best Practices

1. **Connection Management**
   - Always test connections after creation
   - Monitor connection health regularly
   - Use connection pooling for high-traffic applications

2. **Query Execution**
   - Use parameterized queries to prevent SQL injection
   - Limit result sets with LIMIT clauses
   - Review query metrics for optimization

3. **Migrations**
   - Always test migrations in a development environment first
   - Use dry-run before applying migrations
   - Keep migrations small and focused

4. **Backups**
   - Schedule regular automated backups
   - Test restore procedures periodically
   - Use compression for large databases
   - Implement retention policies

5. **Import/Export**
   - Use batch processing for large datasets
   - Enable compression for file transfers
   - Validate data before importing
   - Use proper column mapping

## Support

For issues or questions, please refer to:
- GitHub Issues: https://github.com/Algodons/algo/issues
- Documentation: DATABASE_PLATFORM.md
