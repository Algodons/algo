import { Pool } from 'pg';
import * as crypto from 'crypto';

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
}

export class WebhookService {
  private pool: Pool;
  private maxRetries: number = 3;
  private retryDelays: number[] = [1000, 5000, 15000]; // Exponential backoff

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Trigger a webhook event
   */
  async triggerEvent(event: string, data: any, projectId?: number): Promise<void> {
    try {
      // Find all webhooks subscribed to this event
      let query = `
        SELECT * FROM webhooks
        WHERE active = true
        AND events @> $1
      `;
      const values: any[] = [JSON.stringify([event])];

      if (projectId) {
        query += ' AND (project_id = $2 OR project_id IS NULL)';
        values.push(projectId);
      }

      const result = await this.pool.query(query, values);

      // Trigger each webhook
      for (const webhook of result.rows) {
        await this.deliverWebhook(webhook, event, data);
      }
    } catch (error) {
      console.error('Error triggering webhook event:', error);
    }
  }

  /**
   * Deliver a webhook with retry logic
   */
  private async deliverWebhook(webhook: any, event: string, data: any): Promise<void> {
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    // Create delivery record
    const delivery = await this.pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, event, payload, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING *`,
      [webhook.id, event, JSON.stringify(payload)]
    );

    const deliveryId = delivery.rows[0].id;

    // Attempt delivery with retries
    let attempt = 0;
    let success = false;

    while (attempt < this.maxRetries && !success) {
      try {
        await this.sendWebhook(webhook, payload, deliveryId, attempt + 1);
        success = true;

        // Update delivery status
        await this.pool.query(
          `UPDATE webhook_deliveries
           SET status = 'delivered', delivered_at = NOW(), attempts = $1
           WHERE id = $2`,
          [attempt + 1, deliveryId]
        );
      } catch (error: any) {
        attempt++;
        
        if (attempt < this.maxRetries) {
          // Wait before retry (exponential backoff)
          await this.delay(this.retryDelays[attempt - 1] || 15000);
        } else {
          // Final attempt failed
          await this.pool.query(
            `UPDATE webhook_deliveries
             SET status = 'failed', error_message = $1, attempts = $2
             WHERE id = $3`,
            [error.message, attempt, deliveryId]
          );
        }
      }
    }
  }

  /**
   * Send webhook HTTP request
   */
  private async sendWebhook(
    webhook: any,
    payload: WebhookPayload,
    deliveryId: number,
    attempt: number
  ): Promise<void> {
    const signature = this.generateSignature(payload, webhook.secret);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Delivery': deliveryId.toString(),
        'X-Webhook-Attempt': attempt.toString(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Log successful delivery
    await this.pool.query(
      `UPDATE webhook_deliveries
       SET response_status = $1, response_body = $2
       WHERE id = $3`,
      [response.status, await response.text(), deliveryId]
    );
  }

  /**
   * Generate HMAC signature for webhook verification
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
