import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import databaseRoutes from './routes/database-routes';
import queryRoutes from './routes/query-routes';
import schemaRoutes from './routes/schema-routes';
import migrationRoutes from './routes/migration-routes';
import importExportRoutes from './routes/import-export-routes';
import backupRoutes from './routes/backup-routes';
import { createProjectManagementRoutes } from './routes/project-management-routes';
import { createResourceMonitoringRoutes } from './routes/resource-monitoring-routes';
import { createApiManagementRoutes } from './routes/api-management-routes';
import { createAccountSettingsRoutes } from './routes/account-settings-routes';
import { createAdminUserRoutes } from './routes/admin-user-routes';
import { createAdminAnalyticsRoutes } from './routes/admin-analytics-routes';
import { createAdminAffiliateRoutes } from './routes/admin-affiliate-routes';
import { createAdminFinancialRoutes } from './routes/admin-financial-routes';
import { createAdminSystemRoutes } from './routes/admin-system-routes';
import { handleImpersonation } from './middleware/admin-auth';
import { authenticate, optionalAuthenticate } from './middleware/auth';
import { createSubscriptionRoutes } from './routes/subscription-routes';
import { createUsageRoutes } from './routes/usage-routes';
import { createBillingRoutes } from './routes/billing-routes';
import { createCreditsRoutes } from './routes/credits-routes';
import { createAlertsRoutes } from './routes/alerts-routes';
import { createTeamRoutes } from './routes/team-routes';
import { createCollaborationRoutes } from './routes/collaboration-routes';
import { createVersionControlRoutes } from './routes/version-control-routes';
import { createTeamBillingRoutes } from './routes/team-billing-routes';
import { RealtimeCollaborationService } from './services/realtime-collaboration-service';
import automationRoutes from './routes/automation-routes';
import { createV1Routes } from './routes/v1/index';
import { createCopilotRoutes } from './routes/copilot-routes';
import * as path from 'path';
import { initializeRedisCache, cacheMiddleware, getCacheStats, clearAllCaches, invalidateCache } from './middleware/caching';
import { ProjectSuspensionService, wakeOnRequestMiddleware } from './services/project-suspension-service';
import rateLimit from 'express-rate-limit';
import { getEnvironmentConfig } from './config/environment';

dotenv.config();

// Load and log environment configuration
const envConfig = getEnvironmentConfig();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 4000;

// Initialize PostgreSQL pool for dashboard features
const dashboardPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'algo_ide',
  user: process.env.DB_USER || 'algo_user',
  password: process.env.DB_PASSWORD,
});

// Initialize caching
initializeRedisCache();

// Initialize project suspension service
const suspensionService = new ProjectSuspensionService(dashboardPool, {
  inactivityThresholdDays: 30,
  checkInterval: 3600000, // 1 hour
});
suspensionService.start();

// Rate limiters
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Stricter limit for admin endpoints
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json());

// Admin impersonation middleware (should be early in the chain)
app.use(handleImpersonation(dashboardPool));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cache management endpoints (admin only with rate limiting)
app.get('/api/cache/stats', adminRateLimiter, authenticate(dashboardPool), async (_req: Request, res: Response) => {
  const stats = await getCacheStats();
  res.json(stats);
});

app.post('/api/cache/clear', adminRateLimiter, authenticate(dashboardPool), async (_req: Request, res: Response) => {
  await clearAllCaches();
  res.json({ success: true, message: 'All caches cleared' });
});

app.post('/api/cache/invalidate', adminRateLimiter, authenticate(dashboardPool), async (req: Request, res: Response) => {
  const { pattern } = req.body;
  if (!pattern) {
    return res.status(400).json({ error: 'Pattern is required' });
  }
  await invalidateCache(pattern);
  res.json({ success: true, message: `Cache invalidated for pattern: ${pattern}` });
});

// Project suspension endpoints (with rate limiting)
app.get('/api/projects/:projectId/status', apiRateLimiter, authenticate(dashboardPool), async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const status = await suspensionService.getProjectStatus(projectId);
  if (!status) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(status);
});

app.post('/api/projects/:projectId/wake', apiRateLimiter, authenticate(dashboardPool), async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    await suspensionService.wakeProject(projectId);
    res.json({ success: true, message: 'Project is waking up' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/suspension/stats', apiRateLimiter, authenticate(dashboardPool), async (_req: Request, res: Response) => {
  const stats = await suspensionService.getStatistics();
  res.json(stats);
});

// Database management routes
app.use('/api/databases', databaseRoutes);
app.use('/api/databases', queryRoutes);
app.use('/api/databases', schemaRoutes);
app.use('/api/databases', migrationRoutes);
app.use('/api/databases', importExportRoutes);
app.use('/api/databases', backupRoutes);

// Dashboard feature routes (with caching)
app.use('/api/dashboard/projects', wakeOnRequestMiddleware(suspensionService), createProjectManagementRoutes(dashboardPool));
app.use('/api/dashboard/resources', cacheMiddleware({ ttl: 60, prefix: 'resources' }), createResourceMonitoringRoutes(dashboardPool));
app.use('/api/dashboard/api', createApiManagementRoutes(dashboardPool));
app.use('/api/dashboard/settings', createAccountSettingsRoutes(dashboardPool));

// Admin control system routes
app.use('/api/admin/users', createAdminUserRoutes(dashboardPool));
app.use('/api/admin/analytics', createAdminAnalyticsRoutes(dashboardPool));
app.use('/api/admin/affiliates', createAdminAffiliateRoutes(dashboardPool));
app.use('/api/admin/financial', createAdminFinancialRoutes(dashboardPool));
app.use('/api/admin/system', createAdminSystemRoutes(dashboardPool));

// Monetization system routes (with authentication and caching)
// Plans endpoint can be accessed without auth, others require authentication
app.use('/api/subscriptions/plans', optionalAuthenticate(dashboardPool), cacheMiddleware({ ttl: 3600, prefix: 'plans' }), createSubscriptionRoutes(dashboardPool));
app.use('/api/subscriptions', authenticate(dashboardPool), createSubscriptionRoutes(dashboardPool));
app.use('/api/usage', authenticate(dashboardPool), cacheMiddleware({ ttl: 300, prefix: 'usage', varyBy: ['url', 'user'] }), createUsageRoutes(dashboardPool));
app.use('/api/billing', authenticate(dashboardPool), createBillingRoutes(dashboardPool));
app.use('/api/credits', authenticate(dashboardPool), cacheMiddleware({ ttl: 180, prefix: 'credits', varyBy: ['user'] }), createCreditsRoutes(dashboardPool));
app.use('/api/alerts', authenticate(dashboardPool), createAlertsRoutes(dashboardPool));

// Team collaboration routes
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspaces');
app.use('/api/teams', createTeamRoutes(dashboardPool));
app.use('/api/collaboration', createCollaborationRoutes(dashboardPool));
app.use('/api/version-control', createVersionControlRoutes(dashboardPool, WORKSPACE_DIR));
app.use('/api/team-billing', createTeamBillingRoutes(dashboardPool));

// Automation system routes
app.use('/api/automation', automationRoutes);

// API v1 routes - Comprehensive REST API platform
app.use('/api/v1', createV1Routes(dashboardPool));

// Copilot routes (for Copilot SaaS testing)
app.use('/api/copilot', createCopilotRoutes(dashboardPool));

// Initialize real-time collaboration service
const realtimeCollaboration = new RealtimeCollaborationService(io, dashboardPool);

// Export for use in other modules
export { realtimeCollaboration };

// API endpoints
app.get('/api/files', (_req: Request, res: Response) => {
  // Placeholder for file system operations
  res.json({
    files: [
      { name: 'index.ts', type: 'file', path: '/index.ts' },
      { name: 'package.json', type: 'file', path: '/package.json' },
    ],
  });
});

app.get('/api/file/:path', (req: Request, res: Response) => {
  // Placeholder for reading file content
  const { path } = req.params;
  res.json({
    path,
    content: '// File content placeholder',
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Terminal output
  socket.on('terminal:input', (data) => {
    console.log('Terminal input:', data);
    // Placeholder for terminal command execution
    socket.emit('terminal:output', `Received: ${data}\n`);
  });

  // File operations
  socket.on('file:save', (data) => {
    console.log('Save file:', data);
    socket.emit('file:saved', { success: true, path: data.path });
  });

  // Collaboration events
  socket.on('editor:change', (data) => {
    // Broadcast to other clients
    socket.broadcast.emit('editor:change', data);
  });

  // Resource monitoring subscriptions
  socket.on('subscribe:resources', (data) => {
    const room = data.projectId ? `resources:${data.projectId}` : 'resources:global';
    socket.join(room);
    console.log(`Client subscribed to ${room}`);
  });

  socket.on('unsubscribe:resources', (data) => {
    const room = data.projectId ? `resources:${data.projectId}` : 'resources:global';
    socket.leave(room);
    console.log(`Client unsubscribed from ${room}`);
  });

  // Notification subscriptions
  socket.on('subscribe:notifications', (data) => {
    const room = `notifications:${data.userId}`;
    socket.join(room);
    console.log(`Client subscribed to ${room}`);
  });

  socket.on('unsubscribe:notifications', (data) => {
    const room = `notifications:${data.userId}`;
    socket.leave(room);
    console.log(`Client unsubscribed from ${room}`);
  });

  // Deployment status subscriptions
  socket.on('subscribe:deployment', (data) => {
    const room = `deployment:${data.projectId}`;
    socket.join(room);
    console.log(`Client subscribed to ${room}`);
  });

  socket.on('unsubscribe:deployment', (data) => {
    const room = `deployment:${data.projectId}`;
    socket.leave(room);
    console.log(`Client unsubscribed from ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper function to broadcast resource updates
export function broadcastResourceUpdate(projectId: string | null, metric: any) {
  const room = projectId ? `resources:${projectId}` : 'resources:global';
  io.to(room).emit('resource:update', metric);
}

// Helper function to send notifications
export function sendNotification(userId: string, notification: any) {
  io.to(`notifications:${userId}`).emit('notification', notification);
}

// Helper function to broadcast deployment status
export function broadcastDeploymentStatus(projectId: string, status: any) {
  io.to(`deployment:${projectId}`).emit('deployment:status', status);
}

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready for connections`);
});
