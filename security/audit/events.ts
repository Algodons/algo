/**
 * Security Event Definitions
 * Comprehensive event tracking for authentication, authorization, and data access
 */

export enum AuditEventType {
  // Authentication Events
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAILURE = 'auth.login.failure',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_TOKEN_REFRESH = 'auth.token.refresh',
  AUTH_PASSWORD_CHANGE = 'auth.password.change',
  AUTH_PASSWORD_RESET_REQUEST = 'auth.password.reset.request',
  AUTH_PASSWORD_RESET_COMPLETE = 'auth.password.reset.complete',
  AUTH_MFA_ENABLED = 'auth.mfa.enabled',
  AUTH_MFA_DISABLED = 'auth.mfa.disabled',
  AUTH_MFA_SUCCESS = 'auth.mfa.success',
  AUTH_MFA_FAILURE = 'auth.mfa.failure',
  AUTH_SSO_LOGIN = 'auth.sso.login',
  AUTH_SSO_FAILURE = 'auth.sso.failure',

  // Authorization Events
  AUTHZ_ACCESS_GRANTED = 'authz.access.granted',
  AUTHZ_ACCESS_DENIED = 'authz.access.denied',
  AUTHZ_ROLE_CHANGE = 'authz.role.change',
  AUTHZ_PERMISSION_CHANGE = 'authz.permission.change',

  // Data Access Events
  DATA_READ = 'data.read',
  DATA_CREATE = 'data.create',
  DATA_UPDATE = 'data.update',
  DATA_DELETE = 'data.delete',
  DATA_EXPORT = 'data.export',
  DATA_IMPORT = 'data.import',

  // User Management Events
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_SUSPEND = 'user.suspend',
  USER_UNSUSPEND = 'user.unsuspend',
  USER_IMPERSONATE_START = 'user.impersonate.start',
  USER_IMPERSONATE_END = 'user.impersonate.end',

  // Admin Events
  ADMIN_ACTION = 'admin.action',
  ADMIN_CONFIG_CHANGE = 'admin.config.change',
  ADMIN_SYSTEM_CHANGE = 'admin.system.change',

  // Security Events
  SECURITY_IP_BLOCKED = 'security.ip.blocked',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  SECURITY_ENCRYPTION_KEY_ROTATION = 'security.encryption.key_rotation',
  SECURITY_VULNERABILITY_DETECTED = 'security.vulnerability.detected',
  SECURITY_INTRUSION_DETECTED = 'security.intrusion.detected',

  // Compliance Events
  COMPLIANCE_GDPR_DATA_REQUEST = 'compliance.gdpr.data_request',
  COMPLIANCE_GDPR_DATA_DELETION = 'compliance.gdpr.data_deletion',
  COMPLIANCE_GDPR_CONSENT_GRANTED = 'compliance.gdpr.consent.granted',
  COMPLIANCE_GDPR_CONSENT_REVOKED = 'compliance.gdpr.consent.revoked',
  COMPLIANCE_AUDIT_START = 'compliance.audit.start',
  COMPLIANCE_AUDIT_COMPLETE = 'compliance.audit.complete',

  // System Events
  SYSTEM_STARTUP = 'system.startup',
  SYSTEM_SHUTDOWN = 'system.shutdown',
  SYSTEM_ERROR = 'system.error',
  SYSTEM_BACKUP_START = 'system.backup.start',
  SYSTEM_BACKUP_COMPLETE = 'system.backup.complete',
  SYSTEM_BACKUP_FAILURE = 'system.backup.failure',
  SYSTEM_RESTORE_START = 'system.restore.start',
  SYSTEM_RESTORE_COMPLETE = 'system.restore.complete',
  SYSTEM_RESTORE_FAILURE = 'system.restore.failure',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AuditEvent {
  id?: string;
  type: AuditEventType;
  severity: AuditSeverity;
  timestamp: Date;
  
  // Actor (who performed the action)
  userId?: number;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  sessionId?: string;
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  organizationId?: number;
  
  // Target (what was affected)
  targetType?: string;
  targetId?: string;
  targetName?: string;
  
  // Action details
  action: string;
  resource?: string;
  method?: string;
  path?: string;
  
  // Results
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
  
  // Additional data
  metadata?: Record<string, any>;
  changes?: {
    before?: any;
    after?: any;
  };
}

/**
 * Get event severity based on type
 */
export function getEventSeverity(type: AuditEventType): AuditSeverity {
  const criticalEvents = [
    AuditEventType.SECURITY_INTRUSION_DETECTED,
    AuditEventType.SECURITY_VULNERABILITY_DETECTED,
    AuditEventType.SYSTEM_ERROR,
  ];

  const errorEvents = [
    AuditEventType.AUTH_LOGIN_FAILURE,
    AuditEventType.AUTH_MFA_FAILURE,
    AuditEventType.AUTH_SSO_FAILURE,
    AuditEventType.AUTHZ_ACCESS_DENIED,
    AuditEventType.SYSTEM_BACKUP_FAILURE,
    AuditEventType.SYSTEM_RESTORE_FAILURE,
  ];

  const warningEvents = [
    AuditEventType.SECURITY_IP_BLOCKED,
    AuditEventType.SECURITY_RATE_LIMIT_EXCEEDED,
    AuditEventType.USER_SUSPEND,
    AuditEventType.USER_IMPERSONATE_START,
  ];

  if (criticalEvents.includes(type)) {
    return AuditSeverity.CRITICAL;
  }
  if (errorEvents.includes(type)) {
    return AuditSeverity.ERROR;
  }
  if (warningEvents.includes(type)) {
    return AuditSeverity.WARNING;
  }
  return AuditSeverity.INFO;
}

/**
 * Create an audit event
 */
export function createAuditEvent(
  type: AuditEventType,
  action: string,
  options: Partial<AuditEvent> = {}
): AuditEvent {
  return {
    type,
    severity: options.severity || getEventSeverity(type),
    timestamp: new Date(),
    action,
    success: options.success ?? true,
    ...options,
  };
}

/**
 * Event templates for common scenarios
 */
export const AuditEventTemplates = {
  login: (userId: number, email: string, success: boolean, ip: string): AuditEvent => {
    return createAuditEvent(
      success ? AuditEventType.AUTH_LOGIN_SUCCESS : AuditEventType.AUTH_LOGIN_FAILURE,
      'User login',
      {
        userId,
        userEmail: email,
        success,
        ipAddress: ip,
      }
    );
  },

  logout: (userId: number, email: string): AuditEvent => {
    return createAuditEvent(AuditEventType.AUTH_LOGOUT, 'User logout', {
      userId,
      userEmail: email,
      success: true,
    });
  },

  dataAccess: (
    userId: number,
    resource: string,
    action: 'read' | 'create' | 'update' | 'delete'
  ): AuditEvent => {
    const typeMap = {
      read: AuditEventType.DATA_READ,
      create: AuditEventType.DATA_CREATE,
      update: AuditEventType.DATA_UPDATE,
      delete: AuditEventType.DATA_DELETE,
    };

    return createAuditEvent(typeMap[action], `Data ${action}`, {
      userId,
      resource,
      success: true,
    });
  },

  accessDenied: (userId: number, resource: string, reason: string): AuditEvent => {
    return createAuditEvent(AuditEventType.AUTHZ_ACCESS_DENIED, 'Access denied', {
      userId,
      resource,
      success: false,
      errorMessage: reason,
    });
  },

  adminAction: (
    adminId: number,
    action: string,
    targetId: string,
    targetType: string
  ): AuditEvent => {
    return createAuditEvent(AuditEventType.ADMIN_ACTION, action, {
      userId: adminId,
      targetId,
      targetType,
      success: true,
    });
  },

  gdprDataRequest: (userId: number, email: string, requestType: string): AuditEvent => {
    return createAuditEvent(AuditEventType.COMPLIANCE_GDPR_DATA_REQUEST, requestType, {
      userId,
      userEmail: email,
      success: true,
      metadata: { requestType },
    });
  },
};
