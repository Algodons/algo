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

dotenv.config();

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

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database management routes
app.use('/api/databases', databaseRoutes);
app.use('/api/databases', queryRoutes);
app.use('/api/databases', schemaRoutes);
app.use('/api/databases', migrationRoutes);
app.use('/api/databases', importExportRoutes);
app.use('/api/databases', backupRoutes);

// Dashboard feature routes
app.use('/api/dashboard/projects', createProjectManagementRoutes(dashboardPool));
app.use('/api/dashboard/resources', createResourceMonitoringRoutes(dashboardPool));
app.use('/api/dashboard/api', createApiManagementRoutes(dashboardPool));
app.use('/api/dashboard/settings', createAccountSettingsRoutes(dashboardPool));

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

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready for connections`);
});
