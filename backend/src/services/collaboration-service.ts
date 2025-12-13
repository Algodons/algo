import { Pool } from 'pg';
import {
  CollaborationSession,
  UserPresence,
  CodeComment,
  CreateCommentRequest,
  SessionType,
  PresenceStatus,
  PresenceUpdate,
  TerminalShareSession,
  DebugSession,
  VoiceChatSession,
} from '../types/collaboration';

/**
 * Service for managing real-time collaboration features
 */
export class CollaborationService {
  constructor(private pool: Pool) {}

  /**
   * Create or update collaboration session
   */
  async createSession(
    projectId: number,
    userId: number,
    sessionType: SessionType,
    sessionName?: string
  ): Promise<CollaborationSession> {
    const result = await this.pool.query(
      `INSERT INTO collaboration_sessions (project_id, session_type, session_name, started_by, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [projectId, sessionType, sessionName, userId]
    );
    return result.rows[0];
  }

  /**
   * End collaboration session
   */
  async endSession(sessionId: number): Promise<void> {
    await this.pool.query(
      `UPDATE collaboration_sessions 
       SET is_active = false, ended_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [sessionId]
    );
  }

  /**
   * Get active sessions for a project
   */
  async getActiveSessions(projectId: number): Promise<CollaborationSession[]> {
    const result = await this.pool.query(
      `SELECT cs.*, u.name as started_by_name, u.email as started_by_email
       FROM collaboration_sessions cs
       LEFT JOIN users u ON cs.started_by = u.id
       WHERE cs.project_id = $1 AND cs.is_active = true
       ORDER BY cs.started_at DESC`,
      [projectId]
    );
    return result.rows;
  }

  /**
   * Update user presence
   */
  async updatePresence(
    userId: number,
    projectId: number,
    sessionId: string,
    data: {
      status?: PresenceStatus;
      currentFile?: string;
      cursorPosition?: { line: number; column: number };
    }
  ): Promise<UserPresence> {
    const result = await this.pool.query(
      `INSERT INTO user_presence (user_id, project_id, session_id, status, current_file, cursor_position, last_activity)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, session_id)
       DO UPDATE SET 
         status = COALESCE($4, user_presence.status),
         current_file = COALESCE($5, user_presence.current_file),
         cursor_position = COALESCE($6, user_presence.cursor_position),
         last_activity = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        userId,
        projectId,
        sessionId,
        data.status,
        data.currentFile,
        data.cursorPosition ? JSON.stringify(data.cursorPosition) : null,
      ]
    );
    return result.rows[0];
  }

  /**
   * Get active users for a project
   */
  async getActiveUsers(projectId: number): Promise<PresenceUpdate[]> {
    const result = await this.pool.query(
      `SELECT up.*, u.name as user_name, u.email, u.avatar_url
       FROM user_presence up
       INNER JOIN users u ON up.user_id = u.id
       WHERE up.project_id = $1 
         AND up.status IN ('online', 'away')
         AND up.last_activity > NOW() - INTERVAL '5 minutes'
       ORDER BY up.last_activity DESC`,
      [projectId]
    );

    return result.rows.map((row) => ({
      userId: row.user_id,
      userName: row.user_name,
      status: row.status,
      currentFile: row.current_file,
      cursorPosition: row.cursor_position,
      color: this.getUserColor(row.user_id),
    }));
  }

  /**
   * Remove user presence
   */
  async removePresence(userId: number, sessionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE user_presence 
       SET status = 'offline', last_activity = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND session_id = $2`,
      [userId, sessionId]
    );
  }

  /**
   * Create code comment
   */
  async createComment(
    projectId: number,
    userId: number,
    data: CreateCommentRequest
  ): Promise<CodeComment> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO code_comments (project_id, file_path, line_number, line_end, user_id, content)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [projectId, data.filePath, data.lineNumber, data.lineEnd, userId, data.content]
      );

      const comment = result.rows[0];

      // Handle mentions
      if (data.mentions && data.mentions.length > 0) {
        for (const mentionedUserId of data.mentions) {
          await client.query(
            `INSERT INTO code_comment_mentions (comment_id, user_id)
             VALUES ($1, $2)`,
            [comment.id, mentionedUserId]
          );
        }
      }

      await client.query('COMMIT');
      return comment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reply to a comment (create thread)
   */
  async replyToComment(
    commentId: number,
    userId: number,
    content: string,
    mentions?: number[]
  ): Promise<CodeComment> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get original comment
      const originalResult = await client.query(
        'SELECT project_id, file_path, line_number FROM code_comments WHERE id = $1',
        [commentId]
      );

      if (originalResult.rows.length === 0) {
        throw new Error('Comment not found');
      }

      const original = originalResult.rows[0];

      // Create reply
      const result = await client.query(
        `INSERT INTO code_comments (project_id, file_path, line_number, thread_id, user_id, content)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [original.project_id, original.file_path, original.line_number, commentId, userId, content]
      );

      const comment = result.rows[0];

      // Handle mentions
      if (mentions && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          await client.query(
            `INSERT INTO code_comment_mentions (comment_id, user_id)
             VALUES ($1, $2)`,
            [comment.id, mentionedUserId]
          );
        }
      }

      await client.query('COMMIT');
      return comment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Resolve comment thread
   */
  async resolveComment(commentId: number, userId: number): Promise<void> {
    await this.pool.query(
      `UPDATE code_comments 
       SET resolved = true, resolved_by = $2, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $1 OR thread_id = $1`,
      [commentId, userId]
    );
  }

  /**
   * Get comments for a file
   */
  async getFileComments(projectId: number, filePath: string): Promise<CodeComment[]> {
    const result = await this.pool.query(
      `SELECT cc.*, u.name as user_name, u.email as user_email, u.avatar_url
       FROM code_comments cc
       INNER JOIN users u ON cc.user_id = u.id
       WHERE cc.project_id = $1 AND cc.file_path = $2
       ORDER BY cc.line_number, cc.created_at`,
      [projectId, filePath]
    );
    return result.rows;
  }

  /**
   * Get all comments for a project
   */
  async getProjectComments(
    projectId: number,
    resolved?: boolean
  ): Promise<CodeComment[]> {
    let query = `
      SELECT cc.*, u.name as user_name, u.email as user_email, u.avatar_url
      FROM code_comments cc
      INNER JOIN users u ON cc.user_id = u.id
      WHERE cc.project_id = $1
    `;
    const params: any[] = [projectId];

    if (resolved !== undefined) {
      query += ` AND cc.resolved = $2`;
      params.push(resolved);
    }

    query += ` ORDER BY cc.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get comment thread
   */
  async getCommentThread(commentId: number): Promise<CodeComment[]> {
    const result = await this.pool.query(
      `SELECT cc.*, u.name as user_name, u.email as user_email, u.avatar_url
       FROM code_comments cc
       INNER JOIN users u ON cc.user_id = u.id
       WHERE cc.id = $1 OR cc.thread_id = $1
       ORDER BY cc.created_at`,
      [commentId]
    );
    return result.rows;
  }

  /**
   * Clean up stale presence records
   */
  async cleanupStalePresence(): Promise<void> {
    await this.pool.query(
      `UPDATE user_presence 
       SET status = 'offline'
       WHERE status != 'offline' AND last_activity < NOW() - INTERVAL '10 minutes'`
    );
  }

  /**
   * Get session recording URL
   */
  async getSessionRecording(sessionId: number): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT recording_url FROM collaboration_sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].recording_url;
  }

  /**
   * Update session recording URL
   */
  async updateSessionRecording(sessionId: number, recordingUrl: string): Promise<void> {
    await this.pool.query(
      'UPDATE collaboration_sessions SET recording_url = $1 WHERE id = $2',
      [recordingUrl, sessionId]
    );
  }

  /**
   * Get user color for presence indicators
   */
  private getUserColor(userId: number): string {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#FFA07A', // Salmon
      '#98D8C8', // Mint
      '#F7DC6F', // Yellow
      '#BB8FCE', // Purple
      '#85C1E2', // Sky Blue
      '#F8B88B', // Peach
      '#ABEBC6', // Light Green
    ];

    return colors[userId % colors.length];
  }

  /**
   * Store terminal session info in memory (would use Redis in production)
   */
  private terminalSessions = new Map<string, TerminalShareSession>();

  /**
   * Create terminal share session
   */
  createTerminalSession(
    sessionId: string,
    projectId: number,
    ownerId: number,
    accessControl: 'view-only' | 'interactive' = 'view-only'
  ): TerminalShareSession {
    const session: TerminalShareSession = {
      sessionId,
      projectId,
      ownerId,
      participants: [ownerId],
      accessControl,
      isRecording: false,
    };

    this.terminalSessions.set(sessionId, session);
    return session;
  }

  /**
   * Get terminal session
   */
  getTerminalSession(sessionId: string): TerminalShareSession | undefined {
    return this.terminalSessions.get(sessionId);
  }

  /**
   * Add participant to terminal session
   */
  addTerminalParticipant(sessionId: string, userId: number): void {
    const session = this.terminalSessions.get(sessionId);
    if (session && !session.participants.includes(userId)) {
      session.participants.push(userId);
    }
  }

  /**
   * Remove participant from terminal session
   */
  removeTerminalParticipant(sessionId: string, userId: number): void {
    const session = this.terminalSessions.get(sessionId);
    if (session) {
      session.participants = session.participants.filter((id) => id !== userId);
      if (session.participants.length === 0) {
        this.terminalSessions.delete(sessionId);
      }
    }
  }

  /**
   * Store debug session info in memory (would use Redis in production)
   */
  private debugSessions = new Map<string, DebugSession>();

  /**
   * Create debug session
   */
  createDebugSession(sessionId: string, projectId: number, userId: number): DebugSession {
    const session: DebugSession = {
      sessionId,
      projectId,
      participants: [userId],
      breakpoints: [],
    };

    this.debugSessions.set(sessionId, session);
    return session;
  }

  /**
   * Get debug session
   */
  getDebugSession(sessionId: string): DebugSession | undefined {
    return this.debugSessions.get(sessionId);
  }

  /**
   * Update debug session breakpoints
   */
  updateDebugBreakpoints(
    sessionId: string,
    breakpoints: Array<{ file: string; line: number; condition?: string }>
  ): void {
    const session = this.debugSessions.get(sessionId);
    if (session) {
      session.breakpoints = breakpoints;
    }
  }

  /**
   * Store voice/video sessions in memory (would use Redis in production)
   */
  private voiceSessions = new Map<string, VoiceChatSession>();

  /**
   * Create voice/video session
   */
  createVoiceSession(sessionId: string, projectId: number, userId: number): VoiceChatSession {
    const session: VoiceChatSession = {
      sessionId,
      projectId,
      participants: [
        {
          userId,
          userName: '',
          isAudioEnabled: false,
          isVideoEnabled: false,
          isScreenSharing: false,
        },
      ],
      startedAt: new Date(),
    };

    this.voiceSessions.set(sessionId, session);
    return session;
  }

  /**
   * Get voice session
   */
  getVoiceSession(sessionId: string): VoiceChatSession | undefined {
    return this.voiceSessions.get(sessionId);
  }

  /**
   * Update participant media state
   */
  updateParticipantMedia(
    sessionId: string,
    userId: number,
    media: {
      isAudioEnabled?: boolean;
      isVideoEnabled?: boolean;
      isScreenSharing?: boolean;
    }
  ): void {
    const session = this.voiceSessions.get(sessionId);
    if (session) {
      const participant = session.participants.find((p) => p.userId === userId);
      if (participant) {
        Object.assign(participant, media);
      }
    }
  }
}
