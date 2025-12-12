# Database Visual Tools Documentation

This document describes the visual database management tools implemented in the Algo Cloud IDE platform.

## Overview

The database visual tools provide a comprehensive, no-code interface for managing databases, building queries, browsing data, managing migrations, and automating backups. These tools integrate seamlessly with the existing backend infrastructure that supports 7 database types:

- **Relational**: PostgreSQL, MySQL, SQLite
- **NoSQL**: MongoDB, Redis
- **Vector**: Pinecone, Weaviate

## Features

### 1. Visual Query Builder

A drag-and-drop interface for building SQL queries without writing code.

**Features:**
- Table selection with automatic column discovery
- SELECT column configuration with aggregations (COUNT, SUM, AVG, MIN, MAX)
- JOIN support (INNER, LEFT, RIGHT, FULL OUTER)
- WHERE conditions with multiple operators (=, !=, >, <, >=, <=, LIKE, IN)
- Conjunction support (AND, OR)
- GROUP BY and ORDER BY clauses
- LIMIT configuration
- Real-time SQL preview
- One-click query execution

**Usage:**
1. Connect to your database
2. Select the "Query Builder" tab
3. Choose a base table
4. Add columns to SELECT (optional: apply aggregations)
5. Add JOINs to include related tables
6. Add WHERE conditions to filter results
7. Configure GROUP BY and ORDER BY (optional)
8. Set LIMIT to control result size
9. Review generated SQL
10. Click "Execute Query" to run

**Security:**
- Implements basic SQL escaping for string values
- Numeric values are not quoted
- Backend uses parameterized queries for execution
- IN operator properly formatted

### 2. Data Browser

Browse and explore database tables with pagination, sorting, and export capabilities.

**Features:**
- Table selection dropdown
- Paginated data view (50 rows per page)
- Sortable columns (click header to sort)
- Real-time data refresh
- NULL value highlighting
- CSV export functionality
- Row count display

**Usage:**
1. Connect to your database
2. Select the "Data Browser" tab
3. Choose a table from the dropdown
4. Click column headers to sort
5. Use pagination controls to navigate
6. Click "Export CSV" to download data

**Performance:**
- Efficient pagination with OFFSET/LIMIT
- Configurable page size (default: 50 rows)
- Minimal data transfer

### 3. Migration Manager

Version-controlled schema changes with up/down migrations.

**Features:**
- Create new migrations with UP and DOWN SQL
- View migration history with status tracking
- Apply individual migrations
- Rollback applied migrations
- Apply all pending migrations at once
- Expandable migration details
- Status indicators (pending, applied, failed, rolled_back)
- Timestamp tracking

**Usage:**
1. Connect to your database
2. Select the "Migrations" tab
3. Click "+ New Migration" to create a migration
4. Enter migration name (e.g., "add_users_table")
5. Write UP migration SQL (schema changes to apply)
6. Write DOWN migration SQL (how to rollback)
7. Click "Create Migration"
8. Click "Apply" on individual migrations or "Apply All Pending"
9. Use "Rollback" to reverse applied migrations

**Best Practices:**
- Keep migrations small and focused
- Always test migrations in development first
- Write complete DOWN migrations for rollback
- Use descriptive migration names
- Review generated SQL before applying

### 4. Backup Manager

Automated backup scheduling with retention policies and restore capabilities.

**Features:**
- Manual backup creation
- Scheduled automated backups (cron-based)
- Multiple backup formats (SQL, Custom, TAR)
- Compression support
- Schema-only or data-only backups
- Backup retention policies
- One-click restore
- Backup deletion
- Size and metadata display

**Usage - Manual Backup:**
1. Connect to your database
2. Select the "Backups" tab
3. Click "+ Create Backup"
4. Choose format (SQL, Custom, or TAR)
5. Enable compression (recommended)
6. Select schema-only or data-only if needed
7. Click "Create Backup Now"

**Usage - Scheduled Backups:**
1. Click "Schedule Backup"
2. Enter cron expression (e.g., "0 2 * * *" for daily at 2 AM)
3. Set retention period in days
4. Configure backup options
5. Click "Create Schedule"

**Cron Expression Examples:**
- `0 2 * * *` - Daily at 2:00 AM
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 */6 * * *` - Every 6 hours
- `0 0 1 * *` - Monthly on the 1st at midnight

**Restore:**
1. Find the backup you want to restore
2. Click "Restore"
3. Confirm the action
4. Wait for restoration to complete

**Warning:** Restoring a backup will overwrite current data. Always back up current data before restoring.

## Database Connection

### Supported Database Types

The visual tools support connections to:

1. **PostgreSQL**
   - Host, port, username, password, database
   - Default port: 5432

2. **MySQL**
   - Host, port, username, password, database
   - Default port: 3306

3. **MongoDB**
   - Host, port, username, password, database
   - Default port: 27017

4. **Redis**
   - Host, port, password (optional)
   - Default port: 6379

5. **SQLite**
   - File path
   - No authentication required

6. **Pinecone (Vector DB)**
   - API key, index name
   - Cloud-based vector database

7. **Weaviate (Vector DB)**
   - Host, port, API key (optional)
   - Vector search engine

### Connection Management

**Creating a Connection:**
1. Open the Database Panel
2. Enter connection name
3. Select database type
4. Fill in credentials
5. Click "Connect"

**Connection Status:**
- Green indicator (●) shows active connection
- Connection name displayed in status bar
- Disconnect button available when connected

**Security:**
- Credentials encrypted with AES-256
- Secure storage in backend
- Connection pooling for performance
- Health monitoring

## API Integration

The visual tools integrate with the backend REST API:

### Endpoints Used

**Connection Management:**
- `POST /api/databases/connections` - Create connection
- `GET /api/databases/connections` - List connections
- `GET /api/databases/connections/:id` - Get connection details
- `DELETE /api/databases/connections/:id` - Delete connection

**Query Execution:**
- `POST /api/databases/connections/:id/query` - Execute SQL query
- `GET /api/databases/connections/:id/tables` - List tables
- `GET /api/databases/connections/:id/tables/:table/schema` - Get schema

**Migrations:**
- `POST /api/databases/connections/:id/migrations` - Create migration
- `GET /api/databases/connections/:id/migrations` - List migrations
- `POST /api/databases/connections/:id/migrations/:id/apply` - Apply migration
- `POST /api/databases/connections/:id/migrations/:id/rollback` - Rollback
- `POST /api/databases/connections/:id/migrations/apply-all` - Apply all pending

**Backups:**
- `POST /api/databases/connections/:id/backups` - Create backup
- `GET /api/databases/connections/:id/backups` - List backups
- `POST /api/databases/connections/:id/backups/:id/restore` - Restore backup
- `DELETE /api/databases/connections/:id/backups/:id` - Delete backup
- `POST /api/databases/connections/:id/backups/schedules` - Create schedule
- `GET /api/databases/connections/:id/backups/schedules` - List schedules
- `DELETE /api/databases/connections/:id/backups/schedules/:id` - Delete schedule

## Architecture

### Component Structure

```
src/components/
├── DatabasePanel.tsx          # Main container with tabs
├── DatabasePanel.css          # Styling for main panel
└── database/
    ├── QueryBuilder.tsx       # Visual query builder
    ├── QueryBuilder.css       # Query builder styles
    ├── DataBrowser.tsx        # Table data browser
    ├── DataBrowser.css        # Data browser styles
    ├── MigrationManager.tsx   # Migration management
    ├── MigrationManager.css   # Migration styles
    ├── BackupManager.tsx      # Backup automation
    └── BackupManager.css      # Backup styles
```

### Technology Stack

- **React** - Component framework
- **TypeScript** - Type safety
- **CSS Modules** - Scoped styling
- **REST API** - Backend communication
- **Fetch API** - HTTP requests

### State Management

- Local component state with React hooks
- `useState` for UI state
- `useEffect` for data fetching
- No global state management (Zustand, Redux) needed

## Security Considerations

### SQL Injection Prevention

1. **Query Builder:**
   - Implements basic SQL escaping
   - Single quotes escaped (`'` → `''`)
   - Numeric values not quoted
   - Backend uses parameterized queries

2. **Backend API:**
   - All database adapters use parameterized queries
   - Input validation on API layer
   - SQL injection attacks prevented at execution level

### Authentication & Authorization

- JWT authentication (not yet implemented in UI)
- Role-based access control (planned)
- Connection credentials encrypted at rest

### Best Practices

1. **Always use parameterized queries** in backend
2. **Validate user input** before SQL generation
3. **Escape special characters** in string values
4. **Test with malicious input** during development
5. **Audit query execution** in production

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to database
**Solutions:**
- Verify credentials are correct
- Check host and port are accessible
- Ensure database server is running
- Check firewall rules
- Verify network connectivity

**Problem:** Connection timeout
**Solutions:**
- Increase timeout in backend configuration
- Check network latency
- Verify database server load

### Query Issues

**Problem:** Query execution fails
**Solutions:**
- Check SQL syntax in generated query
- Verify table and column names exist
- Check user permissions on database
- Review error message in console

**Problem:** Slow query performance
**Solutions:**
- Add indexes to frequently queried columns
- Use LIMIT to reduce result set size
- Optimize WHERE conditions
- Consider query complexity

### Migration Issues

**Problem:** Migration fails to apply
**Solutions:**
- Check SQL syntax in migration
- Verify dependencies are met
- Review database logs
- Test migration in development first

**Problem:** Cannot rollback migration
**Solutions:**
- Check DOWN migration SQL is correct
- Verify migration was applied
- Check for dependent migrations

### Backup Issues

**Problem:** Backup creation fails
**Solutions:**
- Check disk space on server
- Verify write permissions
- Check database size
- Review backup format compatibility

**Problem:** Restore fails
**Solutions:**
- Verify backup file integrity
- Check backup format matches database
- Ensure sufficient disk space
- Review database version compatibility

## Future Enhancements

### Planned Features

1. **Schema Designer**
   - Visual ER diagram editor
   - Drag-and-drop table creation
   - Relationship management
   - Auto-generate migrations from schema changes

2. **Performance Analyzer**
   - EXPLAIN plan visualization
   - Slow query log viewer
   - Index optimization suggestions
   - N+1 query detection

3. **Data Editing**
   - Inline editing in Data Browser
   - Bulk update operations
   - Bulk delete with confirmation
   - Data validation rules

4. **Import/Export**
   - CSV import with column mapping
   - JSON import/export
   - Excel file support
   - Progress tracking for large files

5. **Database Provisioning**
   - One-click database creation
   - Tiered instances (shared/dedicated)
   - Auto-scaling configuration
   - Database cloning with data masking

## Contributing

To contribute to the database visual tools:

1. Review the component architecture
2. Follow TypeScript and React best practices
3. Test with multiple database types
4. Add error handling for edge cases
5. Document new features
6. Submit PR with clear description

## License

MIT License - See LICENSE file for details
