import { Router } from 'express';
import { Pool } from 'pg';
import { createUsersRoutes } from './users-routes';
import { createProjectsRoutes } from './projects-routes';
import { createFilesRoutes } from './files-routes';
import { createDeploymentsRoutes } from './deployments-routes';
import { createWebhooksRoutes } from './webhooks-routes';
import { createResourcesRoutes } from './resources-routes';
import { createBillingRoutesV1 } from './billing-routes';
import { createAIRoutes } from './ai-routes';

export function createV1Routes(pool: Pool): Router {
  const router = Router();

  // Mount all v1 routes
  router.use('/users', createUsersRoutes(pool));
  router.use('/projects', createProjectsRoutes(pool));
  router.use('/files', createFilesRoutes(pool));
  router.use('/deployments', createDeploymentsRoutes(pool));
  router.use('/webhooks', createWebhooksRoutes(pool));
  router.use('/resources', createResourcesRoutes(pool));
  router.use('/billing', createBillingRoutesV1(pool));
  router.use('/ai', createAIRoutes(pool));

  return router;
}
