import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { ProjectManagementService } from '../services/project-management-service';

export function createProjectManagementRoutes(pool: Pool): Router {
  const router = Router();
  const service = new ProjectManagementService(pool);

  // Get projects with stats and filters
  router.get('/projects', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const filters = {
        search: req.query.search as string,
        language: req.query.language as string,
        isFavorite: req.query.favorite === 'true',
      };

      const projects = await service.getProjectsWithStats(userId, filters);
      res.json({ projects });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  // Get project templates
  router.get('/templates', async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string;
      const templates = await service.getProjectTemplates(category);
      res.json({ templates });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Create project from template
  router.post('/projects/from-template', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { templateId, projectName } = req.body;

      if (!templateId || !projectName) {
        return res.status(400).json({ error: 'Template ID and project name are required' });
      }

      const project = await service.createProjectFromTemplate(userId, templateId, projectName);
      res.status(201).json({ project });
    } catch (error: any) {
      console.error('Error creating project from template:', error);
      res.status(500).json({ error: error.message || 'Failed to create project' });
    }
  });

  // Toggle project favorite
  router.post('/projects/:projectId/favorite', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const projectId = parseInt(req.params.projectId);
      const isFavorite = await service.toggleFavorite(userId, projectId);

      res.json({ isFavorite });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  });

  // Share project with collaborators
  router.post('/projects/:projectId/share', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const projectId = parseInt(req.params.projectId);
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required' });
      }

      if (!['viewer', 'editor', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const collaborator = await service.shareProject(projectId, userId, email, role);
      res.status(201).json({ collaborator });
    } catch (error: any) {
      console.error('Error sharing project:', error);
      res.status(500).json({ error: error.message || 'Failed to share project' });
    }
  });

  // Get project collaborators
  router.get('/projects/:projectId/collaborators', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const collaborators = await service.getProjectCollaborators(projectId);
      res.json({ collaborators });
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      res.status(500).json({ error: 'Failed to fetch collaborators' });
    }
  });

  // Accept collaboration invite
  router.post('/projects/:projectId/accept-invite', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const projectId = parseInt(req.params.projectId);
      await service.acceptCollaborationInvite(userId, projectId);
      res.json({ message: 'Invitation accepted' });
    } catch (error) {
      console.error('Error accepting invite:', error);
      res.status(500).json({ error: 'Failed to accept invitation' });
    }
  });

  // Transfer project ownership
  router.post('/projects/:projectId/transfer', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const projectId = parseInt(req.params.projectId);
      const { newOwnerEmail } = req.body;

      if (!newOwnerEmail) {
        return res.status(400).json({ error: 'New owner email is required' });
      }

      await service.transferProject(projectId, userId, newOwnerEmail);
      res.json({ message: 'Project transferred successfully' });
    } catch (error: any) {
      console.error('Error transferring project:', error);
      res.status(500).json({ error: error.message || 'Failed to transfer project' });
    }
  });

  return router;
}
