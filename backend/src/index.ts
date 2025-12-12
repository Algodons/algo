import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoints
app.get('/api/files', (req: Request, res: Response) => {
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
