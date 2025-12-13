# Security Module

Enterprise-grade security features for the Algo Cloud IDE platform.

## Overview

This module provides:

- **Encryption & Key Management** - AES-256-GCM encryption with secure key management
- **Authentication & Access Control** - SAML 2.0 SSO and IP whitelisting
- **Audit Logging** - Immutable, tamper-proof audit logs
- **Compliance** - GDPR and SOC 2 Type II compliance tools

## Directory Structure

```
security/
├── encryption/          # Encryption and key management
│   ├── kms.ts          # Key Management System
│   └── encryption.ts   # Encryption utilities
├── auth/               # Authentication and access control
│   ├── saml.ts        # SAML 2.0 implementation
│   └── ip-whitelist.ts # IP whitelisting middleware
├── audit/              # Audit logging
│   ├── logger.ts      # Immutable audit logger
│   └── events.ts      # Event definitions
└── compliance/         # Compliance tools
    ├── gdpr.ts        # GDPR utilities
    └── soc2.ts        # SOC 2 controls
```

## Quick Start

### 1. Initialize Security Features

```typescript
import { initializeKMS } from './encryption/kms';
import { initializeAuditLogger } from './audit/logger';
import { initializeGDPRService } from './compliance/gdpr';
import { initializeSOC2Service } from './compliance/soc2';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Initialize KMS
const kms = await initializeKMS({
  provider: 'local',
  keyStorePath: '/etc/algo/.keys',
});

// Initialize Audit Logger
const auditLogger = await initializeAuditLogger({
  database: pool,
  enableFileLogging: true,
  logDirectory: '/var/log/algo/audit',
});

// Initialize GDPR Service
const gdprService = await initializeGDPRService(pool);

// Initialize SOC 2 Service
const soc2Service = await initializeSOC2Service(pool);
```

### 2. Encrypt Sensitive Data

```typescript
import { encrypt, decrypt } from './encryption/encryption';

// Encrypt data
const encrypted = await encrypt('sensitive data');
console.log(encrypted);
// {
//   encrypted: 'base64...',
//   iv: 'base64...',
//   authTag: 'base64...',
//   keyId: 'uuid',
//   algorithm: 'aes-256-gcm'
// }

// Decrypt data
const decrypted = await decrypt(encrypted);
console.log(decrypted.toString()); // 'sensitive data'
```

### 3. Configure SAML SSO

```typescript
import { samlAuth, createOktaConfig } from './auth/saml';
import express from 'express';

const app = express();

// Configure Okta
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

### 4. Enable IP Whitelisting

```typescript
import { ipWhitelistMiddleware } from './auth/ip-whitelist';

const ipWhitelist = ipWhitelistMiddleware({
  enabled: true,
  allowedIPs: [
    '192.168.1.0/24',  // CIDR notation
    '10.0.0.1',        // Single IP
  ],
  logBlockedAttempts: true,
}, pool);

// Apply to routes
app.use('/api/admin', ipWhitelist);
```

### 5. Log Security Events

```typescript
import { AuditEventType, createAuditEvent } from './audit/events';

// Log login event
await auditLogger.log(
  createAuditEvent(
    AuditEventType.AUTH_LOGIN_SUCCESS,
    'User login',
    {
      userId: user.id,
      userEmail: user.email,
      ipAddress: req.ip,
      success: true,
    }
  )
);

// Query logs
const logs = await auditLogger.query({
  userId: 123,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});

// Verify integrity
const isValid = await auditLogger.verifyIntegrity();
if (!isValid) {
  console.error('Audit log tampering detected!');
}
```

### 6. Handle GDPR Requests

```typescript
import { ConsentType } from './compliance/gdpr';

// Record consent
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
  ConsentType.MARKETING
);

// Export user data (right to data portability)
const requestId = await gdprService.requestDataExport(user.id, user.email);

// Delete user data (right to erasure)
const deletionId = await gdprService.requestDataDeletion(
  user.id,
  user.email,
  'User requested account deletion'
);
```

### 7. Run Compliance Checks

```typescript
// Get SOC 2 controls
const controls = soc2Service.getControls();

// Run automated checks
const results = await soc2Service.runAutomatedChecks();

// Generate report
const report = await soc2Service.generateComplianceReport(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

console.log(`Compliance rate: ${report.summary.complianceRate}%`);
```

## Configuration

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=algo
DB_USER=algo
DB_PASSWORD=secure_password

# Encryption
ENCRYPTION_ENABLED=true
KMS_PROVIDER=local
KMS_KEY_STORE_PATH=/etc/algo/.keys

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=7d

# SAML (Okta)
OKTA_DOMAIN=your-domain.okta.com
OKTA_APP_ID=your-app-id
OKTA_CERT="-----BEGIN CERTIFICATE-----..."

# SAML (Azure AD)
AZURE_TENANT_ID=your-tenant-id
AZURE_AD_CERT="-----BEGIN CERTIFICATE-----..."

# Audit Logging
AUDIT_LOG_DIR=/var/log/algo/audit
AUDIT_LOG_RETENTION_DAYS=365
ENABLE_SIEM_INTEGRATION=false
SIEM_ENDPOINT=https://siem.example.com/api

# GDPR
GDPR_DATA_RETENTION_DAYS=365
GDPR_DELETION_GRACE_PERIOD_DAYS=30
```

### Security Policies

See `/config/security-policies.yaml` for detailed configuration options.

## API Reference

### Encryption

#### `encrypt(data: string | Buffer): Promise<EncryptedData>`

Encrypts data using AES-256-GCM.

#### `decrypt(encryptedData: EncryptedData): Promise<Buffer>`

Decrypts data.

#### `encryptJSON(data: any): Promise<EncryptedData>`

Encrypts a JSON object.

#### `decryptJSON(encryptedData: EncryptedData): Promise<any>`

Decrypts to JSON object.

#### `hash(data: string | Buffer): string`

Creates SHA-256 hash.

#### `generateToken(length?: number): string`

Generates secure random token.

### SAML Authentication

#### `samlAuth(config: SAMLConfig)`

Creates SAML authentication middleware.

#### `createOktaConfig(options): SAMLConfig`

Creates Okta SAML configuration.

#### `createAzureADConfig(options): SAMLConfig`

Creates Azure AD SAML configuration.

### IP Whitelisting

#### `ipWhitelistMiddleware(config: IPWhitelistConfig, pool?: Pool)`

Creates IP whitelisting middleware.

#### `getIPWhitelistConfig(organizationId: number, pool: Pool): Promise<IPWhitelistConfig>`

Gets IP whitelist configuration for an organization.

#### `updateIPWhitelistConfig(organizationId: number, config: IPWhitelistConfig, pool: Pool): Promise<void>`

Updates IP whitelist configuration.

### Audit Logging

#### `auditLogger.log(event: AuditEvent): Promise<void>`

Logs an audit event.

#### `auditLogger.query(filters): Promise<AuditEvent[]>`

Queries audit logs.

#### `auditLogger.verifyIntegrity(): Promise<boolean>`

Verifies log integrity using hash chain.

#### `auditLogger.archiveLogs(beforeDate: Date): Promise<number>`

Archives old logs.

### GDPR Compliance

#### `gdprService.recordConsent(consent: ConsentRecord): Promise<void>`

Records user consent.

#### `gdprService.hasConsent(userId: number, consentType: ConsentType): Promise<boolean>`

Checks if user has granted consent.

#### `gdprService.requestDataExport(userId: number, email: string): Promise<number>`

Requests data export (right to data portability).

#### `gdprService.requestDataDeletion(userId: number, email: string, reason?: string): Promise<number>`

Requests data deletion (right to erasure).

#### `gdprService.setRetentionPolicy(dataType: string, retentionDays: number, purpose: DataProcessingPurpose, legalBasis: string): Promise<void>`

Sets data retention policy.

### SOC 2 Compliance

#### `soc2Service.getControls(criteria?: TrustServiceCriteria): SecurityControl[]`

Gets security controls.

#### `soc2Service.runAutomatedChecks(): Promise<Map<string, ComplianceCheck>>`

Runs automated compliance checks.

#### `soc2Service.generateComplianceReport(startDate: Date, endDate: Date)`

Generates compliance report.

#### `soc2Service.storeControlEvidence(controlId: string, evidenceType: string, description: string, filePath?: string): Promise<void>`

Stores control evidence.

## Event Types

### Authentication Events

- `AUTH_LOGIN_SUCCESS` - Successful login
- `AUTH_LOGIN_FAILURE` - Failed login attempt
- `AUTH_LOGOUT` - User logout
- `AUTH_MFA_ENABLED` - MFA enabled
- `AUTH_SSO_LOGIN` - SSO login

### Authorization Events

- `AUTHZ_ACCESS_GRANTED` - Access granted
- `AUTHZ_ACCESS_DENIED` - Access denied
- `AUTHZ_ROLE_CHANGE` - User role changed

### Data Access Events

- `DATA_READ` - Data read
- `DATA_CREATE` - Data created
- `DATA_UPDATE` - Data updated
- `DATA_DELETE` - Data deleted
- `DATA_EXPORT` - Data exported

### Security Events

- `SECURITY_IP_BLOCKED` - IP address blocked
- `SECURITY_RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `SECURITY_VULNERABILITY_DETECTED` - Vulnerability detected

### Compliance Events

- `COMPLIANCE_GDPR_DATA_REQUEST` - GDPR data request
- `COMPLIANCE_GDPR_DATA_DELETION` - GDPR data deletion
- `COMPLIANCE_GDPR_CONSENT_GRANTED` - Consent granted
- `COMPLIANCE_GDPR_CONSENT_REVOKED` - Consent revoked

## Best Practices

### Encryption

1. **Rotate keys regularly** - Default: every 90 days
2. **Use KMS for key management** - Don't store keys in code
3. **Encrypt sensitive data at rest** - Use AES-256-GCM
4. **Use TLS 1.3 for data in transit**
5. **Backup encryption keys** - Store in secure location

### Authentication

1. **Use SAML 2.0 for enterprise SSO**
2. **Enable MFA for admin accounts**
3. **Enforce strong password policies**
4. **Implement session timeouts**
5. **Log all authentication events**

### Audit Logging

1. **Log all security-relevant events**
2. **Never delete audit logs** - Archive instead
3. **Verify log integrity regularly**
4. **Protect logs from tampering** - Use hash chain
5. **Integrate with SIEM** - For real-time monitoring

### Compliance

1. **Obtain explicit consent** - For non-essential processing
2. **Respect data subject rights** - Implement all GDPR rights
3. **Document data processing** - Keep records of activities
4. **Implement retention policies** - Delete old data
5. **Run compliance checks** - Automated and manual

## Testing

Run security tests:

```bash
# Unit tests
npm test security/

# Integration tests
npm test tests/integration/security/

# End-to-end tests
npm test tests/e2e/security/
```

## Troubleshooting

### KMS initialization fails

```bash
# Check key store directory
ls -la /etc/algo/.keys

# Create directory if missing
sudo mkdir -p /etc/algo/.keys
sudo chmod 700 /etc/algo/.keys
```

### Audit logs not being written

```bash
# Check database connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Check table exists
\dt audit_logs

# Check permissions
\dp audit_logs
```

### SAML authentication fails

```bash
# Verify certificate
echo $OKTA_CERT | base64 -d | openssl x509 -text -noout

# Check metadata endpoint
curl https://your-app.com/auth/saml/metadata

# Review SAML response
# Enable debug mode in saml.ts
```

## Contributing

When adding new security features:

1. Add TypeScript implementation
2. Add database schema if needed
3. Add unit tests
4. Add integration tests
5. Update documentation
6. Add to compliance mapping

## Security

If you discover a security vulnerability, please email security@example.com with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

**Do not open public issues for security vulnerabilities.**

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.example.com/security
- Issues: https://github.com/Algodons/algo/issues
- Email: security@example.com
