import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupYjsServer } from './yjs-server';
import { setupTerminalServer } from './terminal-server';
import { setupGitRoutes } from './git-api';
import { setupPackageRoutes } from './package-api';
import { setupPreviewServer } from './preview-server';
import { setupDatabaseRoutes } from './database-api';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup routes
setupGitRoutes(app);
setupPackageRoutes(app);
setupDatabaseRoutes(app);

// Setup WebSocket servers
setupYjsServer(wss);
setupTerminalServer(wss);
setupPreviewServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Cloud IDE server running on port ${PORT}`);
  console.log(`📝 Collaborative editing ready`);
  console.log(`💻 Terminal server ready`);
  console.log(`🔧 Git integration ready`);
  console.log(`📦 Package manager ready`);
  console.log(`🗄️ Database GUI ready`);
});

export default app;
