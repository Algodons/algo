import { Router } from 'express';
import { Pool } from 'pg';
import { TeamService } from '../services/team-service';
import { authenticate } from '../middleware/auth';

/**
 * Create team management routes
 */
export function createTeamRoutes(pool: Pool): Router {
  const router = Router();
  const teamService = new TeamService(pool);

  // Middleware to check organization membership
  const checkOrgMembership = async (req: any, res: any, next: any) => {
    try {
      const organizationId = parseInt(req.params.organizationId || req.body.organizationId);
      const userId = req.user.id;

      const isMember = await teamService.checkUserRole(organizationId, userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this organization' });
      }

      req.organizationId = organizationId;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Failed to check membership' });
    }
  };

  // Middleware to check admin role
  const checkAdminRole = async (req: any, res: any, next: any) => {
    try {
      const organizationId = parseInt(req.params.organizationId || req.body.organizationId);
      const userId = req.user.id;

      const isAdmin = await teamService.checkUserRole(organizationId, userId, 'admin');
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin role required' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Failed to check role' });
    }
  };

  // Create organization
  router.post('/', authenticate(pool), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { name, slug, description } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ error: 'Name and slug are required' });
      }

      const organization = await teamService.createOrganization(userId, {
        name,
        slug,
        description,
      });

      res.status(201).json({ organization });
    } catch (error) {
      console.error('Create organization error:', error);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  });

  // Get user's organizations
  router.get('/', authenticate(pool), async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizations = await teamService.getUserOrganizations(userId);
      res.json({ organizations });
    } catch (error) {
      console.error('Get organizations error:', error);
      res.status(500).json({ error: 'Failed to get organizations' });
    }
  });

  // Get organization by ID
  router.get('/:organizationId', authenticate(pool), checkOrgMembership, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const organization = await teamService.getOrganization(organizationId);

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json({ organization });
    } catch (error) {
      console.error('Get organization error:', error);
      res.status(500).json({ error: 'Failed to get organization' });
    }
  });

  // Invite member to organization
  router.post(
    '/:organizationId/members',
    authenticate(pool),
    checkOrgMembership,
    checkAdminRole,
    async (req, res) => {
      try {
        const organizationId = parseInt(req.params.organizationId);
        const userId = req.user!.id;
        const { email, role } = req.body;

        if (!email || !role) {
          return res.status(400).json({ error: 'Email and role are required' });
        }

        const member = await teamService.inviteMember(organizationId, userId, { email, role });
        res.status(201).json({ member });
      } catch (error) {
        console.error('Invite member error:', error);
        res.status(500).json({
          error: 'Failed to invite member',
          details: (error as Error).message,
        });
      }
    }
  );

  // Accept invitation
  router.post('/:organizationId/accept', authenticate(pool), async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const userId = req.user!.id;

      await teamService.acceptInvitation(organizationId, userId);
      res.json({ message: 'Invitation accepted' });
    } catch (error) {
      console.error('Accept invitation error:', error);
      res.status(500).json({ error: 'Failed to accept invitation' });
    }
  });

  // Get organization members
  router.get('/:organizationId/members', authenticate(pool), checkOrgMembership, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const members = await teamService.getMembers(organizationId);
      res.json({ members });
    } catch (error) {
      console.error('Get members error:', error);
      res.status(500).json({ error: 'Failed to get members' });
    }
  });

  // Update member role
  router.patch(
    '/:organizationId/members/:userId',
    authenticate(pool),
    checkOrgMembership,
    checkAdminRole,
    async (req, res) => {
      try {
        const organizationId = parseInt(req.params.organizationId);
        const targetUserId = parseInt(req.params.userId);
        const updatedBy = req.user!.id;
        const { role } = req.body;

        if (!role) {
          return res.status(400).json({ error: 'Role is required' });
        }

        await teamService.updateMemberRole(organizationId, targetUserId, updatedBy, { role });
        res.json({ message: 'Member role updated' });
      } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ error: 'Failed to update member role' });
      }
    }
  );

  // Remove member
  router.delete(
    '/:organizationId/members/:userId',
    authenticate(pool),
    checkOrgMembership,
    checkAdminRole,
    async (req, res) => {
      try {
        const organizationId = parseInt(req.params.organizationId);
        const targetUserId = parseInt(req.params.userId);
        const removedBy = req.user!.id;

        await teamService.removeMember(organizationId, targetUserId, removedBy);
        res.json({ message: 'Member removed' });
      } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
      }
    }
  );

  // Set project permissions
  router.post('/projects/:projectId/permissions', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const grantedBy = req.user!.id;
      const { userId, organizationId, permissions } = req.body;

      if ((!userId && !organizationId) || !permissions) {
        return res.status(400).json({
          error: 'Either userId or organizationId, and permissions are required',
        });
      }

      const projectPermissions = await teamService.setProjectPermissions(projectId, grantedBy, {
        userId,
        organizationId,
        permissions,
      });

      res.status(201).json({ permissions: projectPermissions });
    } catch (error) {
      console.error('Set project permissions error:', error);
      res.status(500).json({ error: 'Failed to set project permissions' });
    }
  });

  // Check project permission
  router.get('/projects/:projectId/permissions/check', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user!.id;
      const permission = req.query.permission as 'read' | 'write' | 'deploy' | 'admin';

      if (!permission) {
        return res.status(400).json({ error: 'Permission parameter is required' });
      }

      const hasPermission = await teamService.checkProjectPermission(
        projectId,
        userId,
        permission
      );

      res.json({ hasPermission });
    } catch (error) {
      console.error('Check project permission error:', error);
      res.status(500).json({ error: 'Failed to check project permission' });
    }
  });

  // Get activity feed
  router.get('/:organizationId/activity', authenticate(pool), checkOrgMembership, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const activities = await teamService.getActivityFeed(organizationId, limit, offset);
      res.json({ activities });
    } catch (error) {
      console.error('Get activity feed error:', error);
      res.status(500).json({ error: 'Failed to get activity feed' });
    }
  });

  // Set shared environment variable
  router.post(
    '/:organizationId/env-variables',
    authenticate(pool),
    checkOrgMembership,
    checkAdminRole,
    async (req, res) => {
      try {
        const organizationId = parseInt(req.params.organizationId);
        const userId = req.user!.id;
        const { key, value, encrypt } = req.body;

        if (!key || !value) {
          return res.status(400).json({ error: 'Key and value are required' });
        }

        const variable = await teamService.setSharedEnvVariable(
          'organization',
          organizationId,
          key,
          value,
          userId,
          encrypt !== false
        );

        res.status(201).json({ variable: { ...variable, value: '[ENCRYPTED]' } });
      } catch (error) {
        console.error('Set env variable error:', error);
        res.status(500).json({ error: 'Failed to set environment variable' });
      }
    }
  );

  // Get shared environment variables
  router.get('/:organizationId/env-variables', authenticate(pool), checkOrgMembership, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const decrypt = req.query.decrypt === 'true';

      const variables = await teamService.getSharedEnvVariables(
        'organization',
        organizationId,
        decrypt
      );

      // Mask values if not decrypting
      const maskedVariables = decrypt
        ? variables
        : variables.map((v) => ({ ...v, value: '[ENCRYPTED]' }));

      res.json({ variables: maskedVariables });
    } catch (error) {
      console.error('Get env variables error:', error);
      res.status(500).json({ error: 'Failed to get environment variables' });
    }
  });

  // Delete shared environment variable
  router.delete(
    '/:organizationId/env-variables/:variableId',
    authenticate(pool),
    checkOrgMembership,
    checkAdminRole,
    async (req, res) => {
      try {
        const variableId = parseInt(req.params.variableId);
        const userId = req.user!.id;

        await teamService.deleteSharedEnvVariable(variableId, userId);
        res.json({ message: 'Environment variable deleted' });
      } catch (error) {
        console.error('Delete env variable error:', error);
        res.status(500).json({ error: 'Failed to delete environment variable' });
      }
    }
  );

  return router;
}
