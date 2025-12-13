# Team Collaboration Features - Setup Guide

This guide covers the setup, configuration, and deployment of the team collaboration features.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Migration Scripts](#migration-scripts)
- [Service Configuration](#service-configuration)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- Node.js 18+ or higher
- PostgreSQL 15+
- Redis (optional, for production)
- Git

### Required npm Packages
The following packages are already included in package.json:
- `socket.io` - Real-time WebSocket communication
- `pg` - PostgreSQL client
- `simple-git` - Git operations
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `express` - Web framework

---

## Database Setup

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE algo_ide;

# Create user
CREATE USER algo_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE algo_ide TO algo_user;

# Connect to the database
\c algo_ide

# Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2. Run Migration Scripts

Execute the SQL schema files in order:

```bash
# Basic schema
psql -U algo_user -d algo_ide -f backend/database/init.sql

# Team collaboration schema
psql -U algo_user -d algo_ide -f backend/database/team-collaboration-schema.sql

# Admin features (if needed)
psql -U algo_user -d algo_ide -f backend/database/admin-schema.sql

# Dashboard features (if needed)
psql -U algo_user -d algo_ide -f backend/database/dashboard-schema.sql
```

### 3. Verify Tables

```bash
psql -U algo_user -d algo_ide

# List all tables
\dt

# Expected tables for team collaboration:
# - users
# - projects
# - organizations
# - organization_members
# - project_permissions
# - team_activity_logs
# - shared_env_variables
# - collaboration_sessions
# - user_presence
# - code_comments
# - code_comment_mentions
# - pull_requests
# - pr_reviews
# - pr_review_comments
# - branch_protection_rules
# - deployment_protections
# - deployment_approvals
# - team_billing
# - member_usage
```

---

## Environment Configuration

### Backend Configuration

Create or update `.env` file in the backend directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=algo_ide
DB_USER=algo_user
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_EXPIRATION=7d

# Encryption Configuration (for environment variables)
ENCRYPTION_SECRET=your-encryption-key-at-least-32-characters

# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Workspace Directory
WORKSPACE_DIR=./workspaces

# Redis Configuration (optional, for production)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# WebRTC/Voice Chat (optional)
# AGORA_APP_ID=your-agora-app-id
# AGORA_APP_CERTIFICATE=your-agora-certificate

# AWS S3 (for file storage, optional)
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_S3_BUCKET=your-bucket-name
# AWS_REGION=us-east-1

# Email Configuration (for invitations)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your-email@example.com
# SMTP_PASSWORD=your-password
# FROM_EMAIL=noreply@example.com
```

### Frontend Configuration

Create or update `.env` file in the frontend directory:

```bash
# API Configuration
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000

# WebRTC Configuration (if using Agora)
# VITE_AGORA_APP_ID=your-agora-app-id
```

---

## Migration Scripts

### Create Sample Data

```sql
-- Create sample users
INSERT INTO users (email, password_hash, name, role)
VALUES 
  ('admin@example.com', '$2b$10$...', 'Admin User', 'admin'),
  ('user1@example.com', '$2b$10$...', 'User One', 'user'),
  ('user2@example.com', '$2b$10$...', 'User Two', 'user');

-- Create sample organization
INSERT INTO organizations (name, slug, description)
VALUES ('Example Org', 'example-org', 'Sample organization for testing');

-- Add members to organization
INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
VALUES 
  (1, 1, 'owner', 'active', CURRENT_TIMESTAMP),
  (1, 2, 'developer', 'active', CURRENT_TIMESTAMP),
  (1, 3, 'viewer', 'active', CURRENT_TIMESTAMP);

-- Create sample project
INSERT INTO projects (user_id, name, description, language, s3_path)
VALUES (1, 'Sample Project', 'Test project', 'javascript', '/projects/sample');

-- Set project permissions
INSERT INTO project_permissions (project_id, organization_id, permissions)
VALUES (1, 1, '{"read": true, "write": true, "deploy": false, "admin": false}');
```

### Data Migration from Existing System

If you're migrating from an existing system:

```sql
-- Example: Migrate existing projects to organization structure
-- 1. Create organizations for each user's projects
INSERT INTO organizations (name, slug, description)
SELECT 
  CONCAT(u.name, '''s Organization'),
  LOWER(REPLACE(u.name, ' ', '-')),
  CONCAT('Organization for ', u.name)
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.slug = LOWER(REPLACE(u.name, ' ', '-'))
);

-- 2. Add users as owners of their organizations
INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
SELECT o.id, u.id, 'owner', 'active', CURRENT_TIMESTAMP
FROM users u
INNER JOIN organizations o ON o.slug = LOWER(REPLACE(u.name, ' ', '-'));

-- 3. Add project permissions for organization members
INSERT INTO project_permissions (project_id, organization_id, permissions, granted_by)
SELECT 
  p.id,
  o.id,
  '{"read": true, "write": true, "deploy": true, "admin": true}'::jsonb,
  p.user_id
FROM projects p
INNER JOIN users u ON p.user_id = u.id
INNER JOIN organizations o ON o.slug = LOWER(REPLACE(u.name, ' ', '-'));
```

---

## Service Configuration

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (if needed)
cd ../frontend
npm install
```

### 2. Build Backend

```bash
cd backend
npm run build
```

### 3. Start Services

#### Development Mode

```bash
# Backend (with hot reload)
cd backend
npm run dev

# In another terminal, start frontend
cd frontend
npm run dev
```

#### Production Mode

```bash
# Build backend
cd backend
npm run build

# Start backend
npm start

# Build and serve frontend
cd ../frontend
npm run build
# Serve the dist folder with nginx or another static server
```

### 4. WebSocket Configuration

The WebSocket server is automatically initialized with the Express server. No additional configuration needed.

To verify WebSocket connection:

```javascript
// Test in browser console
const socket = io('http://localhost:4000');
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

---

## Testing

### 1. Unit Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- collaboration-service.test.ts

# Run with coverage
npm test -- --coverage
```

### 2. Integration Tests

```bash
# Test API endpoints
npm run test:integration

# Test WebSocket events
npm run test:websocket
```

### 3. Manual Testing

#### Test Team Management

```bash
# Create organization
curl -X POST http://localhost:4000/api/teams \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Org",
    "slug": "test-org",
    "description": "Test organization"
  }'

# Invite member
curl -X POST http://localhost:4000/api/teams/1/members \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "role": "developer"
  }'
```

#### Test Real-time Collaboration

Open two browser windows and connect to the same project. Observe cursor movements and file changes syncing in real-time.

#### Test Pull Requests

```bash
# Create PR
curl -X POST http://localhost:4000/api/version-control/projects/1/pull-requests \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test PR",
    "sourceBranch": "feature/test",
    "targetBranch": "main"
  }'

# Submit review
curl -X POST http://localhost:4000/api/version-control/pull-requests/1/reviews \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "comment": "LGTM"
  }'
```

---

## Production Deployment

### 1. Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (at least 32 characters)
- [ ] Use strong ENCRYPTION_SECRET (at least 32 characters)
- [ ] Enable HTTPS/WSS
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Enable database connection pooling
- [ ] Set NODE_ENV=production

### 2. Database Configuration

```bash
# Production PostgreSQL settings
# Edit postgresql.conf

max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 1310kB
min_wal_size = 1GB
max_wal_size = 4GB
```

### 3. Redis Configuration (Recommended for Production)

Install and configure Redis for session management:

```bash
# Install Redis
apt-get install redis-server

# Configure Redis (redis.conf)
maxmemory 256mb
maxmemory-policy allkeys-lru
```

Update backend code to use Redis for session storage:

```typescript
// Add to backend/src/index.ts
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### 4. Nginx Configuration

```nginx
upstream backend {
    server localhost:4000;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend static files
    location / {
        root /var/www/algo-ide/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API endpoints
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket endpoints
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

### 5. Process Management (PM2)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [{
    name: 'algo-backend',
    script: './dist/index.js',
    cwd: './backend',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};

# Start with PM2
pm2 start ecosystem.config.js

# Setup PM2 to start on system boot
pm2 startup
pm2 save
```

### 6. Monitoring and Logging

```bash
# View PM2 logs
pm2 logs

# Monitor processes
pm2 monit

# Database monitoring
# Create monitoring user
CREATE USER monitoring WITH PASSWORD 'monitoring_password';
GRANT pg_monitor TO monitoring;

# Use pg_stat_statements for query analysis
CREATE EXTENSION pg_stat_statements;
```

### 7. Backup Strategy

```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/var/backups/algo-ide"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -U algo_user -d algo_ide -F c -f "$BACKUP_DIR/algo_ide_$TIMESTAMP.backup"

# Compress
gzip "$BACKUP_DIR/algo_ide_$TIMESTAMP.backup"

# Keep only last 7 days
find $BACKUP_DIR -name "*.backup.gz" -mtime +7 -delete

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_DIR/algo_ide_$TIMESTAMP.backup.gz" s3://your-backup-bucket/
```

Add to crontab:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup-script.sh
```

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U algo_user -d algo_ide -h localhost

# Check pg_hba.conf for authentication settings
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

#### WebSocket Connection Issues

```javascript
// Enable debug logging
localStorage.debug = 'socket.io-client:*';

// Check CORS configuration
// Ensure FRONTEND_URL in .env matches your frontend URL
```

#### Permission Errors

```sql
-- Grant missing permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO algo_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO algo_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO algo_user;
```

#### Performance Issues

```sql
-- Analyze slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_name ON table_name(column_name);

-- Vacuum and analyze
VACUUM ANALYZE;
```

#### Memory Issues

```bash
# Check memory usage
free -m

# Adjust Node.js memory limit
node --max-old-space-size=4096 dist/index.js

# Or in PM2 ecosystem.config.js
node_args: '--max-old-space-size=4096'
```

### Debug Mode

Enable debug logging:

```bash
# Backend
DEBUG=* npm start

# Or specific namespaces
DEBUG=collaboration:*,team:* npm start
```

### Health Checks

```bash
# API health check
curl http://localhost:4000/health

# Database health check
psql -U algo_user -d algo_ide -c "SELECT 1"

# WebSocket connection test
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:4000');
socket.on('connect', () => {
  console.log('Connected');
  process.exit(0);
});
socket.on('connect_error', (err) => {
  console.error('Connection failed:', err);
  process.exit(1);
});
"
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: Use Nginx or HAProxy
2. **Session Affinity**: Enable sticky sessions for WebSocket connections
3. **Redis Adapter**: Use Redis adapter for Socket.IO to share sessions across servers
4. **Database Connection Pooling**: Use pgBouncer for PostgreSQL

### Vertical Scaling

1. **Increase Server Resources**: CPU, RAM, Disk
2. **Database Optimization**: Tune PostgreSQL settings
3. **Caching**: Implement Redis caching for frequently accessed data

### Monitoring

1. **Application Monitoring**: Use PM2, New Relic, or DataDog
2. **Database Monitoring**: Use pgAdmin, pg_stat_statements
3. **Log Aggregation**: Use ELK stack or Papertrail
4. **Metrics**: Use Prometheus + Grafana

---

## Support

For issues or questions:
1. Check the [API Documentation](TEAM_COLLABORATION_API.md)
2. Review the [Troubleshooting](#troubleshooting) section
3. Check application logs
4. File an issue in the repository

---

## License

MIT License - See LICENSE file for details
