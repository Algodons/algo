import { Pool } from 'pg';
import crypto from 'crypto';
import {
  Organization,
  OrganizationMember,
  PaymentMethod,
  Invoice,
  NotificationPreferences,
  TwoFactorAuth,
  SshKey,
  PersonalAccessToken,
} from '../types/dashboard';

export class AccountSettingsService {
  constructor(private pool: Pool) {}

  // Profile Management
  async updateProfile(
    userId: number,
    updates: { name?: string; email?: string; avatarUrl?: string }
  ): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(updates.avatarUrl);
    }

    values.push(userId);

    const result = await this.pool.query(
      `UPDATE users
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING id, email, name, avatar_url, role`,
      values
    );

    return result.rows[0];
  }

  async getProfile(userId: number): Promise<any> {
    const result = await this.pool.query(
      'SELECT id, email, name, avatar_url, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0];
  }

  // Organization Management
  async createOrganization(
    ownerId: number,
    name: string,
    slug: string,
    description?: string
  ): Promise<Organization> {
    const result = await this.pool.query(
      `INSERT INTO organizations (owner_id, name, slug, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ownerId, name, slug, description]
    );

    // Add owner as member
    await this.pool.query(
      `INSERT INTO organization_members (organization_id, user_id, role, joined_at)
       VALUES ($1, $2, 'owner', CURRENT_TIMESTAMP)`,
      [result.rows[0].id, ownerId]
    );

    return result.rows[0];
  }

  async getOrganizations(userId: number): Promise<Organization[]> {
    const result = await this.pool.query(
      `SELECT o.* FROM organizations o
       JOIN organization_members om ON om.organization_id = o.id
       WHERE om.user_id = $1
       ORDER BY o.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async getOrganizationMembers(organizationId: number): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT 
        om.*,
        u.email,
        u.name,
        u.avatar_url
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1
       ORDER BY om.joined_at DESC`,
      [organizationId]
    );

    return result.rows;
  }

  async inviteOrganizationMember(
    organizationId: number,
    inviterId: number,
    email: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    // Check if inviter has permission
    const inviter = await this.pool.query(
      `SELECT role FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, inviterId]
    );

    if (inviter.rows.length === 0 || (inviter.rows[0].role !== 'owner' && inviter.rows[0].role !== 'admin')) {
      throw new Error('Permission denied');
    }

    // Find user
    const user = await this.pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (user.rows.length === 0) {
      throw new Error('User not found');
    }

    await this.pool.query(
      `INSERT INTO organization_members (organization_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, user_id) DO NOTHING`,
      [organizationId, user.rows[0].id, role]
    );
  }

  async removeOrganizationMember(
    organizationId: number,
    removerId: number,
    userId: number
  ): Promise<void> {
    // Check permissions
    const remover = await this.pool.query(
      `SELECT role FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, removerId]
    );

    if (remover.rows.length === 0 || (remover.rows[0].role !== 'owner' && remover.rows[0].role !== 'admin')) {
      throw new Error('Permission denied');
    }

    await this.pool.query(
      `DELETE FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId]
    );
  }

  // Payment Methods
  async addPaymentMethod(
    userId: number,
    type: 'card' | 'bank_account' | 'paypal',
    providerPaymentMethodId: string,
    lastFour?: string,
    brand?: string,
    expiresAt?: Date
  ): Promise<PaymentMethod> {
    const result = await this.pool.query(
      `INSERT INTO payment_methods 
        (user_id, type, provider_payment_method_id, last_four, brand, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, providerPaymentMethodId, lastFour, brand, expiresAt]
    );

    return result.rows[0];
  }

  async listPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    const result = await this.pool.query(
      'SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );

    return result.rows;
  }

  async setDefaultPaymentMethod(userId: number, paymentMethodId: number): Promise<void> {
    // Unset all defaults
    await this.pool.query(
      'UPDATE payment_methods SET is_default = false WHERE user_id = $1',
      [userId]
    );

    // Set new default
    await this.pool.query(
      'UPDATE payment_methods SET is_default = true WHERE id = $1 AND user_id = $2',
      [paymentMethodId, userId]
    );
  }

  async deletePaymentMethod(userId: number, paymentMethodId: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM payment_methods WHERE id = $1 AND user_id = $2',
      [paymentMethodId, userId]
    );
  }

  // Invoices
  async listInvoices(userId: number): Promise<Invoice[]> {
    const result = await this.pool.query(
      'SELECT * FROM invoices WHERE user_id = $1 ORDER BY issued_at DESC',
      [userId]
    );

    return result.rows;
  }

  async getInvoice(userId: number, invoiceId: number): Promise<Invoice | null> {
    const result = await this.pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND user_id = $2',
      [invoiceId, userId]
    );

    return result.rows[0] || null;
  }

  // Notification Preferences
  async getNotificationPreferences(userId: number): Promise<NotificationPreferences> {
    let result = await this.pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences
      result = await this.pool.query(
        'INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
    }

    return result.rows[0];
  }

  async updateNotificationPreferences(
    userId: number,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'emailNotifications',
      'emailMarketing',
      'emailDeploymentSuccess',
      'emailDeploymentFailure',
      'emailResourceAlerts',
      'emailBillingUpdates',
      'inAppNotifications',
      'slackWebhookUrl',
      'slackNotifications',
    ];

    for (const field of allowedFields) {
      if (preferences[field] !== undefined) {
        const snakeCase = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fields.push(`${snakeCase} = $${paramIndex++}`);
        values.push(preferences[field]);
      }
    }

    values.push(userId);

    const result = await this.pool.query(
      `UPDATE notification_preferences
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // Two-Factor Authentication
  async setup2FA(userId: number): Promise<{ secret: string; backupCodes: string[] }> {
    const secret = crypto.randomBytes(32).toString('base64');
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    await this.pool.query(
      `INSERT INTO two_factor_auth (user_id, secret, backup_codes)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET secret = $2, backup_codes = $3, is_enabled = false`,
      [userId, secret, JSON.stringify(backupCodes)]
    );

    return { secret, backupCodes };
  }

  async enable2FA(userId: number, verificationCode: string): Promise<void> {
    // In a real implementation, verify the code against the secret
    // For now, just enable it
    await this.pool.query(
      `UPDATE two_factor_auth
       SET is_enabled = true, enabled_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );
  }

  async disable2FA(userId: number): Promise<void> {
    await this.pool.query(
      'UPDATE two_factor_auth SET is_enabled = false WHERE user_id = $1',
      [userId]
    );
  }

  async get2FAStatus(userId: number): Promise<{ isEnabled: boolean }> {
    const result = await this.pool.query(
      'SELECT is_enabled FROM two_factor_auth WHERE user_id = $1',
      [userId]
    );

    return { isEnabled: result.rows[0]?.is_enabled || false };
  }

  // SSH Keys
  async addSshKey(userId: number, name: string, publicKey: string): Promise<SshKey> {
    // Generate fingerprint
    const fingerprint = crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .match(/.{2}/g)
      ?.join(':') || '';

    const result = await this.pool.query(
      `INSERT INTO ssh_keys (user_id, name, public_key, fingerprint)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, name, publicKey, fingerprint]
    );

    return result.rows[0];
  }

  async listSshKeys(userId: number): Promise<SshKey[]> {
    const result = await this.pool.query(
      'SELECT * FROM ssh_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows;
  }

  async deleteSshKey(userId: number, keyId: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM ssh_keys WHERE id = $1 AND user_id = $2',
      [keyId, userId]
    );
  }

  // Personal Access Tokens
  async createPersonalAccessToken(
    userId: number,
    name: string,
    scopes: string[],
    expiresAt?: Date
  ): Promise<{ token: PersonalAccessToken; plainToken: string }> {
    const plainToken = `pat_${crypto.randomBytes(32).toString('hex')}`;
    const tokenPrefix = plainToken.substring(0, 12);
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    const result = await this.pool.query(
      `INSERT INTO personal_access_tokens (user_id, name, token_hash, token_prefix, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, name, tokenHash, tokenPrefix, JSON.stringify(scopes), expiresAt]
    );

    return {
      token: result.rows[0],
      plainToken,
    };
  }

  async listPersonalAccessTokens(userId: number): Promise<PersonalAccessToken[]> {
    const result = await this.pool.query(
      'SELECT * FROM personal_access_tokens WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows;
  }

  async revokePersonalAccessToken(userId: number, tokenId: number): Promise<void> {
    await this.pool.query(
      'UPDATE personal_access_tokens SET is_active = false WHERE id = $1 AND user_id = $2',
      [tokenId, userId]
    );
  }

  async deletePersonalAccessToken(userId: number, tokenId: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM personal_access_tokens WHERE id = $1 AND user_id = $2',
      [tokenId, userId]
    );
  }
}
