const pty = require('node-pty');
const { logger } = require('../utils/logger');

const terminals = new Map(); // socketId -> terminal instance

const setupWebSocket = (io) => {
  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    // Terminal connection
    socket.on('terminal:connect', ({ projectId }) => {
      try {
        // Create a new terminal session
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        const terminal = pty.spawn(shell, [], {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: process.env.HOME || '/tmp',
          env: process.env,
        });

        terminals.set(socket.id, terminal);

        // Forward terminal output to client
        terminal.on('data', (data) => {
          socket.emit('terminal:data', data);
        });

        terminal.on('exit', () => {
          terminals.delete(socket.id);
          socket.emit('terminal:exit');
        });

        logger.info(`Terminal created for socket ${socket.id}, project ${projectId}`);
      } catch (error) {
        logger.error('Terminal connection error:', error);
        socket.emit('terminal:error', { message: 'Failed to create terminal' });
      }
    });

    // Terminal input
    socket.on('terminal:input', ({ data }) => {
      const terminal = terminals.get(socket.id);
      if (terminal) {
        terminal.write(data);
      }
    });

    // Terminal resize
    socket.on('terminal:resize', ({ cols, rows }) => {
      const terminal = terminals.get(socket.id);
      if (terminal) {
        terminal.resize(cols, rows);
      }
    });

    // Collaborative editing - Yjs sync
    socket.on('yjs:sync', ({ projectId, update }) => {
      // Broadcast to other users in the same project
      socket.to(`project-${projectId}`).emit('yjs:update', { update });
    });

    // Join project room for collaboration
    socket.on('project:join', ({ projectId }) => {
      socket.join(`project-${projectId}`);
      logger.info(`Socket ${socket.id} joined project ${projectId}`);
    });

    // Leave project room
    socket.on('project:leave', ({ projectId }) => {
      socket.leave(`project-${projectId}`);
      logger.info(`Socket ${socket.id} left project ${projectId}`);
    });

    // File watching
    socket.on('file:watch', ({ projectId, filePath }) => {
      socket.join(`file-${projectId}-${filePath}`);
    });

    socket.on('file:change', ({ projectId, filePath, content }) => {
      socket.to(`file-${projectId}-${filePath}`).emit('file:updated', { filePath, content });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const terminal = terminals.get(socket.id);
      if (terminal) {
        terminal.kill();
        terminals.delete(socket.id);
      }
      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  logger.info('WebSocket server initialized');
};

module.exports = {
  setupWebSocket,
};
