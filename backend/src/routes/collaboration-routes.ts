import { Router } from 'express';
import { Pool } from 'pg';
import { CollaborationService } from '../services/collaboration-service';
import { authenticate } from '../middleware/auth';

/**
 * Create collaboration routes
 */
export function createCollaborationRoutes(pool: Pool): Router {
  const router = Router();
  const collaborationService = new CollaborationService(pool);

  // Create collaboration session
  router.post('/sessions', authenticate(pool), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { projectId, sessionType, sessionName } = req.body;

      if (!projectId || !sessionType) {
        return res.status(400).json({ error: 'projectId and sessionType are required' });
      }

      const session = await collaborationService.createSession(
        projectId,
        userId,
        sessionType,
        sessionName
      );

      res.status(201).json({ session });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // End collaboration session
  router.post('/sessions/:sessionId/end', authenticate(pool), async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      await collaborationService.endSession(sessionId);
      res.json({ message: 'Session ended' });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({ error: 'Failed to end session' });
    }
  });

  // Get active sessions for a project
  router.get('/projects/:projectId/sessions', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const sessions = await collaborationService.getActiveSessions(projectId);
      res.json({ sessions });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  });

  // Update user presence
  router.post('/presence', authenticate(pool), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { projectId, sessionId, status, currentFile, cursorPosition } = req.body;

      if (!projectId || !sessionId) {
        return res.status(400).json({ error: 'projectId and sessionId are required' });
      }

      const presence = await collaborationService.updatePresence(userId, projectId, sessionId, {
        status,
        currentFile,
        cursorPosition,
      });

      res.json({ presence });
    } catch (error) {
      console.error('Update presence error:', error);
      res.status(500).json({ error: 'Failed to update presence' });
    }
  });

  // Get active users for a project
  router.get('/projects/:projectId/users', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const activeUsers = await collaborationService.getActiveUsers(projectId);
      res.json({ users: activeUsers });
    } catch (error) {
      console.error('Get active users error:', error);
      res.status(500).json({ error: 'Failed to get active users' });
    }
  });

  // Remove user presence
  router.delete('/presence/:sessionId', authenticate(pool), async (req, res) => {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.sessionId;
      await collaborationService.removePresence(userId, sessionId);
      res.json({ message: 'Presence removed' });
    } catch (error) {
      console.error('Remove presence error:', error);
      res.status(500).json({ error: 'Failed to remove presence' });
    }
  });

  // Create code comment
  router.post('/comments', authenticate(pool), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { projectId, filePath, lineNumber, lineEnd, content, mentions } = req.body;

      if (!projectId || !filePath || lineNumber === undefined || !content) {
        return res.status(400).json({
          error: 'projectId, filePath, lineNumber, and content are required',
        });
      }

      const comment = await collaborationService.createComment(projectId, userId, {
        filePath,
        lineNumber,
        lineEnd,
        content,
        mentions,
      });

      res.status(201).json({ comment });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  });

  // Reply to comment
  router.post('/comments/:commentId/replies', authenticate(pool), async (req, res) => {
    try {
      const userId = req.user!.id;
      const commentId = parseInt(req.params.commentId);
      const { content, mentions } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'content is required' });
      }

      const reply = await collaborationService.replyToComment(commentId, userId, content, mentions);
      res.status(201).json({ reply });
    } catch (error) {
      console.error('Reply to comment error:', error);
      res.status(500).json({ error: 'Failed to reply to comment' });
    }
  });

  // Resolve comment
  router.post('/comments/:commentId/resolve', authenticate(pool), async (req, res) => {
    try {
      const userId = req.user!.id;
      const commentId = parseInt(req.params.commentId);
      await collaborationService.resolveComment(commentId, userId);
      res.json({ message: 'Comment resolved' });
    } catch (error) {
      console.error('Resolve comment error:', error);
      res.status(500).json({ error: 'Failed to resolve comment' });
    }
  });

  // Get file comments
  router.get('/projects/:projectId/files/:filePath/comments', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const filePath = decodeURIComponent(req.params.filePath);
      const comments = await collaborationService.getFileComments(projectId, filePath);
      res.json({ comments });
    } catch (error) {
      console.error('Get file comments error:', error);
      res.status(500).json({ error: 'Failed to get file comments' });
    }
  });

  // Get project comments
  router.get('/projects/:projectId/comments', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
      const comments = await collaborationService.getProjectComments(projectId, resolved);
      res.json({ comments });
    } catch (error) {
      console.error('Get project comments error:', error);
      res.status(500).json({ error: 'Failed to get project comments' });
    }
  });

  // Get comment thread
  router.get('/comments/:commentId/thread', authenticate(pool), async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const thread = await collaborationService.getCommentThread(commentId);
      res.json({ thread });
    } catch (error) {
      console.error('Get comment thread error:', error);
      res.status(500).json({ error: 'Failed to get comment thread' });
    }
  });

  // Get session recording
  router.get('/sessions/:sessionId/recording', authenticate(pool), async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const recordingUrl = await collaborationService.getSessionRecording(sessionId);

      if (!recordingUrl) {
        return res.status(404).json({ error: 'Recording not found' });
      }

      res.json({ recordingUrl });
    } catch (error) {
      console.error('Get recording error:', error);
      res.status(500).json({ error: 'Failed to get recording' });
    }
  });

  // Update session recording URL
  router.put('/sessions/:sessionId/recording', authenticate(pool), async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { recordingUrl } = req.body;

      if (!recordingUrl) {
        return res.status(400).json({ error: 'recordingUrl is required' });
      }

      await collaborationService.updateSessionRecording(sessionId, recordingUrl);
      res.json({ message: 'Recording URL updated' });
    } catch (error) {
      console.error('Update recording error:', error);
      res.status(500).json({ error: 'Failed to update recording URL' });
    }
  });

  return router;
}
