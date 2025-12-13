import { Pool } from 'pg';
import crypto from 'crypto';
import {
  Organization,
  OrganizationMember,
  OrganizationRole,
  CreateOrganizationRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  ProjectPermissions,
  SetProjectPermissionsRequest,
  TeamActivityLog,
  SharedEnvVariable,
  EnvVariableScope,
} from '../types/collaboration';

/**
 * Service for managing teams and organizations
 */
export class TeamService {
  constructor(private pool: Pool) {}

  /**
   * Create a new organization
   */
  async createOrganization(
    userId: number,
    data: CreateOrganizationRequest
  ): Promise<Organization> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create organization
      const orgResult = await client.query(
        `INSERT INTO organizations (name, slug, description, settings)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.name, data.slug, data.description || '', '{}']
      );

      const organization = orgResult.rows[0];

      // Add creator as owner
      await client.query(
        `INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [organization.id, userId, 'owner', 'active']
      );

      // Log activity
      await this.logActivity(client, {
        organization_id: organization.id,
        user_id: userId,
        activity_type: 'organization_created',
        details: { organizationName: data.name },
      });

      await client.query('COMMIT');
      return organization;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: number): Promise<Organization | null> {
    const result = await this.pool.query(
      'SELECT * FROM organizations WHERE id = $1',
      [organizationId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get organizations for a user
   */
  async getUserOrganizations(userId: number): Promise<Organization[]> {
    const result = await this.pool.query(
      `SELECT o.* FROM organizations o
       INNER JOIN organization_members om ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.status = 'active'
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Invite member to organization
   */
  async inviteMember(
    organizationId: number,
    invitedBy: number,
    data: InviteMemberRequest
  ): Promise<OrganizationMember> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get user by email
      const userResult = await client.query('SELECT id FROM users WHERE email = $1', [
        data.email,
      ]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userId = userResult.rows[0].id;

      // Check if already a member
      const existingMember = await client.query(
        'SELECT * FROM organization_members WHERE organization_id = $1 AND user_id = $2',
        [organizationId, userId]
      );

      if (existingMember.rows.length > 0) {
        throw new Error('User is already a member');
      }

      // Create invitation
      const result = await client.query(
        `INSERT INTO organization_members (organization_id, user_id, role, invited_by, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [organizationId, userId, data.role, invitedBy, 'pending']
      );

      // Log activity
      await this.logActivity(client, {
        organization_id: organizationId,
        user_id: invitedBy,
        activity_type: 'member_invited',
        details: { invitedUserId: userId, role: data.role },
      });

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Accept organization invitation
   */
  async acceptInvitation(organizationId: number, userId: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE organization_members 
         SET status = 'active', joined_at = CURRENT_TIMESTAMP
         WHERE organization_id = $1 AND user_id = $2 AND status = 'pending'`,
        [organizationId, userId]
      );

      await this.logActivity(client, {
        organization_id: organizationId,
        user_id: userId,
        activity_type: 'member_joined',
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: number,
    userId: number,
    updatedBy: number,
    data: UpdateMemberRoleRequest
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE organization_members 
         SET role = $1
         WHERE organization_id = $2 AND user_id = $3`,
        [data.role, organizationId, userId]
      );

      await this.logActivity(client, {
        organization_id: organizationId,
        user_id: updatedBy,
        activity_type: 'member_role_updated',
        details: { targetUserId: userId, newRole: data.role },
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    organizationId: number,
    userId: number,
    removedBy: number
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2',
        [organizationId, userId]
      );

      await this.logActivity(client, {
        organization_id: organizationId,
        user_id: removedBy,
        activity_type: 'member_removed',
        details: { removedUserId: userId },
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId: number): Promise<OrganizationMember[]> {
    const result = await this.pool.query(
      `SELECT om.*, u.email, u.name as user_name, u.avatar_url
       FROM organization_members om
       INNER JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = $1
       ORDER BY om.joined_at DESC`,
      [organizationId]
    );
    return result.rows;
  }

  /**
   * Check if user has role in organization
   */
  async checkUserRole(
    organizationId: number,
    userId: number,
    requiredRole?: OrganizationRole
  ): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = $3',
      [organizationId, userId, 'active']
    );

    if (result.rows.length === 0) {
      return false;
    }

    if (!requiredRole) {
      return true;
    }

    const role = result.rows[0].role;
    const roleHierarchy: Record<OrganizationRole, number> = {
      owner: 4,
      admin: 3,
      developer: 2,
      viewer: 1,
    };

    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  }

  /**
   * Set project permissions
   */
  async setProjectPermissions(
    projectId: number,
    grantedBy: number,
    data: SetProjectPermissionsRequest
  ): Promise<ProjectPermissions> {
    const result = await this.pool.query(
      `INSERT INTO project_permissions (project_id, organization_id, user_id, permissions, granted_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (project_id, COALESCE(organization_id, 0), COALESCE(user_id, 0))
       DO UPDATE SET permissions = $4, granted_by = $5, granted_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [projectId, data.organizationId, data.userId, JSON.stringify(data.permissions), grantedBy]
    );

    return result.rows[0];
  }

  /**
   * Check project permissions
   */
  async checkProjectPermission(
    projectId: number,
    userId: number,
    permission: 'read' | 'write' | 'deploy' | 'admin'
  ): Promise<boolean> {
    // Check direct user permissions
    const userResult = await this.pool.query(
      `SELECT permissions FROM project_permissions 
       WHERE project_id = $1 AND user_id = $2 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [projectId, userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].permissions[permission]) {
      return true;
    }

    // Check organization permissions
    const orgResult = await this.pool.query(
      `SELECT pp.permissions FROM project_permissions pp
       INNER JOIN organization_members om ON pp.organization_id = om.organization_id
       WHERE pp.project_id = $1 AND om.user_id = $2 AND om.status = 'active'
       AND (pp.expires_at IS NULL OR pp.expires_at > CURRENT_TIMESTAMP)`,
      [projectId, userId]
    );

    if (orgResult.rows.length > 0 && orgResult.rows[0].permissions[permission]) {
      return true;
    }

    // Check if user is project owner
    const projectResult = await this.pool.query(
      'SELECT user_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length > 0 && projectResult.rows[0].user_id === userId) {
      return true;
    }

    return false;
  }

  /**
   * Get team activity feed
   */
  async getActivityFeed(
    organizationId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TeamActivityLog[]> {
    const result = await this.pool.query(
      `SELECT tal.*, u.name as user_name, u.email as user_email
       FROM team_activity_logs tal
       LEFT JOIN users u ON tal.user_id = u.id
       WHERE tal.organization_id = $1
       ORDER BY tal.created_at DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Set shared environment variable
   */
  async setSharedEnvVariable(
    scope: EnvVariableScope,
    scopeId: number,
    key: string,
    value: string,
    userId: number,
    encrypt: boolean = true
  ): Promise<SharedEnvVariable> {
    let encryptedValue = value;
    if (encrypt) {
      encryptedValue = this.encryptValue(value);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO shared_env_variables (
          ${scope === 'organization' ? 'organization_id' : 'project_id'},
          key, value, encrypted, scope, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (${scope === 'organization' ? 'organization_id' : 'project_id'}, key)
         DO UPDATE SET value = $3, encrypted = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [scopeId, key, encryptedValue, encrypt, scope, userId]
      );

      await this.logActivity(client, {
        [scope === 'organization' ? 'organization_id' : 'project_id']: scopeId,
        user_id: userId,
        activity_type: 'env_variable_updated',
        details: { key, scope },
      });

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get shared environment variables
   */
  async getSharedEnvVariables(
    scope: EnvVariableScope,
    scopeId: number,
    decrypt: boolean = true
  ): Promise<SharedEnvVariable[]> {
    const result = await this.pool.query(
      `SELECT * FROM shared_env_variables 
       WHERE scope = $1 AND ${scope === 'organization' ? 'organization_id' : 'project_id'} = $2
       ORDER BY key`,
      [scope, scopeId]
    );

    if (decrypt) {
      return result.rows.map((row) => ({
        ...row,
        value: row.encrypted ? this.decryptValue(row.value) : row.value,
      }));
    }

    return result.rows;
  }

  /**
   * Delete shared environment variable
   */
  async deleteSharedEnvVariable(id: number, userId: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const varResult = await client.query(
        'SELECT * FROM shared_env_variables WHERE id = $1',
        [id]
      );

      if (varResult.rows.length === 0) {
        throw new Error('Environment variable not found');
      }

      const variable = varResult.rows[0];

      await client.query('DELETE FROM shared_env_variables WHERE id = $1', [id]);

      await this.logActivity(client, {
        [variable.scope === 'organization' ? 'organization_id' : 'project_id']:
          variable[variable.scope === 'organization' ? 'organization_id' : 'project_id'],
        user_id: userId,
        activity_type: 'env_variable_deleted',
        details: { key: variable.key, scope: variable.scope },
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Encrypt a value using AES-256-CBC
   */
  private encryptValue(value: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `encrypted:${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a value using AES-256-CBC
   */
  private decryptValue(encryptedValue: string): string {
    if (!encryptedValue.startsWith('encrypted:')) {
      return encryptedValue;
    }

    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const key = this.getEncryptionKey();
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Get encryption key from environment
   */
  private getEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
    return crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Log team activity
   */
  private async logActivity(
    client: any,
    data: Partial<TeamActivityLog>
  ): Promise<void> {
    await client.query(
      `INSERT INTO team_activity_logs (
        organization_id, project_id, user_id, activity_type, 
        resource_type, resource_id, details, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.organization_id,
        data.project_id,
        data.user_id,
        data.activity_type,
        data.resource_type,
        data.resource_id,
        JSON.stringify(data.details || {}),
        JSON.stringify(data.metadata || {}),
      ]
    );
  }
}
