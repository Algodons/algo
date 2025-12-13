import { Router } from 'express';
import { Pool } from 'pg';
import { VersionControlService } from '../services/version-control-service';
import { authenticate } from '../middleware/auth';

/**
 * Create version control routes
 */
export function createVersionControlRoutes(pool: Pool, workspaceDir: string): Router {
  const router = Router();
  const versionControlService = new VersionControlService(pool, workspaceDir);

  // Create pull request
  router.post('/projects/:projectId/pull-requests', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user!.id;
      const { title, description, sourceBranch, targetBranch, labels, milestone } = req.body;

      if (!title || !sourceBranch || !targetBranch) {
        return res.status(400).json({
          error: 'title, sourceBranch, and targetBranch are required',
        });
      }

      const pullRequest = await versionControlService.createPullRequest(projectId, userId, {
        title,
        description,
        sourceBranch,
        targetBranch,
        labels,
        milestone,
      });

      res.status(201).json({ pullRequest });
    } catch (error) {
      console.error('Create pull request error:', error);
      res.status(500).json({ error: 'Failed to create pull request' });
    }
  });

  // Get pull request by number
  router.get('/projects/:projectId/pull-requests/:prNumber', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const prNumber = parseInt(req.params.prNumber);

      const pullRequest = await versionControlService.getPullRequest(projectId, prNumber);

      if (!pullRequest) {
        return res.status(404).json({ error: 'Pull request not found' });
      }

      res.json({ pullRequest });
    } catch (error) {
      console.error('Get pull request error:', error);
      res.status(500).json({ error: 'Failed to get pull request' });
    }
  });

  // Get pull requests for a project
  router.get('/projects/:projectId/pull-requests', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const status = req.query.status as any;

      const pullRequests = await versionControlService.getPullRequests(projectId, status);
      res.json({ pullRequests });
    } catch (error) {
      console.error('Get pull requests error:', error);
      res.status(500).json({ error: 'Failed to get pull requests' });
    }
  });

  // Submit pull request review
  router.post('/pull-requests/:pullRequestId/reviews', authenticate(pool), async (req, res) => {
    try {
      const pullRequestId = parseInt(req.params.pullRequestId);
      const userId = req.user!.id;
      const { status, comment, comments } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }

      const review = await versionControlService.submitReview(pullRequestId, userId, {
        status,
        comment,
        comments,
      });

      res.status(201).json({ review });
    } catch (error) {
      console.error('Submit review error:', error);
      res.status(500).json({ error: 'Failed to submit review' });
    }
  });

  // Get reviews for a pull request
  router.get('/pull-requests/:pullRequestId/reviews', authenticate(pool), async (req, res) => {
    try {
      const pullRequestId = parseInt(req.params.pullRequestId);
      const reviews = await versionControlService.getReviews(pullRequestId);
      res.json({ reviews });
    } catch (error) {
      console.error('Get reviews error:', error);
      res.status(500).json({ error: 'Failed to get reviews' });
    }
  });

  // Get review comments
  router.get('/reviews/:reviewId/comments', authenticate(pool), async (req, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      const comments = await versionControlService.getReviewComments(reviewId);
      res.json({ comments });
    } catch (error) {
      console.error('Get review comments error:', error);
      res.status(500).json({ error: 'Failed to get review comments' });
    }
  });

  // Check if PR can be merged
  router.get('/pull-requests/:pullRequestId/can-merge', authenticate(pool), async (req, res) => {
    try {
      const pullRequestId = parseInt(req.params.pullRequestId);
      const result = await versionControlService.canMergePullRequest(pullRequestId);
      res.json(result);
    } catch (error) {
      console.error('Check can merge error:', error);
      res.status(500).json({ error: 'Failed to check merge status' });
    }
  });

  // Merge pull request
  router.post('/pull-requests/:pullRequestId/merge', authenticate(pool), async (req, res) => {
    try {
      const pullRequestId = parseInt(req.params.pullRequestId);
      const userId = req.user!.id;
      const { strategy } = req.body;

      await versionControlService.mergePullRequest(pullRequestId, userId, strategy);
      res.json({ message: 'Pull request merged successfully' });
    } catch (error) {
      console.error('Merge pull request error:', error);
      res.status(500).json({
        error: 'Failed to merge pull request',
        details: (error as Error).message,
      });
    }
  });

  // Close pull request
  router.post('/pull-requests/:pullRequestId/close', authenticate(pool), async (req, res) => {
    try {
      const pullRequestId = parseInt(req.params.pullRequestId);
      const userId = req.user!.id;

      await versionControlService.closePullRequest(pullRequestId, userId);
      res.json({ message: 'Pull request closed' });
    } catch (error) {
      console.error('Close pull request error:', error);
      res.status(500).json({ error: 'Failed to close pull request' });
    }
  });

  // Create branch protection rule
  router.post('/projects/:projectId/branch-protection', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const {
        branchPattern,
        requirePullRequest,
        requiredApprovals,
        requireStatusChecks,
        requiredStatusChecks,
        requireUpToDate,
        restrictPush,
        allowedPushUsers,
        requireSignedCommits,
      } = req.body;

      if (!branchPattern) {
        return res.status(400).json({ error: 'branchPattern is required' });
      }

      const rule = await versionControlService.createBranchProtection(projectId, {
        branchPattern,
        requirePullRequest,
        requiredApprovals,
        requireStatusChecks,
        requiredStatusChecks,
        requireUpToDate,
        restrictPush,
        allowedPushUsers,
        requireSignedCommits,
      });

      res.status(201).json({ rule });
    } catch (error) {
      console.error('Create branch protection error:', error);
      res.status(500).json({ error: 'Failed to create branch protection' });
    }
  });

  // Get branch protection rules
  router.get('/projects/:projectId/branch-protection', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const rules = await versionControlService.getBranchProtectionRules(projectId);
      res.json({ rules });
    } catch (error) {
      console.error('Get branch protection rules error:', error);
      res.status(500).json({ error: 'Failed to get branch protection rules' });
    }
  });

  // Delete branch protection rule
  router.delete('/branch-protection/:ruleId', authenticate(pool), async (req, res) => {
    try {
      const ruleId = parseInt(req.params.ruleId);
      await versionControlService.deleteBranchProtection(ruleId);
      res.json({ message: 'Branch protection rule deleted' });
    } catch (error) {
      console.error('Delete branch protection error:', error);
      res.status(500).json({ error: 'Failed to delete branch protection rule' });
    }
  });

  // Create deployment protection
  router.post('/projects/:projectId/deployment-protection', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const {
        environment,
        requireApproval,
        requiredApprovers,
        approvalTimeout,
        autoRollback,
        protectionRules,
      } = req.body;

      if (!environment) {
        return res.status(400).json({ error: 'environment is required' });
      }

      const protection = await versionControlService.createDeploymentProtection(
        projectId,
        environment,
        {
          requireApproval,
          requiredApprovers,
          approvalTimeout,
          autoRollback,
          protectionRules,
        }
      );

      res.status(201).json({ protection });
    } catch (error) {
      console.error('Create deployment protection error:', error);
      res.status(500).json({ error: 'Failed to create deployment protection' });
    }
  });

  // Request deployment approval
  router.post('/projects/:projectId/deployment-approvals', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user!.id;
      const { deploymentId, environment } = req.body;

      if (!deploymentId || !environment) {
        return res.status(400).json({ error: 'deploymentId and environment are required' });
      }

      const approval = await versionControlService.requestDeploymentApproval(projectId, userId, {
        deploymentId,
        environment,
      });

      res.status(201).json({ approval });
    } catch (error) {
      console.error('Request deployment approval error:', error);
      res.status(500).json({ error: 'Failed to request deployment approval' });
    }
  });

  // Approve deployment
  router.post('/deployment-approvals/:approvalId/approve', authenticate(pool), async (req, res) => {
    try {
      const approvalId = parseInt(req.params.approvalId);
      const userId = req.user!.id;

      await versionControlService.approveDeployment(approvalId, userId);
      res.json({ message: 'Deployment approved' });
    } catch (error) {
      console.error('Approve deployment error:', error);
      res.status(500).json({ error: 'Failed to approve deployment' });
    }
  });

  // Reject deployment
  router.post('/deployment-approvals/:approvalId/reject', authenticate(pool), async (req, res) => {
    try {
      const approvalId = parseInt(req.params.approvalId);
      const userId = req.user!.id;
      const { reason } = req.body;

      await versionControlService.rejectDeployment(approvalId, userId, reason);
      res.json({ message: 'Deployment rejected' });
    } catch (error) {
      console.error('Reject deployment error:', error);
      res.status(500).json({ error: 'Failed to reject deployment' });
    }
  });

  // Get pending deployment approvals
  router.get('/projects/:projectId/deployment-approvals/pending', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const approvals = await versionControlService.getPendingApprovals(projectId);
      res.json({ approvals });
    } catch (error) {
      console.error('Get pending approvals error:', error);
      res.status(500).json({ error: 'Failed to get pending approvals' });
    }
  });

  // Detect merge conflicts
  router.post('/projects/:projectId/merge-conflicts/detect', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { sourceBranch, targetBranch } = req.body;

      if (!sourceBranch || !targetBranch) {
        return res.status(400).json({ error: 'sourceBranch and targetBranch are required' });
      }

      const result = await versionControlService.detectMergeConflicts(
        projectId,
        sourceBranch,
        targetBranch
      );

      res.json(result);
    } catch (error) {
      console.error('Detect merge conflicts error:', error);
      res.status(500).json({
        error: 'Failed to detect merge conflicts',
        details: (error as Error).message,
      });
    }
  });

  // Get merge conflict content
  router.post('/projects/:projectId/merge-conflicts/content', authenticate(pool), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { filePath, sourceBranch, targetBranch } = req.body;

      if (!filePath || !sourceBranch || !targetBranch) {
        return res.status(400).json({
          error: 'filePath, sourceBranch, and targetBranch are required',
        });
      }

      const content = await versionControlService.getMergeConflictContent(
        projectId,
        filePath,
        sourceBranch,
        targetBranch
      );

      res.json(content);
    } catch (error) {
      console.error('Get merge conflict content error:', error);
      res.status(500).json({
        error: 'Failed to get merge conflict content',
        details: (error as Error).message,
      });
    }
  });

  return router;
}
