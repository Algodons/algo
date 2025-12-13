/**
 * GDPR Compliance Utilities
 * Implements data privacy policies, consent management, and right to erasure
 */

import { Pool } from 'pg';
import { getAuditLogger } from '../audit/logger';
import { AuditEventType, createAuditEvent } from '../audit/events';

export enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  THIRD_PARTY = 'third_party',
  ESSENTIAL = 'essential',
}

export enum DataProcessingPurpose {
  SERVICE_DELIVERY = 'service_delivery',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  SECURITY = 'security',
  LEGAL_COMPLIANCE = 'legal_compliance',
}

export interface ConsentRecord {
  userId: number;
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataExportRequest {
  userId: number;
  requestedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface DataDeletionRequest {
  userId: number;
  requestedAt: Date;
  scheduledAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed';
  reason?: string;
}

export class GDPRComplianceService {
  constructor(private pool: Pool) {}

  /**
   * Initialize GDPR compliance tables
   */
  async initialize(): Promise<void> {
    await this.pool.query(`
      -- Consent management
      CREATE TABLE IF NOT EXISTS user_consents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        consent_type VARCHAR(50) NOT NULL,
        granted BOOLEAN NOT NULL,
        granted_at TIMESTAMP,
        revoked_at TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, consent_type)
      );

      -- Data export requests (right to data portability)
      CREATE TABLE IF NOT EXISTS data_export_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        requested_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        download_url TEXT,
        expires_at TIMESTAMP,
        metadata JSONB
      );

      -- Data deletion requests (right to erasure)
      CREATE TABLE IF NOT EXISTS data_deletion_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        requested_at TIMESTAMP DEFAULT NOW(),
        scheduled_at TIMESTAMP,
        completed_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reason TEXT,
        metadata JSONB
      );

      -- Data retention policies
      CREATE TABLE IF NOT EXISTS data_retention_policies (
        id SERIAL PRIMARY KEY,
        data_type VARCHAR(100) NOT NULL,
        retention_period_days INTEGER NOT NULL,
        purpose VARCHAR(100) NOT NULL,
        legal_basis TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(data_type)
      );

      -- Data processing records
      CREATE TABLE IF NOT EXISTS data_processing_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        purpose VARCHAR(100) NOT NULL,
        data_types TEXT[] NOT NULL,
        legal_basis VARCHAR(100) NOT NULL,
        recipients TEXT[],
        retention_period VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
      CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
    `);
  }

  /**
   * Record user consent
   */
  async recordConsent(consent: ConsentRecord): Promise<void> {
    const timestamp = consent.granted ? consent.grantedAt || new Date() : consent.revokedAt || new Date();

    await this.pool.query(
      `INSERT INTO user_consents 
       (user_id, consent_type, granted, granted_at, revoked_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, consent_type) 
       DO UPDATE SET
         granted = EXCLUDED.granted,
         granted_at = EXCLUDED.granted_at,
         revoked_at = EXCLUDED.revoked_at,
         updated_at = NOW()`,
      [
        consent.userId,
        consent.consentType,
        consent.granted,
        consent.granted ? timestamp : null,
        !consent.granted ? timestamp : null,
        consent.ipAddress,
        consent.userAgent,
      ]
    );

    // Log audit event
    const auditLogger = getAuditLogger();
    await auditLogger.log(
      createAuditEvent(
        consent.granted 
          ? AuditEventType.COMPLIANCE_GDPR_CONSENT_GRANTED 
          : AuditEventType.COMPLIANCE_GDPR_CONSENT_REVOKED,
        `User ${consent.granted ? 'granted' : 'revoked'} consent for ${consent.consentType}`,
        {
          userId: consent.userId,
          metadata: { consentType: consent.consentType },
        }
      )
    );
  }

  /**
   * Get user consents
   */
  async getUserConsents(userId: number): Promise<ConsentRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM user_consents WHERE user_id = $1`,
      [userId]
    );

    return result.rows.map(row => ({
      userId: row.user_id,
      consentType: row.consent_type,
      granted: row.granted,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    }));
  }

  /**
   * Check if user has granted consent for a specific type
   */
  async hasConsent(userId: number, consentType: ConsentType): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT granted FROM user_consents 
       WHERE user_id = $1 AND consent_type = $2`,
      [userId, consentType]
    );

    return result.rows.length > 0 && result.rows[0].granted;
  }

  /**
   * Request data export (right to data portability)
   */
  async requestDataExport(userId: number, userEmail: string): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO data_export_requests (user_id, status)
       VALUES ($1, 'pending')
       RETURNING id`,
      [userId]
    );

    const requestId = result.rows[0].id;

    // Log audit event
    const auditLogger = getAuditLogger();
    await auditLogger.log(
      createAuditEvent(
        AuditEventType.COMPLIANCE_GDPR_DATA_REQUEST,
        'User requested data export',
        {
          userId,
          userEmail,
          metadata: { requestId, requestType: 'export' },
        }
      )
    );

    // In production, trigger async job to generate export
    this.generateDataExport(requestId, userId);

    return requestId;
  }

  /**
   * Generate data export (async process)
   */
  private async generateDataExport(requestId: number, userId: number): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE data_export_requests SET status = 'processing' WHERE id = $1`,
        [requestId]
      );

      // Collect all user data
      const userData = await this.collectUserData(userId);

      // In production: Upload to secure storage (S3, etc.) and generate signed URL
      const downloadUrl = `/api/gdpr/download/${requestId}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await this.pool.query(
        `UPDATE data_export_requests 
         SET status = 'completed', completed_at = NOW(), download_url = $1, expires_at = $2, metadata = $3
         WHERE id = $4`,
        [downloadUrl, expiresAt, JSON.stringify({ recordCount: Object.keys(userData).length }), requestId]
      );

      // Send email notification (in production)
      console.log(`Data export completed for request ${requestId}`);
    } catch (error) {
      console.error('Data export failed:', error);
      await this.pool.query(
        `UPDATE data_export_requests SET status = 'failed' WHERE id = $1`,
        [requestId]
      );
    }
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: number): Promise<Record<string, any>> {
    // Collect data from all tables containing user information
    const data: Record<string, any> = {};

    // User profile
    const userResult = await this.pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );
    data.profile = userResult.rows[0];

    // Consents
    data.consents = await this.getUserConsents(userId);

    // Additional data sources would be collected here
    // Examples: projects, files, settings, subscriptions, etc.

    return data;
  }

  /**
   * Request data deletion (right to erasure)
   */
  async requestDataDeletion(userId: number, userEmail: string, reason?: string): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO data_deletion_requests (user_id, status, reason)
       VALUES ($1, 'pending', $2)
       RETURNING id`,
      [userId, reason]
    );

    const requestId = result.rows[0].id;

    // Log audit event
    const auditLogger = getAuditLogger();
    await auditLogger.log(
      createAuditEvent(
        AuditEventType.COMPLIANCE_GDPR_DATA_DELETION,
        'User requested data deletion',
        {
          userId,
          userEmail,
          metadata: { requestId, reason },
        }
      )
    );

    // Schedule deletion (30-day grace period)
    const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.pool.query(
      `UPDATE data_deletion_requests SET status = 'scheduled', scheduled_at = $1 WHERE id = $2`,
      [scheduledAt, requestId]
    );

    return requestId;
  }

  /**
   * Cancel data deletion request
   */
  async cancelDataDeletion(requestId: number, userId: number): Promise<void> {
    await this.pool.query(
      `DELETE FROM data_deletion_requests 
       WHERE id = $1 AND user_id = $2 AND status = 'scheduled'`,
      [requestId, userId]
    );
  }

  /**
   * Execute scheduled data deletions
   */
  async executeScheduledDeletions(): Promise<void> {
    const result = await this.pool.query(
      `SELECT id, user_id FROM data_deletion_requests 
       WHERE status = 'scheduled' AND scheduled_at <= NOW()`
    );

    for (const request of result.rows) {
      try {
        await this.pool.query('BEGIN');

        // Update status
        await this.pool.query(
          `UPDATE data_deletion_requests SET status = 'processing' WHERE id = $1`,
          [request.id]
        );

        // Anonymize or delete user data
        await this.anonymizeUserData(request.user_id);

        // Mark as completed
        await this.pool.query(
          `UPDATE data_deletion_requests SET status = 'completed', completed_at = NOW() WHERE id = $1`,
          [request.id]
        );

        await this.pool.query('COMMIT');
      } catch (error) {
        await this.pool.query('ROLLBACK');
        console.error(`Failed to delete data for request ${request.id}:`, error);
        await this.pool.query(
          `UPDATE data_deletion_requests SET status = 'failed' WHERE id = $1`,
          [request.id]
        );
      }
    }
  }

  /**
   * Anonymize user data (GDPR compliant deletion)
   */
  private async anonymizeUserData(userId: number): Promise<void> {
    // Anonymize personally identifiable information
    await this.pool.query(
      `UPDATE users 
       SET email = $1, name = 'Deleted User', phone = NULL, address = NULL
       WHERE id = $2`,
      [`deleted-${userId}@anonymized.local`, userId]
    );

    // Delete or anonymize other personal data
    // This is a simplified example - in production, handle all data properly
  }

  /**
   * Set data retention policy
   */
  async setRetentionPolicy(
    dataType: string,
    retentionDays: number,
    purpose: DataProcessingPurpose,
    legalBasis: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO data_retention_policies (data_type, retention_period_days, purpose, legal_basis)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (data_type)
       DO UPDATE SET
         retention_period_days = EXCLUDED.retention_period_days,
         purpose = EXCLUDED.purpose,
         legal_basis = EXCLUDED.legal_basis,
         updated_at = NOW()`,
      [dataType, retentionDays, purpose, legalBasis]
    );
  }

  /**
   * Apply retention policies (delete old data)
   */
  async applyRetentionPolicies(): Promise<void> {
    const policies = await this.pool.query(
      `SELECT * FROM data_retention_policies`
    );

    for (const policy of policies.rows) {
      const cutoffDate = new Date(Date.now() - policy.retention_period_days * 24 * 60 * 60 * 1000);
      
      // Apply policy based on data type
      // This is a simplified example - in production, implement per data type
      console.log(`Applying retention policy for ${policy.data_type}: delete data before ${cutoffDate.toISOString()}`);
    }
  }
}

/**
 * Singleton instance
 */
let gdprServiceInstance: GDPRComplianceService | null = null;

export function getGDPRService(pool?: Pool): GDPRComplianceService {
  if (!gdprServiceInstance && pool) {
    gdprServiceInstance = new GDPRComplianceService(pool);
  }
  if (!gdprServiceInstance) {
    throw new Error('GDPRComplianceService not initialized');
  }
  return gdprServiceInstance;
}

export async function initializeGDPRService(pool: Pool): Promise<GDPRComplianceService> {
  const service = getGDPRService(pool);
  await service.initialize();
  return service;
}
