import { Server, Socket } from 'socket.io';
import { Pool } from 'pg';
import { CollaborationService } from './collaboration-service';
import { PresenceUpdate, CollaborationEvent } from '../types/collaboration';

/**
 * Service for managing real-time collaboration via WebSocket
 */
export class RealtimeCollaborationService {
  private collaborationService: CollaborationService;
  private userSessions: Map<string, { userId: number; userName: string; projectId?: number }>;

  constructor(
    private io: Server,
    private pool: Pool
  ) {
    this.collaborationService = new CollaborationService(pool);
    this.userSessions = new Map();
    this.setupEventHandlers();

    // Clean up stale presence records every 5 minutes
    setInterval(() => {
      this.collaborationService.cleanupStalePresence().catch(console.error);
    }, 5 * 60 * 1000);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('Collaboration client connected:', socket.id);

      // Join project room
      socket.on('collaboration:join-project', async (data: { projectId: number; userId: number; userName: string }) => {
        try {
          const { projectId, userId, userName } = data;
          
          // Store session info
          this.userSessions.set(socket.id, { userId, userName, projectId });

          // Join project room
          const room = `project:${projectId}`;
          socket.join(room);

          // Update presence
          await this.collaborationService.updatePresence(userId, projectId, socket.id, {
            status: 'online',
          });

          // Get active users and broadcast
          const activeUsers = await this.collaborationService.getActiveUsers(projectId);
          
          // Notify others about new user
          socket.to(room).emit('collaboration:user-joined', {
            userId,
            userName,
            timestamp: new Date(),
          });

          // Send active users to the joining user
          socket.emit('collaboration:active-users', { users: activeUsers });

          console.log(`User ${userName} (${userId}) joined project ${projectId}`);
        } catch (error) {
          console.error('Error joining project:', error);
          socket.emit('collaboration:error', { message: 'Failed to join project' });
        }
      });

      // Leave project room
      socket.on('collaboration:leave-project', async (data: { projectId: number; userId: number }) => {
        try {
          const { projectId, userId } = data;
          const room = `project:${projectId}`;
          
          socket.leave(room);
          
          // Update presence to offline
          await this.collaborationService.removePresence(userId, socket.id);

          // Notify others
          socket.to(room).emit('collaboration:user-left', {
            userId,
            timestamp: new Date(),
          });

          this.userSessions.delete(socket.id);
          console.log(`User ${userId} left project ${projectId}`);
        } catch (error) {
          console.error('Error leaving project:', error);
        }
      });

      // Update cursor position
      socket.on('collaboration:cursor-update', async (data: {
        projectId: number;
        userId: number;
        filePath: string;
        cursorPosition: { line: number; column: number };
      }) => {
        try {
          const { projectId, userId, filePath, cursorPosition } = data;

          // Update presence in database
          await this.collaborationService.updatePresence(userId, projectId, socket.id, {
            currentFile: filePath,
            cursorPosition,
          });

          // Broadcast to others in the project
          const room = `project:${projectId}`;
          socket.to(room).emit('collaboration:cursor-update', {
            userId,
            filePath,
            cursorPosition,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('Error updating cursor:', error);
        }
      });

      // File editing events
      socket.on('collaboration:file-opened', async (data: {
        projectId: number;
        userId: number;
        filePath: string;
      }) => {
        try {
          const { projectId, userId, filePath } = data;

          await this.collaborationService.updatePresence(userId, projectId, socket.id, {
            currentFile: filePath,
          });

          const room = `project:${projectId}`;
          socket.to(room).emit('collaboration:file-opened', {
            userId,
            filePath,
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('Error handling file opened:', error);
        }
      });

      // Comment events
      socket.on('collaboration:comment-added', (data: {
        projectId: number;
        comment: any;
      }) => {
        const { projectId, comment } = data;
        const room = `project:${projectId}`;
        socket.to(room).emit('collaboration:comment-added', { comment });
      });

      socket.on('collaboration:comment-resolved', (data: {
        projectId: number;
        commentId: number;
      }) => {
        const { projectId, commentId } = data;
        const room = `project:${projectId}`;
        socket.to(room).emit('collaboration:comment-resolved', { commentId });
      });

      // Terminal sharing events
      socket.on('terminal:share-start', (data: {
        sessionId: string;
        projectId: number;
        userId: number;
        accessControl: 'view-only' | 'interactive';
      }) => {
        const { sessionId, projectId, userId, accessControl } = data;
        
        this.collaborationService.createTerminalSession(sessionId, projectId, userId, accessControl);
        
        const room = `project:${projectId}`;
        socket.to(room).emit('terminal:share-started', {
          sessionId,
          ownerId: userId,
          accessControl,
        });
      });

      socket.on('terminal:share-join', (data: {
        sessionId: string;
        userId: number;
      }) => {
        const { sessionId, userId } = data;
        const session = this.collaborationService.getTerminalSession(sessionId);
        
        if (session) {
          this.collaborationService.addTerminalParticipant(sessionId, userId);
          socket.join(`terminal:${sessionId}`);
          
          const room = `project:${session.projectId}`;
          socket.to(room).emit('terminal:participant-joined', { sessionId, userId });
        }
      });

      socket.on('terminal:share-data', (data: {
        sessionId: string;
        data: string;
      }) => {
        const { sessionId, data: terminalData } = data;
        socket.to(`terminal:${sessionId}`).emit('terminal:share-data', { data: terminalData });
      });

      socket.on('terminal:share-end', (data: {
        sessionId: string;
        userId: number;
      }) => {
        const { sessionId, userId } = data;
        const session = this.collaborationService.getTerminalSession(sessionId);
        
        if (session) {
          this.collaborationService.removeTerminalParticipant(sessionId, userId);
          const room = `project:${session.projectId}`;
          socket.to(room).emit('terminal:share-ended', { sessionId });
        }
      });

      // Debug session events
      socket.on('debug:session-start', (data: {
        sessionId: string;
        projectId: number;
        userId: number;
      }) => {
        const { sessionId, projectId, userId } = data;
        
        this.collaborationService.createDebugSession(sessionId, projectId, userId);
        socket.join(`debug:${sessionId}`);
        
        const room = `project:${projectId}`;
        socket.to(room).emit('debug:session-started', { sessionId, userId });
      });

      socket.on('debug:breakpoint-update', (data: {
        sessionId: string;
        breakpoints: Array<{ file: string; line: number; condition?: string }>;
      }) => {
        const { sessionId, breakpoints } = data;
        
        this.collaborationService.updateDebugBreakpoints(sessionId, breakpoints);
        socket.to(`debug:${sessionId}`).emit('debug:breakpoint-update', { breakpoints });
      });

      socket.on('debug:state-update', (data: {
        sessionId: string;
        state: any;
      }) => {
        const { sessionId, state } = data;
        socket.to(`debug:${sessionId}`).emit('debug:state-update', { state });
      });

      // Voice/Video chat events
      socket.on('voice:session-start', (data: {
        sessionId: string;
        projectId: number;
        userId: number;
      }) => {
        const { sessionId, projectId, userId } = data;
        
        this.collaborationService.createVoiceSession(sessionId, projectId, userId);
        socket.join(`voice:${sessionId}`);
        
        const room = `project:${projectId}`;
        socket.to(room).emit('voice:session-started', { sessionId, userId });
      });

      socket.on('voice:media-update', (data: {
        sessionId: string;
        userId: number;
        media: {
          isAudioEnabled?: boolean;
          isVideoEnabled?: boolean;
          isScreenSharing?: boolean;
        };
      }) => {
        const { sessionId, userId, media } = data;
        
        this.collaborationService.updateParticipantMedia(sessionId, userId, media);
        socket.to(`voice:${sessionId}`).emit('voice:media-update', { userId, media });
      });

      socket.on('voice:signal', (data: {
        sessionId: string;
        targetUserId: number;
        signal: any;
      }) => {
        const { sessionId, targetUserId, signal } = data;
        // Forward WebRTC signaling data
        socket.to(`voice:${sessionId}`).emit('voice:signal', {
          fromUserId: this.userSessions.get(socket.id)?.userId,
          signal,
        });
      });

      // Heartbeat to keep presence alive
      socket.on('collaboration:heartbeat', async (data: { projectId: number; userId: number }) => {
        try {
          const { projectId, userId } = data;
          await this.collaborationService.updatePresence(userId, projectId, socket.id, {});
        } catch (error) {
          // Ignore heartbeat errors
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        try {
          const session = this.userSessions.get(socket.id);
          if (session && session.projectId) {
            await this.collaborationService.removePresence(session.userId, socket.id);
            
            const room = `project:${session.projectId}`;
            socket.to(room).emit('collaboration:user-left', {
              userId: session.userId,
              timestamp: new Date(),
            });
          }
          
          this.userSessions.delete(socket.id);
          console.log('Collaboration client disconnected:', socket.id);
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });
    });
  }

  /**
   * Broadcast activity to project members
   */
  broadcastToProject(projectId: number, event: string, data: any) {
    this.io.to(`project:${projectId}`).emit(event, data);
  }

  /**
   * Send event to specific user
   */
  sendToUser(userId: number, event: string, data: any) {
    // Find all sockets for this user
    for (const [socketId, session] of this.userSessions.entries()) {
      if (session.userId === userId) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }
}
