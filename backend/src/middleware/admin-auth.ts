import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

// Extend Express Request type to include user and admin properties
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        name: string;
      };
      adminUser?: {
        id: number;
        email: string;
        role: string;
        canImpersonate: boolean;
      };
      impersonating?: {
        adminId: number;
        targetUserId: number;
        sessionToken: string;
      };
    }
  }
}

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Middleware to require super admin role
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }

  next();
};

/**
 * Middleware to check IP whitelist for admin access
 */
export const checkAdminIpWhitelist = (allowedIps: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedIps || allowedIps.length === 0) {
      return next(); // No IP restrictions
    }

    const clientIp = req.ip || req.socket.remoteAddress || '';
    
    // Check if IP is in whitelist
    const isAllowed = allowedIps.some(allowedIp => {
      if (allowedIp.includes('/')) {
        // CIDR notation support would go here
        return false; // Simplified for now
      }
      return clientIp === allowedIp;
    });

    if (!isAllowed) {
      return res.status(403).json({ 
        error: 'Access denied from this IP address',
        ip: clientIp 
      });
    }

    next();
  };
};

/**
 * Middleware to log admin actions
 */
export const logAdminAction = (pool: Pool) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data: any) {
      // Log the action after response
      setImmediate(async () => {
        try {
          const userId = req.user?.id || null;
          const action = `${req.method} ${req.path}`;
          const resourceType = req.path.split('/')[3] || 'unknown'; // Extract from /api/admin/[resource]
          const details = {
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.body,
            statusCode: res.statusCode,
            impersonating: req.impersonating || null,
          };

          await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, user_agent, status, admin_action)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              userId,
              action,
              resourceType,
              JSON.stringify(details),
              req.ip || req.socket.remoteAddress,
              req.headers['user-agent'],
              res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure',
              true,
            ]
          );
        } catch (error) {
          console.error('Failed to log admin action:', error);
        }
      });

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to validate 2FA for sensitive operations
 */
export const require2FA = (pool: Pool) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has 2FA enabled
    try {
      const result = await pool.query(
        'SELECT is_enabled FROM two_factor_auth WHERE user_id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0 || !result.rows[0].is_enabled) {
        return res.status(403).json({ 
          error: '2FA required for this operation',
          message: 'Please enable two-factor authentication to perform this action'
        });
      }

      // Verify 2FA token from request header
      const tfaToken = req.headers['x-2fa-token'];
      if (!tfaToken) {
        return res.status(403).json({ 
          error: '2FA token required',
          message: 'Please provide a valid 2FA token'
        });
      }

      // TODO: Verify the 2FA token against the user's secret
      // This would require a TOTP library like speakeasy
      // For now, we'll just check that a token was provided

      next();
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return res.status(500).json({ error: 'Failed to verify 2FA status' });
    }
  };
};

/**
 * Middleware to handle impersonation mode
 */
export const handleImpersonation = (pool: Pool) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const impersonationToken = req.headers['x-impersonation-token'];

    if (!impersonationToken) {
      return next(); // No impersonation
    }

    try {
      // Verify impersonation session
      const result = await pool.query(
        `SELECT admin_user_id, target_user_id, ended_at 
         FROM admin_impersonations 
         WHERE session_token = $1`,
        [impersonationToken]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Invalid impersonation token' });
      }

      const session = result.rows[0];

      if (session.ended_at) {
        return res.status(403).json({ error: 'Impersonation session has ended' });
      }

      // Set impersonation context
      req.impersonating = {
        adminId: session.admin_user_id,
        targetUserId: session.target_user_id,
        sessionToken: impersonationToken as string,
      };

      // Load target user info
      const userResult = await pool.query(
        'SELECT id, email, role, name FROM users WHERE id = $1',
        [session.target_user_id]
      );

      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
      }

      // Update actions performed count
      await pool.query(
        'UPDATE admin_impersonations SET actions_performed = actions_performed + 1 WHERE session_token = $1',
        [impersonationToken]
      );

      next();
    } catch (error) {
      console.error('Error handling impersonation:', error);
      return res.status(500).json({ error: 'Failed to verify impersonation session' });
    }
  };
};

/**
 * Middleware to validate sensitive operation
 */
export const validateSensitiveOperation = (req: Request, res: Response, next: NextFunction) => {
  // Check if password confirmation is provided for sensitive operations
  const passwordConfirmation = req.headers['x-password-confirmation'];
  
  if (!passwordConfirmation) {
    return res.status(403).json({ 
      error: 'Password confirmation required',
      message: 'This sensitive operation requires password confirmation'
    });
  }

  // TODO: Verify password against user's stored hash
  // This would require bcrypt or similar
  
  next();
};

/**
 * Rate limiting for admin endpoints
 */
export const adminRateLimit = (pool: Pool, maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const key = `admin_${req.user.id}`;
    const now = Date.now();
    const record = requests.get(key);

    if (!record || now > record.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    record.count++;
    next();
  };
};
