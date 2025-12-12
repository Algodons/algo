# Security

This document outlines the security measures implemented in the Cloud IDE platform.

## Security Fixes Applied

### 1. Command Injection Prevention (package-api.ts)

**Vulnerability**: User input was directly interpolated into shell commands, allowing arbitrary command execution.

**Fix**: 
- Replaced `execAsync` with `spawn` for command execution (no shell interpretation)
- Added package name validation using regex: `/^[@a-zA-Z0-9_.\-\/]+$/`
- Commands are now executed with explicit argument arrays

**Example**:
```typescript
// Before (vulnerable)
await execAsync(`npm install ${packageList}`, { cwd: workspacePath });

// After (secure)
await executeCommand('npm', ['install', ...packageList], workspacePath);
```

### 2. SQL Injection Prevention (database-api.ts)

**Vulnerability**: SQL queries were executed directly without parameterization, allowing arbitrary SQL execution.

**Fix**:
- Added support for parameterized queries
- Queries now accept a `params` array for safe parameter binding
- Both PostgreSQL and MySQL queries use prepared statements

**Example**:
```typescript
// Before (vulnerable)
const result = await conn.client.query(query);

// After (secure)
const safeParams = Array.isArray(params) ? params : [];
const result = await conn.client.query(query, safeParams);
```

**Usage**:
```javascript
// Client sends
{
  "query": "SELECT * FROM users WHERE id = $1",
  "params": [userId]
}
```

### 3. Path Traversal Prevention (preview-server.ts)

**Vulnerability**: File paths from user input were used directly, allowing access to files outside workspace directories.

**Fix**:
- Added workspace ID validation (alphanumeric, hyphens, underscores only)
- Implemented `validateFilePath()` function that:
  - Resolves absolute paths
  - Checks if resolved path is within workspace boundary
  - Returns null for invalid paths
- All file operations validate paths before execution

**Example**:
```typescript
// Validation logic
function validateFilePath(workspaceId: string, filePath: string): string | null {
  const workspacePath = path.resolve(WORKSPACE_DIR, workspaceId);
  const fullPath = path.resolve(workspacePath, filePath);
  
  // Ensure path is within workspace
  if (!fullPath.startsWith(workspacePath + path.sep)) {
    return null;
  }
  return fullPath;
}
```

### 4. Dynamic WebSocket URLs (Terminal.tsx, Editor.tsx)

**Issue**: Hardcoded WebSocket URLs (`ws://localhost:5000`) would fail in production.

**Fix**:
- WebSocket URLs are now dynamically constructed based on `window.location`
- Automatically uses `wss://` for HTTPS and `ws://` for HTTP
- Properly handles different ports and hostnames

**Example**:
```typescript
// Dynamic URL construction
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsHost = window.location.hostname;
const wsPort = window.location.port ? `:${window.location.port}` : '';
const wsUrl = `${wsProtocol}//${wsHost}${wsPort}/terminal`;
```

## Remaining Security Considerations

### Authentication & Authorization

⚠️ **Not Implemented** - The API currently has no authentication. For production:

1. **Add Authentication**
   - Implement JWT-based authentication
   - OAuth2 integration for third-party logins
   - Session management

2. **Add Authorization**
   - Role-based access control (RBAC)
   - Workspace ownership and permissions
   - API rate limiting

3. **Secure Database Credentials**
   - Don't accept database credentials from clients
   - Use server-side configuration
   - Implement credential vault (HashiCorp Vault, AWS Secrets Manager)

### Additional Recommendations

1. **HTTPS/WSS Only in Production**
   - Force HTTPS redirects
   - Use WSS for all WebSocket connections
   - Implement HSTS headers

2. **Input Validation**
   - Validate all user inputs
   - Sanitize file names and paths
   - Limit request sizes

3. **Rate Limiting**
   - Implement API rate limiting
   - Prevent brute force attacks
   - Throttle expensive operations

4. **Audit Logging**
   - Log all API access
   - Track file modifications
   - Monitor suspicious activities

5. **Security Headers**
   ```javascript
   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         scriptSrc: ["'self'", "'unsafe-inline'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
         imgSrc: ["'self'", "data:", "https:"],
       }
     }
   }));
   ```

6. **Regular Security Updates**
   - Keep dependencies updated
   - Run `npm audit` regularly
   - Subscribe to security advisories

## Security Testing

### Manual Testing

Test these scenarios to verify security:

1. **Command Injection**
   ```bash
   # Try to install malicious package
   POST /api/package/npm/install
   { "packages": "; rm -rf /" }
   # Should reject with validation error
   ```

2. **SQL Injection**
   ```bash
   # Try SQL injection
   POST /api/db/postgres/query
   { "query": "SELECT * FROM users WHERE id = '1' OR '1'='1'" }
   # Use parameterized queries instead
   ```

3. **Path Traversal**
   ```bash
   # Try to access files outside workspace
   GET /api/preview/workspace-1/../../../etc/passwd
   # Should reject with validation error
   ```

### Automated Security Scanning

1. **Dependency Scanning**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Static Analysis**
   - Use ESLint with security plugins
   - Run SonarQube or similar tools

3. **Dynamic Testing**
   - OWASP ZAP for penetration testing
   - Burp Suite for API testing

## Reporting Security Issues

If you discover a security vulnerability, please email [security@example.com] instead of opening a public issue.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

We will respond within 48 hours and work on a fix as soon as possible.

## Security Checklist for Production

- [ ] Enable HTTPS/WSS only
- [ ] Implement authentication (JWT/OAuth2)
- [ ] Add authorization and RBAC
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set security headers (Helmet.js)
- [ ] Implement audit logging
- [ ] Use environment variables for secrets
- [ ] Enable database encryption at rest
- [ ] Set up intrusion detection
- [ ] Configure firewall rules
- [ ] Regular security audits
- [ ] Dependency updates and scanning
- [ ] Backup and disaster recovery plan
- [ ] Security training for team

## Compliance

Consider compliance requirements for your use case:
- **GDPR**: Data protection and privacy
- **SOC 2**: Security controls and practices
- **HIPAA**: Healthcare data protection (if applicable)
- **PCI DSS**: Payment card data (if applicable)

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)
