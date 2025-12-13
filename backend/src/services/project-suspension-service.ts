/**
 * Project Suspension Service
 * Manages idle project suspension and wake-on-request functionality
 */

import { Pool } from 'pg';
import { EventEmitter } from 'events';

interface Project {
  id: string;
  name: string;
  user_id: string;
  last_activity: Date;
  status: 'active' | 'suspended' | 'waking';
  suspended_at?: Date;
  suspended_state?: any;
}

interface SuspensionConfig {
  inactivityThresholdDays: number;
  checkInterval: number; // milliseconds
  notificationDays: number[]; // Days before suspension to send notifications
  enableWakeOnRequest: boolean;
  coldStartOptimization: boolean;
}

export class ProjectSuspensionService extends EventEmitter {
  private pool: Pool;
  private config: SuspensionConfig;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(pool: Pool, config?: Partial<SuspensionConfig>) {
    super();
    this.pool = pool;
    this.config = {
      inactivityThresholdDays: 30,
      checkInterval: 3600000, // 1 hour
      notificationDays: [7, 3, 1], // Notify 7, 3, and 1 day before suspension
      enableWakeOnRequest: true,
      coldStartOptimization: true,
      ...config,
    };
  }

  /**
   * Start the suspension service
   */
  start(): void {
    console.log('Starting project suspension service...');

    // Initial check
    this.checkIdleProjects().catch((error) =>
      console.error('Error in initial project check:', error)
    );

    // Schedule periodic checks
    this.checkInterval = setInterval(() => {
      this.checkIdleProjects().catch((error) =>
        console.error('Error in periodic project check:', error)
      );
    }, this.config.checkInterval);

    console.log(
      `Project suspension service started (check interval: ${this.config.checkInterval}ms)`
    );
  }

  /**
   * Stop the suspension service
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('Project suspension service stopped');
  }

  /**
   * Check for idle projects and process them
   */
  private async checkIdleProjects(): Promise<void> {
    try {
      const client = await this.pool.connect();

      try {
        // Find projects that need notification
        await this.sendSuspensionNotifications(client);

        // Find projects that should be suspended
        const idleProjects = await this.findIdleProjects(client);

        console.log(`Found ${idleProjects.length} idle projects to suspend`);

        // Suspend idle projects
        for (const project of idleProjects) {
          try {
            await this.suspendProject(project.id, client);
          } catch (error) {
            console.error(`Failed to suspend project ${project.id}:`, error);
            // Emit error but continue processing other projects
            this.emit('suspension_error', {
              project_id: project.id,
              error: (error as Error).message,
            });
          }
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error checking idle projects:', error);
      this.emit('error', error);
      // TODO: Integrate with monitoring system (PagerDuty, Datadog, etc.)
      // TODO: Implement retry logic with exponential backoff
    }
  }

  /**
   * Find projects that are idle
   * Note: Requires compound index on (status, last_activity) for optimal performance
   */
  private async findIdleProjects(client: any): Promise<Project[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(
      thresholdDate.getDate() - this.config.inactivityThresholdDays
    );

    // Using compound index: idx_projects_status_activity
    const result = await client.query(
      `
      SELECT id, name, user_id, last_activity, status
      FROM projects
      WHERE status = 'active'
        AND last_activity < $1
      ORDER BY last_activity ASC
      LIMIT 100
    `,
      [thresholdDate]
    );

    return result.rows;
  }

  /**
   * Send suspension notifications to users
   */
  private async sendSuspensionNotifications(client: any): Promise<void> {
    for (const days of this.config.notificationDays) {
      const notificationDate = new Date();
      notificationDate.setDate(
        notificationDate.getDate() -
          this.config.inactivityThresholdDays +
          days
      );

      const projects = await client.query(
        `
        SELECT p.id, p.name, p.user_id, p.last_activity, u.email
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.status = 'active'
          AND p.last_activity < $1
          AND p.last_activity >= $2
          AND NOT EXISTS (
            SELECT 1 FROM project_notifications pn
            WHERE pn.project_id = p.id
              AND pn.type = 'suspension_warning'
              AND pn.days_before = $3
          )
      `,
        [
          notificationDate,
          new Date(notificationDate.getTime() - 86400000), // -1 day
          days,
        ]
      );

      // Send notifications
      for (const project of projects.rows) {
        await this.sendNotification(project, days);

        // Record notification
        await client.query(
          `
          INSERT INTO project_notifications (project_id, type, days_before, sent_at)
          VALUES ($1, 'suspension_warning', $2, NOW())
        `,
          [project.id, days]
        );
      }
    }
  }

  /**
   * Send notification to user
   */
  private async sendNotification(project: any, daysRemaining: number): Promise<void> {
    console.log(
      `Sending suspension warning for project ${project.name} (${daysRemaining} days remaining)`
    );

    // Emit notification event
    this.emit('notification', {
      type: 'suspension_warning',
      project_id: project.id,
      project_name: project.name,
      user_id: project.user_id,
      email: project.email,
      days_remaining: daysRemaining,
      message: `Your project "${project.name}" will be suspended in ${daysRemaining} day(s) due to inactivity. Access it to keep it active.`,
    });
  }

  /**
   * Suspend a project
   */
  async suspendProject(projectId: string, client?: any): Promise<void> {
    const shouldRelease = !client;
    if (!client) {
      client = await this.pool.connect();
    }

    try {
      console.log(`Suspending project: ${projectId}`);

      // Get project state
      const projectState = await this.captureProjectState(projectId, client);

      // Update project status
      await client.query(
        `
        UPDATE projects
        SET status = 'suspended',
            suspended_at = NOW(),
            suspended_state = $2
        WHERE id = $1
      `,
        [projectId, JSON.stringify(projectState)]
      );

      // Stop project resources (containers, services, etc.)
      await this.stopProjectResources(projectId);

      // Emit suspension event
      this.emit('suspended', {
        project_id: projectId,
        suspended_at: new Date(),
        state: projectState,
      });

      console.log(`Project suspended: ${projectId}`);
    } catch (error) {
      console.error(`Error suspending project ${projectId}:`, error);
      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  /**
   * Capture project state before suspension
   */
  private async captureProjectState(
    projectId: string,
    client: any
  ): Promise<any> {
    const state: any = {
      timestamp: new Date(),
      environment: {},
      services: [],
      volumes: [],
    };

    // Get project configuration
    const configResult = await client.query(
      'SELECT * FROM project_configs WHERE project_id = $1',
      [projectId]
    );
    state.config = configResult.rows[0];

    // Get running services
    const servicesResult = await client.query(
      'SELECT * FROM project_services WHERE project_id = $1 AND status = $2',
      [projectId, 'running']
    );
    state.services = servicesResult.rows;

    // Get environment variables
    const envResult = await client.query(
      'SELECT * FROM project_env WHERE project_id = $1',
      [projectId]
    );
    state.environment = envResult.rows;

    return state;
  }

  /**
   * Stop project resources
   * TODO: Integrate with Docker/Kubernetes API
   * See: https://github.com/Algodons/algo/issues/XXX
   */
  private async stopProjectResources(projectId: string): Promise<void> {
    console.log(`Stopping resources for project: ${projectId}`);

    try {
      // TODO: Implement Docker container management
      // const docker = new Docker();
      // const containers = await docker.listContainers({
      //   filters: { label: [`project_id=${projectId}`] }
      // });
      // for (const container of containers) {
      //   await docker.getContainer(container.Id).stop({ t: 30 }); // 30s graceful shutdown
      // }

      // TODO: Implement Kubernetes pod management
      // const k8sApi = new k8s.CoreV1Api();
      // await k8sApi.deleteNamespacedPod(
      //   `project-${projectId}`,
      //   'default',
      //   undefined,
      //   undefined,
      //   30 // 30s grace period
      // );

      // For now, emit event for manual handling
      this.emit('resources_stop_requested', { project_id: projectId });
    } catch (error) {
      console.error(`Error stopping resources for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Wake up a suspended project (wake-on-request)
   */
  async wakeProject(projectId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Get project
      const result = await client.query(
        'SELECT * FROM projects WHERE id = $1',
        [projectId]
      );

      if (result.rows.length === 0) {
        throw new Error('Project not found');
      }

      const project = result.rows[0];

      if (project.status !== 'suspended') {
        throw new Error('Project is not suspended');
      }

      console.log(`Waking up project: ${projectId}`);

      // Update status to waking
      await client.query(
        'UPDATE projects SET status = $2 WHERE id = $1',
        [projectId, 'waking']
      );

      // Emit waking event
      this.emit('waking', {
        project_id: projectId,
        waking_at: new Date(),
      });

      // Restore project state
      const state = project.suspended_state
        ? JSON.parse(project.suspended_state)
        : {};

      // Start project resources
      await this.startProjectResources(projectId, state);

      // Update status to active
      await client.query(
        `
        UPDATE projects
        SET status = 'active',
            last_activity = NOW(),
            suspended_at = NULL,
            suspended_state = NULL
        WHERE id = $1
      `,
        [projectId]
      );

      // Emit woke event
      this.emit('woke', {
        project_id: projectId,
        woke_at: new Date(),
      });

      console.log(`Project woke up: ${projectId}`);
    } catch (error) {
      console.error(`Error waking up project ${projectId}:`, error);

      // Revert to suspended status on error
      await client.query(
        'UPDATE projects SET status = $2 WHERE id = $1',
        [projectId, 'suspended']
      );

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Start project resources
   * TODO: Integrate with Docker/Kubernetes API
   * See: https://github.com/Algodons/algo/issues/XXX
   */
  private async startProjectResources(
    projectId: string,
    state: any
  ): Promise<void> {
    console.log(`Starting resources for project: ${projectId}`);

    try {
      // Cold start optimization
      if (this.config.coldStartOptimization) {
        // Use cached images, pre-warmed containers, etc.
        console.log('Using cold start optimization');
      }

      // TODO: Restore services
      if (state.services && state.services.length > 0) {
        for (const service of state.services) {
          console.log(`Starting service: ${service.name}`);
          // TODO: Start service (Docker/Kubernetes)
          // await docker.getContainer(service.container_id).start();
        }
      }

      // TODO: Restore environment variables
      if (state.environment) {
        console.log('Restoring environment variables');
        // TODO: Apply environment variables to containers
      }

      // For now, emit event for manual handling
      this.emit('resources_start_requested', { 
        project_id: projectId,
        state 
      });
    } catch (error) {
      console.error(`Error starting resources for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Track project activity
   */
  async trackActivity(projectId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE projects SET last_activity = NOW() WHERE id = $1',
        [projectId]
      );
    } catch (error) {
      console.error(`Error tracking activity for project ${projectId}:`, error);
    }
  }

  /**
   * Get suspension status for a project
   */
  async getProjectStatus(projectId: string): Promise<any> {
    const result = await this.pool.query(
      `
      SELECT id, name, status, last_activity, suspended_at
      FROM projects
      WHERE id = $1
    `,
      [projectId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const project = result.rows[0];

    // Calculate days until suspension
    let daysUntilSuspension = null;
    if (project.status === 'active' && project.last_activity) {
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(project.last_activity).getTime()) / 86400000
      );
      daysUntilSuspension = Math.max(
        0,
        this.config.inactivityThresholdDays - daysSinceActivity
      );
    }

    return {
      ...project,
      days_until_suspension: daysUntilSuspension,
      threshold_days: this.config.inactivityThresholdDays,
    };
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_projects,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_projects,
        COUNT(*) FILTER (WHERE status = 'waking') as waking_projects,
        AVG(EXTRACT(EPOCH FROM (NOW() - last_activity)) / 86400)::integer as avg_days_since_activity
      FROM projects
    `);

    return result.rows[0];
  }
}

/**
 * Wake-on-request middleware
 */
export function wakeOnRequestMiddleware(
  suspensionService: ProjectSuspensionService
) {
  return async (req: any, res: any, next: any) => {
    const projectId = req.params.projectId || req.query.projectId;

    if (!projectId) {
      return next();
    }

    try {
      // Get project status
      const status = await suspensionService.getProjectStatus(projectId);

      if (!status) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // If project is suspended, wake it up
      if (status.status === 'suspended') {
        // Return loading state
        res.status(202).json({
          status: 'waking',
          message: 'Project is waking up. Please wait...',
          project_id: projectId,
          estimated_time: 30, // seconds
        });

        // Wake up project asynchronously
        suspensionService.wakeProject(projectId).catch((error) => {
          console.error(`Failed to wake project ${projectId}:`, error);
        });

        return;
      }

      // If project is waking, return loading state
      if (status.status === 'waking') {
        return res.status(202).json({
          status: 'waking',
          message: 'Project is waking up. Please wait...',
          project_id: projectId,
          estimated_time: 30, // seconds
        });
      }

      // Project is active, track activity and continue
      await suspensionService.trackActivity(projectId);
      next();
    } catch (error) {
      console.error('Wake-on-request middleware error:', error);
      // Continue on error
      next();
    }
  };
}
