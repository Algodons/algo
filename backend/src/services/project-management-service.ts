import { Pool } from 'pg';
import { ProjectWithStats, ProjectTemplate, ProjectCollaborator, ProjectFavorite } from '../types/dashboard';

export class ProjectManagementService {
  constructor(private pool: Pool) {}

  async getProjectsWithStats(userId: number, filters?: {
    search?: string;
    language?: string;
    isFavorite?: boolean;
  }): Promise<ProjectWithStats[]> {
    let query = `
      SELECT 
        p.*,
        COALESCE(pf.id IS NOT NULL, false) as is_favorite,
        COALESCE(
          (SELECT json_build_object(
            'cpu', COALESCE(AVG(CASE WHEN rm.metric_type = 'cpu' THEN rm.value END), 0),
            'memory', COALESCE(AVG(CASE WHEN rm.metric_type = 'memory' THEN rm.value END), 0),
            'storage', COALESCE(AVG(CASE WHEN rm.metric_type = 'storage' THEN rm.value END), 0)
          )
          FROM resource_metrics rm
          WHERE rm.project_id = p.id
            AND rm.timestamp > NOW() - INTERVAL '1 hour'
          ), '{}'
        ) as resource_usage
      FROM projects p
      LEFT JOIN project_favorites pf ON pf.project_id = p.id AND pf.user_id = $1
      WHERE p.user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters?.search) {
      query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.language) {
      query += ` AND p.language = $${paramIndex}`;
      params.push(filters.language);
      paramIndex++;
    }

    if (filters?.isFavorite) {
      query += ` AND pf.id IS NOT NULL`;
    }

    query += ` ORDER BY p.updated_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getProjectTemplates(category?: string): Promise<ProjectTemplate[]> {
    let query = `
      SELECT * FROM project_templates
      WHERE is_active = true
    `;

    const params: any[] = [];

    if (category) {
      query += ` AND category = $1`;
      params.push(category);
    }

    query += ` ORDER BY is_official DESC, usage_count DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async createProjectFromTemplate(
    userId: number,
    templateId: number,
    projectName: string
  ): Promise<any> {
    const template = await this.pool.query(
      'SELECT * FROM project_templates WHERE id = $1 AND is_active = true',
      [templateId]
    );

    if (template.rows.length === 0) {
      throw new Error('Template not found');
    }

    const t = template.rows[0];
    const s3Path = `projects/${userId}/${Date.now()}-${projectName}`;

    const result = await this.pool.query(
      `INSERT INTO projects (user_id, name, language, framework, s3_path)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, projectName, t.language, t.framework, s3Path]
    );

    // Increment template usage count
    await this.pool.query(
      'UPDATE project_templates SET usage_count = usage_count + 1 WHERE id = $1',
      [templateId]
    );

    return result.rows[0];
  }

  async toggleFavorite(userId: number, projectId: number): Promise<boolean> {
    // Check if already favorited
    const existing = await this.pool.query(
      'SELECT id FROM project_favorites WHERE user_id = $1 AND project_id = $2',
      [userId, projectId]
    );

    if (existing.rows.length > 0) {
      // Remove favorite
      await this.pool.query(
        'DELETE FROM project_favorites WHERE user_id = $1 AND project_id = $2',
        [userId, projectId]
      );
      return false;
    } else {
      // Add favorite
      await this.pool.query(
        'INSERT INTO project_favorites (user_id, project_id) VALUES ($1, $2)',
        [userId, projectId]
      );
      return true;
    }
  }

  async shareProject(
    projectId: number,
    ownerId: number,
    inviteeEmail: string,
    role: 'viewer' | 'editor' | 'admin'
  ): Promise<ProjectCollaborator> {
    // Check if project belongs to owner
    const project = await this.pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, ownerId]
    );

    if (project.rows.length === 0) {
      throw new Error('Project not found or access denied');
    }

    // Find invitee user
    const invitee = await this.pool.query(
      'SELECT id FROM users WHERE email = $1',
      [inviteeEmail]
    );

    if (invitee.rows.length === 0) {
      throw new Error('User not found');
    }

    const inviteeId = invitee.rows[0].id;

    // Create or update collaboration
    const result = await this.pool.query(
      `INSERT INTO project_collaborators (project_id, user_id, invited_by, role, status)
       VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (project_id, user_id)
       DO UPDATE SET role = $4, status = 'pending', invited_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [projectId, inviteeId, ownerId, role]
    );

    return result.rows[0];
  }

  async getProjectCollaborators(projectId: number): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT 
        pc.*,
        u.email,
        u.name,
        u.avatar_url
       FROM project_collaborators pc
       JOIN users u ON u.id = pc.user_id
       WHERE pc.project_id = $1
       ORDER BY pc.invited_at DESC`,
      [projectId]
    );

    return result.rows;
  }

  async acceptCollaborationInvite(
    userId: number,
    projectId: number
  ): Promise<void> {
    await this.pool.query(
      `UPDATE project_collaborators
       SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
       WHERE project_id = $1 AND user_id = $2 AND status = 'pending'`,
      [projectId, userId]
    );
  }

  async transferProject(
    projectId: number,
    currentOwnerId: number,
    newOwnerEmail: string
  ): Promise<void> {
    // Find new owner
    const newOwner = await this.pool.query(
      'SELECT id FROM users WHERE email = $1',
      [newOwnerEmail]
    );

    if (newOwner.rows.length === 0) {
      throw new Error('New owner not found');
    }

    const newOwnerId = newOwner.rows[0].id;

    // Transfer ownership
    await this.pool.query(
      `UPDATE projects
       SET user_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3`,
      [newOwnerId, projectId, currentOwnerId]
    );
  }
}
