import { Router, Request, Response } from 'express';
import { AutomationService } from '../automation/automation-service';
import * as path from 'path';

const router = Router();

// Initialize automation service
const automationService = new AutomationService(
  path.join(process.cwd(), 'templates'),
  process.env.DEBUG === 'true'
);

/**
 * Auto-detect project configuration
 * POST /api/automation/detect
 */
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    const result = await automationService.autoDetect(projectPath);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Install project dependencies
 * POST /api/automation/install
 */
router.post('/install', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    const result = await automationService.installDependencies(projectPath);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Generate Infrastructure as Code
 * POST /api/automation/generate-iac
 */
router.post('/generate-iac', async (req: Request, res: Response) => {
  try {
    const { projectPath, domain, cloudProvider } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    const result = await automationService.generateIaC(
      projectPath,
      domain,
      cloudProvider
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get available templates
 * GET /api/automation/templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await automationService.getTemplates();

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Initialize project from template
 * POST /api/automation/init-template
 */
router.post('/init-template', async (req: Request, res: Response) => {
  try {
    const { templateName, targetDir, customization } = req.body;

    if (!templateName || !targetDir) {
      return res.status(400).json({
        error: 'templateName and targetDir are required',
      });
    }

    await automationService.initializeFromTemplate(
      templateName,
      targetDir,
      customization
    );

    res.json({
      success: true,
      message: `Project initialized from template: ${templateName}`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Import project from GitHub
 * POST /api/automation/import-github
 */
router.post('/import-github', async (req: Request, res: Response) => {
  try {
    const { repoUrl, targetDir } = req.body;

    if (!repoUrl || !targetDir) {
      return res.status(400).json({
        error: 'repoUrl and targetDir are required',
      });
    }

    await automationService.importFromGitHub(repoUrl, targetDir);

    res.json({
      success: true,
      message: 'Project imported from GitHub successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Full project setup
 * POST /api/automation/setup
 */
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const { projectPath, options } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    const result = await automationService.setupProject(projectPath, options || {});

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
