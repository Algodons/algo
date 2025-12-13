# Enterprise Security Features

This document provides comprehensive documentation for the enterprise-grade security features implemented in the Algo Cloud IDE platform.

## Table of Contents

1. [Overview](#overview)
2. [Encryption & Key Management](#encryption--key-management)
3. [Authentication & Access Control](#authentication--access-control)
4. [Audit Logging](#audit-logging)
5. [Compliance](#compliance)
6. [Security Scanning](#security-scanning)
7. [Configuration](#configuration)
8. [API Reference](#api-reference)

## Overview

The platform implements comprehensive security features including:

- **End-to-end encryption** for data at rest and in transit
- **SAML 2.0 SSO** with Okta and Azure AD support
- **IP whitelisting** for enterprise accounts
- **Immutable audit logging** for compliance
- **GDPR compliance** tools and utilities
- **SOC 2 Type II readiness** controls
- **Automated vulnerability scanning** in CI/CD
- **DDoS protection** via Cloudflare

## Encryption & Key Management

### AES-256 Encryption

All sensitive data is encrypted using AES-256-GCM encryption.

```typescript
import { encrypt, decrypt } from './security/encryption/encryption';

// Encrypt data
const encrypted = await encrypt('sensitive data');

// Decrypt data
const decrypted = await decrypt(encrypted);
```

### Key Management System (KMS)

The KMS provides secure key storage and management:

```typescript
import { initializeKMS } from './security/encryption/kms';

// Initialize KMS
const kms = await initializeKMS({
  provider: 'local', // or 'aws', 'vault'
  keyStorePath: '/etc/algo/.keys',
});

// Generate data encryption key
const { plaintext, encrypted, keyId } = await kms.generateDataKey();
```

### Environment Variables

Required environment variables for encryption:

```bash
# Encryption settings
ENCRYPTION_ENABLED=true
ENCRYPTION_KEY_FILE=/etc/algo/backup.key

# KMS provider (local, aws, vault)
KMS_PROVIDER=local
KMS_KEY_STORE_PATH=/etc/algo/.keys

# AWS KMS (if using AWS)
AWS_REGION=us-east-1
AWS_KMS_KEY_ID=your-kms-key-id

# HashiCorp Vault (if using Vault)
VAULT_ADDR=https://vault.example.com
VAULT_TOKEN=your-vault-token
```

## Authentication & Access Control

### SAML 2.0 Single Sign-On

#### Okta Integration

```typescript
import { samlAuth, createOktaConfig } from './security/auth/saml';

const oktaConfig = createOktaConfig({
  oktaDomain: 'your-domain.okta.com',
  appId: 'your-app-id',
  issuer: 'https://your-app.com',
  callbackUrl: 'https://your-app.com/auth/saml/callback',
  cert: process.env.OKTA_CERT,
});

const samlMiddleware = samlAuth(oktaConfig);

// Routes
app.get('/auth/saml/login', samlMiddleware.login);
app.post('/auth/saml/callback', samlMiddleware.callback);
app.get('/auth/saml/metadata', samlMiddleware.metadata);
```

#### Azure AD Integration

```typescript
import { createAzureADConfig } from './security/auth/saml';

const azureConfig = createAzureADConfig({
  tenantId: 'your-tenant-id',
  issuer: 'https://your-app.com',
  callbackUrl: 'https://your-app.com/auth/saml/callback',
  cert: process.env.AZURE_AD_CERT,
});
```

### IP Whitelisting

Enable IP-based access control for enterprise accounts:

```typescript
import { ipWhitelistMiddleware } from './security/auth/ip-whitelist';

const ipWhitelist = ipWhitelistMiddleware({
  enabled: true,
  allowedIPs: [
    '192.168.1.0/24',  // CIDR notation
    '10.0.0.1',        // Single IP
  ],
  logBlockedAttempts: true,
}, pool);

app.use('/api/admin', ipWhitelist);
```

### Database Schema

IP whitelist configuration is stored in the database:

```sql
CREATE TABLE ip_whitelist_config (
  organization_id INTEGER PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  allowed_ips JSONB,
  allowed_ranges JSONB,
  block_message TEXT,
  log_blocked_attempts BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE security_ip_blocks (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  path TEXT NOT NULL,
  blocked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ip_blocks_ip ON security_ip_blocks(ip_address);
CREATE INDEX idx_ip_blocks_time ON security_ip_blocks(blocked_at DESC);
```

## Audit Logging

### Immutable Audit Logger

The audit logger provides tamper-proof logging for security events:

```typescript
import { initializeAuditLogger } from './security/audit/logger';
import { AuditEventType, createAuditEvent } from './security/audit/events';

// Initialize
const auditLogger = await initializeAuditLogger({
  database: pool,
  enableFileLogging: true,
  logDirectory: '/var/log/algo/audit',
  enableSIEMIntegration: false,
});

// Log events
await auditLogger.log(
  createAuditEvent(
    AuditEventType.AUTH_LOGIN_SUCCESS,
    'User login',
    {
      userId: user.id,
      userEmail: user.email,
      ipAddress: req.ip,
    }
  )
);
```

### Event Types

Available audit event types:

- **Authentication**: LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, MFA, SSO
- **Authorization**: ACCESS_GRANTED, ACCESS_DENIED, ROLE_CHANGE
- **Data Access**: READ, CREATE, UPDATE, DELETE, EXPORT, IMPORT
- **Admin Actions**: USER_MANAGEMENT, CONFIG_CHANGE, SYSTEM_CHANGE
- **Security**: IP_BLOCKED, RATE_LIMIT_EXCEEDED, VULNERABILITY_DETECTED
- **Compliance**: GDPR_DATA_REQUEST, GDPR_DATA_DELETION, CONSENT_MANAGEMENT
- **System**: STARTUP, SHUTDOWN, BACKUP, RESTORE

### Query Audit Logs

```typescript
const logs = await auditLogger.query({
  userId: 123,
  eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  limit: 100,
});
```

### Verify Log Integrity

```typescript
const isValid = await auditLogger.verifyIntegrity();
if (!isValid) {
  console.error('Audit log tampering detected!');
}
```

## Compliance

### GDPR Compliance

#### Consent Management

```typescript
import { initializeGDPRService, ConsentType } from './security/compliance/gdpr';

const gdprService = await initializeGDPRService(pool);

// Record user consent
await gdprService.recordConsent({
  userId: user.id,
  consentType: ConsentType.MARKETING,
  granted: true,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

// Check consent
const hasConsent = await gdprService.hasConsent(
  user.id,
  ConsentType.ANALYTICS
);
```

#### Right to Data Portability

```typescript
// Request data export
const requestId = await gdprService.requestDataExport(
  user.id,
  user.email
);

// Data will be available at /api/gdpr/download/{requestId}
```

#### Right to Erasure

```typescript
// Request data deletion (30-day grace period)
const requestId = await gdprService.requestDataDeletion(
  user.id,
  user.email,
  'User requested account deletion'
);

// Cancel deletion (before grace period expires)
await gdprService.cancelDataDeletion(requestId, user.id);
```

#### Data Retention Policies

```typescript
// Set retention policy
await gdprService.setRetentionPolicy(
  'user_data',
  365,  // days
  DataProcessingPurpose.SERVICE_DELIVERY,
  'Contractual necessity'
);

// Apply retention policies (delete old data)
await gdprService.applyRetentionPolicies();
```

### SOC 2 Type II Compliance

#### Security Controls

```typescript
import { initializeSOC2Service } from './security/compliance/soc2';

const soc2Service = await initializeSOC2Service(pool);

// Get all controls
const controls = soc2Service.getControls();

// Run automated checks
const results = await soc2Service.runAutomatedChecks();

// Generate compliance report
const report = await soc2Service.generateComplianceReport(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

#### Control Categories

- **CC6.1**: Access Control
- **CC6.2**: Authentication
- **CC6.3**: Authorization
- **CC6.6**: Encryption
- **CC7.2**: Security Incident Detection
- **CC7.3**: Security Incident Response
- **CC8.1**: Change Management
- **A1.2**: Availability Monitoring
- **PI1.4**: Data Integrity
- **C1.1**: Confidentiality
- **P3.2**: Data Retention
- **P4.3**: Data Disposal

## Security Scanning

### Automated Vulnerability Scanning

The platform includes multiple security scanning workflows:

1. **Snyk** - Dependency and container vulnerability scanning
2. **Trivy** - Container image and config scanning
3. **Semgrep** - Static code analysis
4. **OSV Scanner** - Open source vulnerability scanning
5. **Hadolint** - Dockerfile best practices
6. **TruffleHog** - Secret detection

### CI/CD Integration

Security scans run automatically on:
- Every push to main/develop branches
- Every pull request
- Daily scheduled scans
- Manual workflow dispatch

### Viewing Results

Security findings are available in:
- GitHub Security tab
- SARIF files uploaded to Code Scanning
- Workflow run logs
- Security dashboard (if configured)

## Configuration

### Security Policies

All security policies are centralized in `/config/security-policies.yaml`:

```yaml
security:
  authentication:
    password:
      min_length: 12
      require_uppercase: true
      max_age_days: 90
    mfa:
      enabled: true
      required_for_admin: true
  
  encryption:
    at_rest:
      algorithm: "AES-256-GCM"
      key_rotation_days: 90
  
  rate_limiting:
    enabled: true
    global:
      max_requests: 100
      window_ms: 60000
```

### DDoS Protection

Cloudflare configuration in `/config/cloudflare.yaml`:

```yaml
cloudflare:
  ddos_protection:
    enabled: true
    security_level: "high"
  
  rate_limiting:
    enabled: true
    rules:
      - threshold: 100
        period: 60
        action: "challenge"
```

## API Reference

### Encryption API

```typescript
// Encrypt data
const encrypted = await encrypt(data, { algorithm: 'aes-256-gcm' });

// Decrypt data
const decrypted = await decrypt(encryptedData);

// Encrypt JSON
const encrypted = await encryptJSON({ key: 'value' });

// Encrypt file
await encryptFile('/path/to/file', '/path/to/encrypted');

// Generate secure token
const token = generateToken(32);

// Hash data
const hash = hash('data');
```

### SAML API

```typescript
// Generate auth request
const { url, requestId } = saml.generateAuthRequest();

// Validate response
const profile = await saml.validateResponse(samlResponse);

// Generate metadata
const metadata = saml.generateMetadata();
```

### Audit Logging API

```typescript
// Log event
await auditLogger.log(event);

// Query logs
const logs = await auditLogger.query(filters);

// Verify integrity
const isValid = await auditLogger.verifyIntegrity();

// Archive old logs
const count = await auditLogger.archiveLogs(beforeDate);
```

### GDPR API

```typescript
// Record consent
await gdprService.recordConsent(consentRecord);

// Get user consents
const consents = await gdprService.getUserConsents(userId);

// Request data export
const requestId = await gdprService.requestDataExport(userId, email);

// Request data deletion
const requestId = await gdprService.requestDataDeletion(userId, email);
```

### SOC 2 API

```typescript
// Get controls
const controls = soc2Service.getControls();

// Run automated checks
const results = await soc2Service.runAutomatedChecks();

// Generate report
const report = await soc2Service.generateComplianceReport(startDate, endDate);

// Store evidence
await soc2Service.storeControlEvidence(controlId, type, description);
```

## Security Best Practices

1. **Always use HTTPS** - Never transmit sensitive data over HTTP
2. **Rotate keys regularly** - Follow the configured rotation schedule
3. **Monitor audit logs** - Review security events regularly
4. **Keep dependencies updated** - Run security scans frequently
5. **Use strong passwords** - Enforce password policies
6. **Enable MFA** - Require multi-factor authentication for admin accounts
7. **Limit access** - Use principle of least privilege
8. **Backup regularly** - Follow the backup schedule
9. **Test disaster recovery** - Regularly test restore procedures
10. **Stay compliant** - Keep GDPR and SOC 2 documentation up to date

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

**Do not open public issues for security vulnerabilities.**

We will respond within 48 hours and work on a fix as quickly as possible.

## Support

For questions about security features:
- Email: security@example.com
- Slack: #security-team
- Documentation: https://docs.example.com/security

## Changelog

### v2.0.0 (2024-12-13)
- Added enterprise security features
- Implemented SAML 2.0 SSO
- Added GDPR compliance tools
- Implemented SOC 2 controls
- Added automated security scanning
- Implemented backup and disaster recovery

### v1.0.0 (2024-01-01)
- Initial security implementation
- Basic authentication
- SQL injection prevention
- Command injection prevention
- Path traversal prevention
