import { Pool } from 'pg';
import crypto from 'crypto';
import { ApiKey, ApiKeyCreate, Webhook, ApiUsage, ApiUsageAnalytics, WebhookDelivery } from '../types/dashboard';

// HTTP status code constants
const HTTP_STATUS_SUCCESS_MIN = 200;
const HTTP_STATUS_SUCCESS_MAX = 300;

export class ApiManagementService {
  constructor(private pool: Pool) {}

  async generateApiKey(userId: number, keyData: ApiKeyCreate): Promise<{ apiKey: ApiKey; plainKey: string }> {
    // Generate a random API key
    const plainKey = `algo_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = plainKey.substring(0, 12);
    const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

    const result = await this.pool.query(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, keyData.name, keyHash, keyPrefix, JSON.stringify(keyData.scopes), keyData.expiresAt]
    );

    return {
      apiKey: result.rows[0],
      plainKey,
    };
  }

  async validateApiKey(plainKey: string): Promise<ApiKey | null> {
    const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

    const result = await this.pool.query(
      `SELECT * FROM api_keys
       WHERE key_hash = $1
         AND is_active = true
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const apiKey = result.rows[0];

    // Update last used timestamp
    await this.pool.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [apiKey.id]
    );

    return apiKey;
  }

  async listApiKeys(userId: number): Promise<ApiKey[]> {
    const result = await this.pool.query(
      `SELECT * FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async revokeApiKey(userId: number, keyId: number): Promise<void> {
    await this.pool.query(
      `UPDATE api_keys
       SET is_active = false
       WHERE id = $1 AND user_id = $2`,
      [keyId, userId]
    );
  }

  async deleteApiKey(userId: number, keyId: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2',
      [keyId, userId]
    );
  }

  async createWebhook(
    userId: number,
    webhookData: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt' | 'lastTriggeredAt' | 'failureCount'>
  ): Promise<Webhook> {
    const secret = crypto.randomBytes(32).toString('hex');

    const result = await this.pool.query(
      `INSERT INTO webhooks (user_id, project_id, name, url, events, secret, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        webhookData.projectId,
        webhookData.name,
        webhookData.url,
        JSON.stringify(webhookData.events),
        secret,
        webhookData.isActive,
      ]
    );

    return result.rows[0];
  }

  async listWebhooks(userId: number, projectId?: number): Promise<Webhook[]> {
    let query = 'SELECT * FROM webhooks WHERE user_id = $1';
    const params: any[] = [userId];

    if (projectId) {
      query += ' AND project_id = $2';
      params.push(projectId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async updateWebhook(
    userId: number,
    webhookId: number,
    updates: Partial<Webhook>
  ): Promise<Webhook> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.url !== undefined) {
      fields.push(`url = $${paramIndex++}`);
      values.push(updates.url);
    }
    if (updates.events !== undefined) {
      fields.push(`events = $${paramIndex++}`);
      values.push(JSON.stringify(updates.events));
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    values.push(webhookId, userId);

    const result = await this.pool.query(
      `UPDATE webhooks
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async deleteWebhook(userId: number, webhookId: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM webhooks WHERE id = $1 AND user_id = $2',
      [webhookId, userId]
    );
  }

  async triggerWebhook(
    webhookId: number,
    eventType: string,
    payload: any
  ): Promise<void> {
    const webhook = await this.pool.query(
      'SELECT * FROM webhooks WHERE id = $1 AND is_active = true',
      [webhookId]
    );

    if (webhook.rows.length === 0) {
      return;
    }

    const w = webhook.rows[0];

    // Check if webhook is subscribed to this event
    const events = JSON.parse(w.events || '[]');
    if (!events.includes(eventType) && !events.includes('*')) {
      return;
    }

    try {
      // Generate signature
      const signature = crypto
        .createHmac('sha256', w.secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Make HTTP request
      const response = await fetch(w.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Algo-Signature': signature,
          'X-Algo-Event': eventType,
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();

      // Log delivery
      await this.pool.query(
        `INSERT INTO webhook_deliveries 
          (webhook_id, event_type, payload, response_status, response_body, success)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [webhookId, eventType, JSON.stringify(payload), response.status, responseBody, response.ok]
      );

      // Update webhook status
      if (response.ok) {
        await this.pool.query(
          `UPDATE webhooks
           SET last_triggered_at = CURRENT_TIMESTAMP, failure_count = 0
           WHERE id = $1`,
          [webhookId]
        );
      } else {
        await this.pool.query(
          `UPDATE webhooks
           SET failure_count = failure_count + 1
           WHERE id = $1`,
          [webhookId]
        );
      }
    } catch (error) {
      // Log failed delivery
      await this.pool.query(
        `INSERT INTO webhook_deliveries 
          (webhook_id, event_type, payload, success)
         VALUES ($1, $2, $3, false)`,
        [webhookId, eventType, JSON.stringify(payload)]
      );

      await this.pool.query(
        `UPDATE webhooks
         SET failure_count = failure_count + 1
         WHERE id = $1`,
        [webhookId]
      );
    }
  }

  async recordApiUsage(
    apiKeyId: number | null,
    userId: number,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO api_usage 
        (api_key_id, user_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [apiKeyId, userId, endpoint, method, statusCode, responseTimeMs, ipAddress, userAgent]
    );
  }

  async getApiUsageAnalytics(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<ApiUsageAnalytics> {
    // Total requests
    const totalResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM api_usage
       WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3`,
      [userId, startDate, endDate]
    );

    const totalRequests = parseInt(totalResult.rows[0].total);

    // Success rate
    const successResult = await this.pool.query(
      `SELECT COUNT(*) as success FROM api_usage
       WHERE user_id = $1
         AND timestamp BETWEEN $2 AND $3
         AND status_code >= $4 AND status_code < $5`,
      [userId, startDate, endDate, HTTP_STATUS_SUCCESS_MIN, HTTP_STATUS_SUCCESS_MAX]
    );

    const successCount = parseInt(successResult.rows[0].success);
    const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;

    // Average response time
    const avgTimeResult = await this.pool.query(
      `SELECT AVG(response_time_ms) as avg_time FROM api_usage
       WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3`,
      [userId, startDate, endDate]
    );

    const averageResponseTime = parseFloat(avgTimeResult.rows[0].avg_time || '0');

    // Requests by endpoint
    const endpointResult = await this.pool.query(
      `SELECT 
        endpoint,
        COUNT(*) as count,
        AVG(response_time_ms) as avg_time
       FROM api_usage
       WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3
       GROUP BY endpoint
       ORDER BY count DESC
       LIMIT 10`,
      [userId, startDate, endDate]
    );

    const requestsByEndpoint = endpointResult.rows.map((row) => ({
      endpoint: row.endpoint,
      count: parseInt(row.count),
      averageResponseTime: parseFloat(row.avg_time),
    }));

    // Requests by status
    const statusResult = await this.pool.query(
      `SELECT 
        status_code,
        COUNT(*) as count
       FROM api_usage
       WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3
       GROUP BY status_code
       ORDER BY count DESC`,
      [userId, startDate, endDate]
    );

    const requestsByStatus = statusResult.rows.map((row) => ({
      statusCode: parseInt(row.status_code),
      count: parseInt(row.count),
    }));

    // Timeline
    const timelineResult = await this.pool.query(
      `SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
       FROM api_usage
       WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3
       GROUP BY DATE(timestamp)
       ORDER BY date ASC`,
      [userId, startDate, endDate]
    );

    const timeline = timelineResult.rows.map((row) => ({
      date: row.date,
      count: parseInt(row.count),
    }));

    return {
      totalRequests,
      successRate,
      averageResponseTime,
      requestsByEndpoint,
      requestsByStatus,
      timeline,
    };
  }

  async getWebhookDeliveries(webhookId: number, limit: number = 50): Promise<WebhookDelivery[]> {
    const result = await this.pool.query(
      `SELECT * FROM webhook_deliveries
       WHERE webhook_id = $1
       ORDER BY delivered_at DESC
       LIMIT $2`,
      [webhookId, limit]
    );

    return result.rows;
  }
}
