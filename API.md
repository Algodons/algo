# API Documentation

## Overview

The Cloud IDE platform provides RESTful APIs and WebSocket endpoints for various features including Git operations, package management, database connectivity, and file preview.

## Base URL

- Development: `http://localhost:5000/api`
- Production: `https://your-domain.com/api`

## Authentication

Currently, the API doesn't require authentication. In production, you should implement:
- JWT tokens
- OAuth2
- API keys

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error message"
}
```

## Endpoints

### Health Check

#### GET /api/health

Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Git Operations

### Clone Repository

#### POST /api/git/clone

Clone a Git repository to a workspace.

**Request Body:**
```json
{
  "url": "https://github.com/user/repo.git",
  "workspaceId": "workspace-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Repository cloned successfully",
  "path": "/path/to/workspace"
}
```

### Get Git Status

#### GET /api/git/status

Get the current Git status of a workspace.

**Query Parameters:**
- `workspaceId` (required): Workspace identifier

**Response:**
```json
{
  "success": true,
  "status": {
    "current": "main",
    "tracking": "origin/main",
    "modified": ["file1.js", "file2.js"],
    "staged": ["file3.js"],
    "files": [...]
  }
}
```

### Commit Changes

#### POST /api/git/commit

Commit changes in a workspace.

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
  "message": "Commit message",
  "files": ["file1.js", "file2.js"]  // Optional, defaults to all
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "commit": "abc123...",
    "summary": { ... }
  }
}
```

### Push Changes

#### POST /api/git/push

Push commits to remote repository.

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
  "remote": "origin",  // Optional, defaults to "origin"
  "branch": "main"     // Optional, defaults to "main"
}
```

**Response:**
```json
{
  "success": true,
  "result": { ... }
}
```

### Pull Changes

#### POST /api/git/pull

Pull changes from remote repository.

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
  "remote": "origin",  // Optional
  "branch": "main"     // Optional
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "files": ["file1.js"],
    "insertions": 10,
    "deletions": 5
  }
}
```

### List Branches

#### GET /api/git/branches

List all branches in a workspace.

**Query Parameters:**
- `workspaceId` (required): Workspace identifier

**Response:**
```json
{
  "success": true,
  "branches": {
    "all": ["main", "develop", "feature/new"],
    "current": "main",
    "branches": { ... }
  }
}
```

### Create Branch

#### POST /api/git/branch

Create a new branch.

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
  "branchName": "feature/new-feature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Branch feature/new-feature created"
}
```

### Checkout Branch

#### POST /api/git/checkout

Switch to a different branch.

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
  "branchName": "develop"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Checked out to develop"
}
```

### Get Diff

#### GET /api/git/diff

Get the diff of changes.

**Query Parameters:**
- `workspaceId` (required): Workspace identifier
- `file` (optional): Specific file to diff

**Response:**
```json
{
  "success": true,
  "diff": "diff --git a/file.js b/file.js\n..."
}
```

### Get Log

#### GET /api/git/log

Get commit history.

**Query Parameters:**
- `workspaceId` (required): Workspace identifier
- `maxCount` (optional): Max number of commits (default: 50)

**Response:**
```json
{
  "success": true,
  "log": {
    "all": [
      {
        "hash": "abc123...",
        "date": "2024-01-01",
        "message": "Commit message",
        "author_name": "Author Name"
      }
    ]
  }
}
```

---

## Package Management

### Install Package (npm)

#### POST /api/package/npm/install

Install npm packages.

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
  "packages": "express lodash"  // Space-separated or array
}
```

**Response:**
```json
{
  "success": true,
  "stdout": "...",
  "stderr": "..."
}
```

### Uninstall Package (npm)

#### POST /api/package/npm/uninstall

Uninstall npm packages.

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
  "packages": "lodash"
}
```

### List Packages (npm)

#### GET /api/package/npm/list

List installed npm packages.

**Query Parameters:**
- `workspaceId` (required)

**Response:**
```json
{
  "success": true,
  "packages": {
    "dependencies": { ... }
  }
}
```

### Install Package (pip)

#### POST /api/package/pip/install

Install Python packages with pip.

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
  "packages": "flask requests"
}
```

### Install Package (cargo)

#### POST /api/package/cargo/install

Install Rust packages with cargo.

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
  "packages": "serde tokio"
}
```

### Detect Package Managers

#### GET /api/package/detect

Detect available package managers in workspace.

**Query Parameters:**
- `workspaceId` (required)

**Response:**
```json
{
  "success": true,
  "managers": ["npm", "pip", "cargo"]
}
```

---

## Database Operations

### Connect to PostgreSQL

#### POST /api/db/postgres/connect

Establish PostgreSQL connection.

**Request Body:**
```json
{
  "connectionId": "pg-conn-1",
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "user": "username",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connected to PostgreSQL"
}
```

### Execute PostgreSQL Query

#### POST /api/db/postgres/query

Execute a SQL query.

**Request Body:**
```json
{
  "connectionId": "pg-conn-1",
  "query": "SELECT * FROM users LIMIT 10"
}
```

**Response:**
```json
{
  "success": true,
  "rows": [ ... ],
  "rowCount": 10
}
```

### List PostgreSQL Tables

#### GET /api/db/postgres/tables

List all tables in the database.

**Query Parameters:**
- `connectionId` (required)

**Response:**
```json
{
  "success": true,
  "tables": [
    { "table_name": "users" },
    { "table_name": "posts" }
  ]
}
```

### Connect to MySQL

#### POST /api/db/mysql/connect

Establish MySQL connection.

**Request Body:**
```json
{
  "connectionId": "mysql-conn-1",
  "host": "localhost",
  "port": 3306,
  "database": "mydb",
  "user": "username",
  "password": "password"
}
```

### Connect to MongoDB

#### POST /api/db/mongodb/connect

Establish MongoDB connection.

**Request Body:**
```json
{
  "connectionId": "mongo-conn-1",
  "uri": "mongodb://localhost:27017",
  "database": "mydb"
}
```

### Execute MongoDB Query

#### POST /api/db/mongodb/query

Execute a MongoDB operation.

**Request Body:**
```json
{
  "connectionId": "mongo-conn-1",
  "collection": "users",
  "query": { "age": { "$gt": 18 } },
  "operation": "find"  // find, insertOne, updateOne, deleteOne
}
```

### Disconnect Database

#### POST /api/db/disconnect

Close database connection.

**Request Body:**
```json
{
  "connectionId": "pg-conn-1"
}
```

---

## Preview & File System

### Serve Preview File

#### GET /api/preview/:workspaceId/*

Serve a file for preview.

**Example:**
```
GET /api/preview/workspace-123/index.html
```

### Start Watching Files

#### POST /api/preview/watch

Start watching workspace for file changes.

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
  "watchPath": "."  // Optional, defaults to "."
}
```

### Stop Watching Files

#### POST /api/preview/unwatch

Stop watching workspace.

**Request Body:**
```json
{
  "workspaceId": "workspace-123"
}
```

### Get File Tree

#### GET /api/preview/files

Get the file tree structure.

**Query Parameters:**
- `workspaceId` (required)

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "name": "src",
      "path": "src",
      "type": "directory",
      "children": [ ... ]
    },
    {
      "name": "index.html",
      "path": "index.html",
      "type": "file",
      "size": 1024
    }
  ]
}
```

---

## WebSocket Endpoints

### Collaborative Editing (Yjs)

**Endpoint:** `ws://localhost:5000/yjs?docName=workspace:file`

Connect to a Yjs document for real-time collaborative editing.

**Protocol:** Yjs WebSocket Protocol

### Terminal

**Endpoint:** `ws://localhost:5000/terminal?id=terminal-123`

Connect to a terminal session.

**Messages from Server:**
```json
{
  "type": "ready",
  "terminalId": "terminal-123"
}

{
  "type": "data",
  "data": "terminal output..."
}

{
  "type": "exit",
  "exitCode": 0,
  "signal": null
}
```

**Messages to Server:**
```json
{
  "type": "input",
  "data": "ls -la\n"
}

{
  "type": "resize",
  "cols": 80,
  "rows": 30
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production:
- Implement rate limiting per IP
- Use Redis for distributed rate limiting
- Apply different limits per endpoint

## CORS

CORS is enabled for all origins in development. For production:
- Restrict to specific domains
- Configure in `server/index.ts`

## Error Codes

- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Versioning

API version: `v1` (implicit, not in URL)

Future versions will use: `/api/v2/...`

## SDK/Client Libraries

Consider creating client libraries for:
- JavaScript/TypeScript
- Python
- Go

## Webhooks

Future feature: Webhooks for:
- File changes
- Git operations
- Build completions
