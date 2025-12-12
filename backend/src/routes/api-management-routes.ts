import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { ApiManagementService } from '../services/api-management-service';

export function createApiManagementRoutes(pool: Pool): Router {
  const router = Router();
  const service = new ApiManagementService(pool);

  // Generate new API key
  router.post('/api-keys', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, scopes, expiresAt } = req.body;

      if (!name || !scopes || !Array.isArray(scopes)) {
        return res.status(400).json({ error: 'Name and scopes are required' });
      }

      const result = await service.generateApiKey(userId, {
        name,
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.status(201).json({
        apiKey: {
          ...result.apiKey,
          key: result.plainKey, // Only shown once
        },
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      res.status(500).json({ error: 'Failed to generate API key' });
    }
  });

  // List API keys
  router.get('/api-keys', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const apiKeys = await service.listApiKeys(userId);
      res.json({ apiKeys });
    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
  });

  // Revoke API key
  router.post('/api-keys/:keyId/revoke', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const keyId = parseInt(req.params.keyId);
      await service.revokeApiKey(userId, keyId);
      res.json({ message: 'API key revoked' });
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  });

  // Delete API key
  router.delete('/api-keys/:keyId', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const keyId = parseInt(req.params.keyId);
      await service.deleteApiKey(userId, keyId);
      res.json({ message: 'API key deleted' });
    } catch (error) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  });

  // Create webhook
  router.post('/webhooks', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { projectId, name, url, events, isActive } = req.body;

      if (!name || !url || !events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'Name, URL, and events are required' });
      }

      const webhook = await service.createWebhook(userId, {
        userId,
        projectId: projectId || undefined,
        name,
        url,
        events,
        isActive: isActive !== undefined ? isActive : true,
      });

      res.status(201).json({ webhook });
    } catch (error) {
      console.error('Error creating webhook:', error);
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  });

  // List webhooks
  router.get('/webhooks', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const webhooks = await service.listWebhooks(userId, projectId);
      res.json({ webhooks });
    } catch (error) {
      console.error('Error listing webhooks:', error);
      res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
  });

  // Update webhook
  router.patch('/webhooks/:webhookId', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const webhookId = parseInt(req.params.webhookId);
      const updates = req.body;

      const webhook = await service.updateWebhook(userId, webhookId, updates);
      res.json({ webhook });
    } catch (error) {
      console.error('Error updating webhook:', error);
      res.status(500).json({ error: 'Failed to update webhook' });
    }
  });

  // Delete webhook
  router.delete('/webhooks/:webhookId', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const webhookId = parseInt(req.params.webhookId);
      await service.deleteWebhook(userId, webhookId);
      res.json({ message: 'Webhook deleted' });
    } catch (error) {
      console.error('Error deleting webhook:', error);
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  });

  // Get webhook deliveries
  router.get('/webhooks/:webhookId/deliveries', async (req: Request, res: Response) => {
    try {
      const webhookId = parseInt(req.params.webhookId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const deliveries = await service.getWebhookDeliveries(webhookId, limit);
      res.json({ deliveries });
    } catch (error) {
      console.error('Error fetching webhook deliveries:', error);
      res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
  });

  // Get API usage analytics
  router.get('/analytics/usage', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const startDate = req.query.start
        ? new Date(req.query.start as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end ? new Date(req.query.end as string) : new Date();

      const analytics = await service.getApiUsageAnalytics(userId, startDate, endDate);
      res.json({ analytics });
    } catch (error) {
      console.error('Error fetching API analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  return router;
}
