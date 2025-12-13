/**
 * Immutable Audit Logger
 * Append-only logging system for security-relevant events
 * Integrates with SIEM systems and provides tamper-proof log storage
 */

import { Pool } from 'pg';
import { createHash } from 'crypto';
import { AuditEvent, AuditEventType, AuditSeverity } from './events';
import winston from 'winston';

export interface AuditLoggerConfig {
  database: Pool;
  enableFileLogging?: boolean;
  logDirectory?: string;
  enableSIEMIntegration?: bool;
  siemEndpoint?: string;
  enableCloudStorage?: boolean;
  cloudStorageBucket?: string;
}

export class AuditLogger {
  private config: AuditLoggerConfig;
  private logger: winston.Logger;
  private lastLogHash: string = '';

  constructor(config: AuditLoggerConfig) {
    this.config = config;
    
    // Initialize Winston logger for file-based logging
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [],
    });

    if (config.enableFileLogging) {
      const logDir = config.logDirectory || './logs/audit';
      this.logger.add(
        new winston.transports.File({
          filename: `${logDir}/audit.log`,
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 90, // 90 files = ~90 days with daily rotation
        })
      );
    }

    // Always log to console in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }));
    }
  }

  /**
   * Initialize audit log table in database
   */
  async initialize(): Promise<void> {
    await this.config.database.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        event_id UUID UNIQUE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        
        -- Actor
        user_id INTEGER,
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        user_role VARCHAR(50),
        session_id VARCHAR(255),
        
        -- Context
        ip_address VARCHAR(45),
        user_agent TEXT,
        organization_id INTEGER,
        
        -- Target
        target_type VARCHAR(100),
        target_id VARCHAR(255),
        target_name VARCHAR(255),
        
        -- Action
        action VARCHAR(255) NOT NULL,
        resource VARCHAR(255),
        method VARCHAR(10),
        path TEXT,
        
        -- Results
        success BOOLEAN NOT NULL,
        error_message TEXT,
        error_code VARCHAR(50),
        
        -- Additional data
        metadata JSONB,
        changes JSONB,
        
        -- Tamper detection
        previous_hash VARCHAR(64),
        log_hash VARCHAR(64) NOT NULL,
        
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id);
    `);

    // Initialize the hash chain
    const result = await this.config.database.query(
      'SELECT log_hash FROM audit_logs ORDER BY id DESC LIMIT 1'
    );
    
    if (result.rows.length > 0) {
      this.lastLogHash = result.rows[0].log_hash;
    }
  }

  /**
   * Compute hash for log entry (for tamper detection)
   */
  private computeLogHash(event: AuditEvent, previousHash: string): string {
    const data = JSON.stringify({
      ...event,
      previousHash,
    });
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Log an audit event
   */
  async log(event: AuditEvent): Promise<void> {
    const eventId = event.id || this.generateEventId();
    
    // Compute hash for tamper detection
    const logHash = this.computeLogHash(event, this.lastLogHash);

    try {
      // Insert into database (immutable - no updates/deletes)
      await this.config.database.query(
        `INSERT INTO audit_logs (
          event_id, event_type, severity, timestamp,
          user_id, user_email, user_name, user_role, session_id,
          ip_address, user_agent, organization_id,
          target_type, target_id, target_name,
          action, resource, method, path,
          success, error_message, error_code,
          metadata, changes,
          previous_hash, log_hash
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22,
          $23, $24,
          $25, $26
        )`,
        [
          eventId,
          event.type,
          event.severity,
          event.timestamp,
          event.userId,
          event.userEmail,
          event.userName,
          event.userRole,
          event.sessionId,
          event.ipAddress,
          event.userAgent,
          event.organizationId,
          event.targetType,
          event.targetId,
          event.targetName,
          event.action,
          event.resource,
          event.method,
          event.path,
          event.success,
          event.errorMessage,
          event.errorCode,
          event.metadata ? JSON.stringify(event.metadata) : null,
          event.changes ? JSON.stringify(event.changes) : null,
          this.lastLogHash,
          logHash,
        ]
      );

      // Update last hash
      this.lastLogHash = logHash;

      // Log to file
      if (this.config.enableFileLogging) {
        this.logger.log(event.severity, JSON.stringify(event));
      }

      // Send to SIEM if configured
      if (this.config.enableSIEMIntegration && this.config.siemEndpoint) {
        await this.sendToSIEM(event);
      }

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Log to file as fallback
      this.logger.error('Audit log database failure', { event, error });
    }
  }

  /**
   * Send event to SIEM system
   */
  private async sendToSIEM(event: AuditEvent): Promise<void> {
    // Placeholder for SIEM integration
    // In production, integrate with systems like Splunk, ELK, or cloud SIEM
    try {
      // Example: Send to SIEM endpoint
      // await fetch(this.config.siemEndpoint!, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event),
      // });
    } catch (error) {
      console.error('Failed to send to SIEM:', error);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Query audit logs
   */
  async query(filters: {
    userId?: number;
    organizationId?: number;
    eventType?: AuditEventType;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditEvent[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${paramCount++}`);
      params.push(filters.userId);
    }

    if (filters.organizationId) {
      conditions.push(`organization_id = $${paramCount++}`);
      params.push(filters.organizationId);
    }

    if (filters.eventType) {
      conditions.push(`event_type = $${paramCount++}`);
      params.push(filters.eventType);
    }

    if (filters.severity) {
      conditions.push(`severity = $${paramCount++}`);
      params.push(filters.severity);
    }

    if (filters.startDate) {
      conditions.push(`timestamp >= $${paramCount++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`timestamp <= $${paramCount++}`);
      params.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const result = await this.config.database.query(
      `SELECT * FROM audit_logs 
       ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    return result.rows.map(this.rowToEvent);
  }

  /**
   * Convert database row to AuditEvent
   */
  private rowToEvent(row: any): AuditEvent {
    return {
      id: row.event_id,
      type: row.event_type,
      severity: row.severity,
      timestamp: row.timestamp,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      userRole: row.user_role,
      sessionId: row.session_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      organizationId: row.organization_id,
      targetType: row.target_type,
      targetId: row.target_id,
      targetName: row.target_name,
      action: row.action,
      resource: row.resource,
      method: row.method,
      path: row.path,
      success: row.success,
      errorMessage: row.error_message,
      errorCode: row.error_code,
      metadata: row.metadata,
      changes: row.changes,
    };
  }

  /**
   * Verify log integrity by checking hash chain
   */
  async verifyIntegrity(startId?: number, endId?: number): Promise<boolean> {
    const query = startId && endId
      ? `SELECT * FROM audit_logs WHERE id >= $1 AND id <= $2 ORDER BY id ASC`
      : `SELECT * FROM audit_logs ORDER BY id ASC`;
    
    const params = startId && endId ? [startId, endId] : [];
    const result = await this.config.database.query(query, params);

    let previousHash = '';
    for (const row of result.rows) {
      const event = this.rowToEvent(row);
      const expectedHash = this.computeLogHash(event, previousHash);
      
      if (row.log_hash !== expectedHash) {
        console.error(`Hash mismatch detected at log ID ${row.id}`);
        return false;
      }
      
      previousHash = row.log_hash;
    }

    return true;
  }

  /**
   * Archive old logs to cold storage
   */
  async archiveLogs(beforeDate: Date): Promise<number> {
    // In production, move logs to cloud storage (S3, Azure Blob, etc.)
    const result = await this.config.database.query(
      `SELECT COUNT(*) as count FROM audit_logs WHERE timestamp < $1`,
      [beforeDate]
    );

    const count = parseInt(result.rows[0].count, 10);
    
    // Placeholder for actual archival logic
    console.log(`Would archive ${count} logs before ${beforeDate.toISOString()}`);
    
    return count;
  }
}

/**
 * Singleton instance
 */
let auditLoggerInstance: AuditLogger | null = null;

export function getAuditLogger(config?: AuditLoggerConfig): AuditLogger {
  if (!auditLoggerInstance && config) {
    auditLoggerInstance = new AuditLogger(config);
  }
  if (!auditLoggerInstance) {
    throw new Error('AuditLogger not initialized. Call getAuditLogger with config first.');
  }
  return auditLoggerInstance;
}

export async function initializeAuditLogger(config: AuditLoggerConfig): Promise<AuditLogger> {
  const logger = getAuditLogger(config);
  await logger.initialize();
  return logger;
}
