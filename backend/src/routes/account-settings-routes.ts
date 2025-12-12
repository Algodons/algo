import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { AccountSettingsService } from '../services/account-settings-service';

export function createAccountSettingsRoutes(pool: Pool): Router {
  const router = Router();
  const service = new AccountSettingsService(pool);

  // Profile management
  router.get('/profile', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profile = await service.getProfile(userId);
      res.json({ profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  router.patch('/profile', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, email, avatarUrl } = req.body;
      const profile = await service.updateProfile(userId, { name, email, avatarUrl });
      res.json({ profile });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Organization management
  router.post('/organizations', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, slug, description } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ error: 'Name and slug are required' });
      }

      const organization = await service.createOrganization(userId, name, slug, description);
      res.status(201).json({ organization });
    } catch (error) {
      console.error('Error creating organization:', error);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  });

  router.get('/organizations', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const organizations = await service.getOrganizations(userId);
      res.json({ organizations });
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });

  router.get('/organizations/:orgId/members', async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const members = await service.getOrganizationMembers(orgId);
      res.json({ members });
    } catch (error) {
      console.error('Error fetching members:', error);
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  });

  router.post('/organizations/:orgId/invite', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orgId = parseInt(req.params.orgId);
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required' });
      }

      await service.inviteOrganizationMember(orgId, userId, email, role);
      res.json({ message: 'Member invited' });
    } catch (error: any) {
      console.error('Error inviting member:', error);
      res.status(500).json({ error: error.message || 'Failed to invite member' });
    }
  });

  router.delete('/organizations/:orgId/members/:memberId', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const orgId = parseInt(req.params.orgId);
      const memberId = parseInt(req.params.memberId);

      await service.removeOrganizationMember(orgId, userId, memberId);
      res.json({ message: 'Member removed' });
    } catch (error: any) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: error.message || 'Failed to remove member' });
    }
  });

  // Payment methods
  router.post('/payment-methods', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { type, providerPaymentMethodId, lastFour, brand, expiresAt } = req.body;

      if (!type || !providerPaymentMethodId) {
        return res.status(400).json({ error: 'Type and payment method ID are required' });
      }

      const paymentMethod = await service.addPaymentMethod(
        userId,
        type,
        providerPaymentMethodId,
        lastFour,
        brand,
        expiresAt ? new Date(expiresAt) : undefined
      );

      res.status(201).json({ paymentMethod });
    } catch (error) {
      console.error('Error adding payment method:', error);
      res.status(500).json({ error: 'Failed to add payment method' });
    }
  });

  router.get('/payment-methods', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const paymentMethods = await service.listPaymentMethods(userId);
      res.json({ paymentMethods });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  });

  router.post('/payment-methods/:methodId/set-default', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const methodId = parseInt(req.params.methodId);
      await service.setDefaultPaymentMethod(userId, methodId);
      res.json({ message: 'Default payment method set' });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      res.status(500).json({ error: 'Failed to set default payment method' });
    }
  });

  router.delete('/payment-methods/:methodId', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const methodId = parseInt(req.params.methodId);
      await service.deletePaymentMethod(userId, methodId);
      res.json({ message: 'Payment method deleted' });
    } catch (error) {
      console.error('Error deleting payment method:', error);
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  });

  // Invoices
  router.get('/invoices', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const invoices = await service.listInvoices(userId);
      res.json({ invoices });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  router.get('/invoices/:invoiceId', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const invoiceId = parseInt(req.params.invoiceId);
      const invoice = await service.getInvoice(userId, invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      res.json({ invoice });
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  });

  // Notification preferences
  router.get('/notifications/preferences', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const preferences = await service.getNotificationPreferences(userId);
      res.json({ preferences });
    } catch (error) {
      console.error('Error fetching preferences:', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  });

  router.patch('/notifications/preferences', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const preferences = await service.updateNotificationPreferences(userId, req.body);
      res.json({ preferences });
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  // Two-factor authentication
  router.post('/2fa/setup', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await service.setup2FA(userId);
      res.json(result);
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      res.status(500).json({ error: 'Failed to setup 2FA' });
    }
  });

  router.post('/2fa/enable', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ error: 'Verification code is required' });
      }

      await service.enable2FA(userId, code);
      res.json({ message: '2FA enabled' });
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      res.status(500).json({ error: 'Failed to enable 2FA' });
    }
  });

  router.post('/2fa/disable', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await service.disable2FA(userId);
      res.json({ message: '2FA disabled' });
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      res.status(500).json({ error: 'Failed to disable 2FA' });
    }
  });

  router.get('/2fa/status', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const status = await service.get2FAStatus(userId);
      res.json(status);
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
      res.status(500).json({ error: 'Failed to fetch 2FA status' });
    }
  });

  // SSH keys
  router.post('/ssh-keys', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, publicKey } = req.body;

      if (!name || !publicKey) {
        return res.status(400).json({ error: 'Name and public key are required' });
      }

      const sshKey = await service.addSshKey(userId, name, publicKey);
      res.status(201).json({ sshKey });
    } catch (error) {
      console.error('Error adding SSH key:', error);
      res.status(500).json({ error: 'Failed to add SSH key' });
    }
  });

  router.get('/ssh-keys', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const sshKeys = await service.listSshKeys(userId);
      res.json({ sshKeys });
    } catch (error) {
      console.error('Error fetching SSH keys:', error);
      res.status(500).json({ error: 'Failed to fetch SSH keys' });
    }
  });

  router.delete('/ssh-keys/:keyId', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const keyId = parseInt(req.params.keyId);
      await service.deleteSshKey(userId, keyId);
      res.json({ message: 'SSH key deleted' });
    } catch (error) {
      console.error('Error deleting SSH key:', error);
      res.status(500).json({ error: 'Failed to delete SSH key' });
    }
  });

  // Personal access tokens
  router.post('/tokens', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, scopes, expiresAt } = req.body;

      if (!name || !scopes || !Array.isArray(scopes)) {
        return res.status(400).json({ error: 'Name and scopes are required' });
      }

      const result = await service.createPersonalAccessToken(
        userId,
        name,
        scopes,
        expiresAt ? new Date(expiresAt) : undefined
      );

      res.status(201).json({
        token: {
          ...result.token,
          plainToken: result.plainToken, // Only shown once
        },
      });
    } catch (error) {
      console.error('Error creating token:', error);
      res.status(500).json({ error: 'Failed to create token' });
    }
  });

  router.get('/tokens', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tokens = await service.listPersonalAccessTokens(userId);
      res.json({ tokens });
    } catch (error) {
      console.error('Error fetching tokens:', error);
      res.status(500).json({ error: 'Failed to fetch tokens' });
    }
  });

  router.post('/tokens/:tokenId/revoke', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tokenId = parseInt(req.params.tokenId);
      await service.revokePersonalAccessToken(userId, tokenId);
      res.json({ message: 'Token revoked' });
    } catch (error) {
      console.error('Error revoking token:', error);
      res.status(500).json({ error: 'Failed to revoke token' });
    }
  });

  router.delete('/tokens/:tokenId', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tokenId = parseInt(req.params.tokenId);
      await service.deletePersonalAccessToken(userId, tokenId);
      res.json({ message: 'Token deleted' });
    } catch (error) {
      console.error('Error deleting token:', error);
      res.status(500).json({ error: 'Failed to delete token' });
    }
  });

  return router;
}
