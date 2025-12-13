/**
 * IP Whitelisting Middleware
 * Provides IP-based access control for enterprise accounts
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

interface IPRange {
  start: string;
  end: string;
}

export interface IPWhitelistConfig {
  enabled: boolean;
  allowedIPs: string[];
  allowedRanges?: IPRange[];
  blockMessage?: string;
  logBlockedAttempts?: boolean;
}

/**
 * Parse CIDR notation to IP range
 */
function parseCIDR(cidr: string): IPRange {
  const [ip, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength, 10);
  
  // Convert IP to number
  const ipParts = ip.split('.').map(p => parseInt(p, 10));
  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  
  // Calculate range
  const mask = ~((1 << (32 - prefix)) - 1);
  const startNum = ipNum & mask;
  const endNum = startNum | ~mask;
  
  // Convert back to IP strings
  const start = [
    (startNum >>> 24) & 255,
    (startNum >>> 16) & 255,
    (startNum >>> 8) & 255,
    startNum & 255,
  ].join('.');
  
  const end = [
    (endNum >>> 24) & 255,
    (endNum >>> 16) & 255,
    (endNum >>> 8) & 255,
    endNum & 255,
  ].join('.');
  
  return { start, end };
}

/**
 * Convert IP address to number for comparison
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

/**
 * Check if IP is in range
 */
function isIPInRange(ip: string, range: IPRange): boolean {
  const ipNum = ipToNumber(ip);
  const startNum = ipToNumber(range.start);
  const endNum = ipToNumber(range.end);
  
  return ipNum >= startNum && ipNum <= endNum;
}

/**
 * Get client IP address from request
 */
export function getClientIP(req: Request): string {
  // Check X-Forwarded-For header (for proxies/load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = typeof forwardedFor === 'string' 
      ? forwardedFor.split(',').map(ip => ip.trim())
      : forwardedFor;
    return ips[0];
  }
  
  // Check X-Real-IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP;
  }
  
  // Fallback to connection remote address
  return req.ip || req.socket.remoteAddress || '';
}

/**
 * Check if IP is whitelisted
 */
export function isIPWhitelisted(ip: string, config: IPWhitelistConfig): boolean {
  if (!config.enabled) {
    return true;
  }

  // Normalize IP (remove IPv6 prefix if present)
  const normalizedIP = ip.replace(/^::ffff:/, '');

  // Check exact matches
  if (config.allowedIPs.includes(normalizedIP)) {
    return true;
  }

  // Check CIDR ranges
  for (const allowedIP of config.allowedIPs) {
    if (allowedIP.includes('/')) {
      const range = parseCIDR(allowedIP);
      if (isIPInRange(normalizedIP, range)) {
        return true;
      }
    }
  }

  // Check explicit ranges
  if (config.allowedRanges) {
    for (const range of config.allowedRanges) {
      if (isIPInRange(normalizedIP, range)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Log blocked IP attempt
 */
async function logBlockedAttempt(
  ip: string,
  path: string,
  pool?: Pool
): Promise<void> {
  if (!pool) {
    console.warn(`Blocked IP attempt from ${ip} to ${path}`);
    return;
  }

  try {
    await pool.query(
      `INSERT INTO security_ip_blocks (ip_address, path, blocked_at)
       VALUES ($1, $2, NOW())`,
      [ip, path]
    );
  } catch (error) {
    console.error('Failed to log blocked IP attempt:', error);
  }
}

/**
 * Express middleware for IP whitelisting
 */
export function ipWhitelistMiddleware(config: IPWhitelistConfig, pool?: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientIP = getClientIP(req);

    if (!isIPWhitelisted(clientIP, config)) {
      // Log the blocked attempt
      if (config.logBlockedAttempts) {
        await logBlockedAttempt(clientIP, req.path, pool);
      }

      const message = config.blockMessage || 'Access denied from this IP address';
      
      return res.status(403).json({
        error: message,
        ip: clientIP,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}

/**
 * Get IP whitelist configuration for a user/organization
 */
export async function getIPWhitelistConfig(
  organizationId: number,
  pool: Pool
): Promise<IPWhitelistConfig> {
  try {
    const result = await pool.query(
      `SELECT enabled, allowed_ips, allowed_ranges, block_message, log_blocked_attempts
       FROM ip_whitelist_config
       WHERE organization_id = $1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      return {
        enabled: false,
        allowedIPs: [],
      };
    }

    const row = result.rows[0];
    return {
      enabled: row.enabled,
      allowedIPs: row.allowed_ips || [],
      allowedRanges: row.allowed_ranges || [],
      blockMessage: row.block_message,
      logBlockedAttempts: row.log_blocked_attempts,
    };
  } catch (error) {
    console.error('Failed to get IP whitelist config:', error);
    return {
      enabled: false,
      allowedIPs: [],
    };
  }
}

/**
 * Update IP whitelist configuration
 */
export async function updateIPWhitelistConfig(
  organizationId: number,
  config: IPWhitelistConfig,
  pool: Pool
): Promise<void> {
  await pool.query(
    `INSERT INTO ip_whitelist_config 
     (organization_id, enabled, allowed_ips, allowed_ranges, block_message, log_blocked_attempts)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (organization_id) 
     DO UPDATE SET
       enabled = EXCLUDED.enabled,
       allowed_ips = EXCLUDED.allowed_ips,
       allowed_ranges = EXCLUDED.allowed_ranges,
       block_message = EXCLUDED.block_message,
       log_blocked_attempts = EXCLUDED.log_blocked_attempts,
       updated_at = NOW()`,
    [
      organizationId,
      config.enabled,
      JSON.stringify(config.allowedIPs),
      JSON.stringify(config.allowedRanges || []),
      config.blockMessage,
      config.logBlockedAttempts,
    ]
  );
}

/**
 * Middleware factory that checks organization-specific IP whitelist
 */
export function organizationIPWhitelist(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Get organization ID from request (assumes it's set by auth middleware)
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
      // No organization context, skip IP check
      return next();
    }

    // Get organization's IP whitelist config
    const config = await getIPWhitelistConfig(organizationId, pool);

    // Check if IP is whitelisted
    const clientIP = getClientIP(req);
    if (!isIPWhitelisted(clientIP, config)) {
      if (config.logBlockedAttempts) {
        await logBlockedAttempt(clientIP, req.path, pool);
      }

      return res.status(403).json({
        error: config.blockMessage || 'Access denied from this IP address',
        ip: clientIP,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}
