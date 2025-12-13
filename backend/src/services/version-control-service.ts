import { Pool } from 'pg';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import {
  PullRequest,
  PullRequestReview,
  PullRequestReviewComment,
  BranchProtectionRule,
  DeploymentProtection,
  DeploymentApproval,
  CreatePullRequestRequest,
  SubmitReviewRequest,
  CreateBranchProtectionRequest,
  RequestDeploymentApprovalRequest,
  PullRequestStatus,
  ReviewStatus,
} from '../types/collaboration';

/**
 * Service for enhanced version control features
 */
export class VersionControlService {
  constructor(
    private pool: Pool,
    private workspaceDir: string
  ) {}

  /**
   * Get git instance for a project
   */
  private getGit(projectId: number): SimpleGit {
    const projectPath = path.join(this.workspaceDir, projectId.toString());
    return simpleGit(projectPath);
  }

  /**
   * Create pull request
   */
  async createPullRequest(
    projectId: number,
    userId: number,
    data: CreatePullRequestRequest
  ): Promise<PullRequest> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get next PR number for this project
      const numberResult = await client.query(
        'SELECT COALESCE(MAX(number), 0) + 1 as next_number FROM pull_requests WHERE project_id = $1',
        [projectId]
      );
      const prNumber = numberResult.rows[0].next_number;

      // Create PR
      const result = await client.query(
        `INSERT INTO pull_requests (
          project_id, number, title, description, author_id, 
          source_branch, target_branch, status, labels, milestone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          projectId,
          prNumber,
          data.title,
          data.description,
          userId,
          data.sourceBranch,
          data.targetBranch,
          'open',
          JSON.stringify(data.labels || []),
          data.milestone,
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pull request by number
   */
  async getPullRequest(projectId: number, prNumber: number): Promise<PullRequest | null> {
    const result = await this.pool.query(
      `SELECT pr.*, u.name as author_name, u.email as author_email
       FROM pull_requests pr
       INNER JOIN users u ON pr.author_id = u.id
       WHERE pr.project_id = $1 AND pr.number = $2`,
      [projectId, prNumber]
    );
    return result.rows[0] || null;
  }

  /**
   * Get pull requests for a project
   */
  async getPullRequests(
    projectId: number,
    status?: PullRequestStatus
  ): Promise<PullRequest[]> {
    let query = `
      SELECT pr.*, u.name as author_name, u.email as author_email
      FROM pull_requests pr
      INNER JOIN users u ON pr.author_id = u.id
      WHERE pr.project_id = $1
    `;
    const params: any[] = [projectId];

    if (status) {
      query += ` AND pr.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY pr.created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Submit pull request review
   */
  async submitReview(
    pullRequestId: number,
    userId: number,
    data: SubmitReviewRequest
  ): Promise<PullRequestReview> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create review
      const result = await client.query(
        `INSERT INTO pr_reviews (pull_request_id, reviewer_id, status, comment)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [pullRequestId, userId, data.status, data.comment]
      );

      const review = result.rows[0];

      // Add review comments
      if (data.comments && data.comments.length > 0) {
        for (const comment of data.comments) {
          await client.query(
            `INSERT INTO pr_review_comments (review_id, file_path, line_number, content, suggestion)
             VALUES ($1, $2, $3, $4, $5)`,
            [review.id, comment.filePath, comment.lineNumber, comment.content, comment.suggestion]
          );
        }
      }

      await client.query('COMMIT');
      return review;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get reviews for a pull request
   */
  async getReviews(pullRequestId: number): Promise<PullRequestReview[]> {
    const result = await this.pool.query(
      `SELECT pr.*, u.name as reviewer_name, u.email as reviewer_email
       FROM pr_reviews pr
       INNER JOIN users u ON pr.reviewer_id = u.id
       WHERE pr.pull_request_id = $1
       ORDER BY pr.submitted_at DESC`,
      [pullRequestId]
    );
    return result.rows;
  }

  /**
   * Get review comments
   */
  async getReviewComments(reviewId: number): Promise<PullRequestReviewComment[]> {
    const result = await this.pool.query(
      'SELECT * FROM pr_review_comments WHERE review_id = $1 ORDER BY created_at',
      [reviewId]
    );
    return result.rows;
  }

  /**
   * Check if PR can be merged based on branch protection rules
   */
  async canMergePullRequest(pullRequestId: number): Promise<{ canMerge: boolean; reasons: string[] }> {
    const prResult = await this.pool.query(
      'SELECT * FROM pull_requests WHERE id = $1',
      [pullRequestId]
    );

    if (prResult.rows.length === 0) {
      return { canMerge: false, reasons: ['Pull request not found'] };
    }

    const pr = prResult.rows[0];
    const reasons: string[] = [];

    // Check branch protection rules
    const ruleResult = await this.pool.query(
      `SELECT * FROM branch_protection_rules 
       WHERE project_id = $1 AND $2 ~ branch_pattern`,
      [pr.project_id, pr.target_branch]
    );

    if (ruleResult.rows.length === 0) {
      return { canMerge: true, reasons: [] };
    }

    const rule = ruleResult.rows[0];

    // Check if PR required
    if (rule.require_pull_request && pr.status !== 'open') {
      reasons.push('Pull request is not open');
    }

    // Check approvals
    if (rule.required_approvals > 0) {
      const approvalResult = await this.pool.query(
        `SELECT COUNT(*) as approval_count 
         FROM pr_reviews 
         WHERE pull_request_id = $1 AND status = 'approved'`,
        [pullRequestId]
      );

      const approvalCount = parseInt(approvalResult.rows[0].approval_count);
      if (approvalCount < rule.required_approvals) {
        reasons.push(
          `Requires ${rule.required_approvals} approvals, has ${approvalCount}`
        );
      }
    }

    // Check for changes requested
    const changesResult = await this.pool.query(
      `SELECT COUNT(*) as changes_count 
       FROM pr_reviews 
       WHERE pull_request_id = $1 AND status = 'changes_requested'`,
      [pullRequestId]
    );

    if (parseInt(changesResult.rows[0].changes_count) > 0) {
      reasons.push('Changes requested by reviewers');
    }

    return {
      canMerge: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Merge pull request
   */
  async mergePullRequest(
    pullRequestId: number,
    userId: number,
    strategy: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<void> {
    const canMerge = await this.canMergePullRequest(pullRequestId);
    if (!canMerge.canMerge) {
      throw new Error(`Cannot merge: ${canMerge.reasons.join(', ')}`);
    }

    const prResult = await this.pool.query(
      'SELECT * FROM pull_requests WHERE id = $1',
      [pullRequestId]
    );

    if (prResult.rows.length === 0) {
      throw new Error('Pull request not found');
    }

    const pr = prResult.rows[0];
    const git = this.getGit(pr.project_id);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Checkout target branch
      await git.checkout(pr.target_branch);

      // Perform merge based on strategy
      switch (strategy) {
        case 'squash':
          await git.merge(['--squash', pr.source_branch]);
          await git.commit(`Merge PR #${pr.number}: ${pr.title}`);
          break;
        case 'rebase':
          await git.rebase([pr.source_branch]);
          break;
        case 'merge':
        default:
          await git.merge([pr.source_branch, '--no-ff']);
          break;
      }

      // Get merge commit SHA
      const log = await git.log(['-1']);
      const mergeCommitSha = log.latest?.hash;

      // Update PR status
      await client.query(
        `UPDATE pull_requests 
         SET status = 'merged', merged_by = $1, merged_at = CURRENT_TIMESTAMP, merge_commit_sha = $2
         WHERE id = $3`,
        [userId, mergeCommitSha, pullRequestId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      // Try to abort merge
      try {
        await git.merge(['--abort']);
      } catch (abortError) {
        // Ignore abort errors
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close pull request without merging
   */
  async closePullRequest(pullRequestId: number, userId: number): Promise<void> {
    await this.pool.query(
      `UPDATE pull_requests 
       SET status = 'closed', closed_by = $1, closed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [userId, pullRequestId]
    );
  }

  /**
   * Create branch protection rule
   */
  async createBranchProtection(
    projectId: number,
    data: CreateBranchProtectionRequest
  ): Promise<BranchProtectionRule> {
    const result = await this.pool.query(
      `INSERT INTO branch_protection_rules (
        project_id, branch_pattern, require_pull_request, required_approvals,
        require_status_checks, required_status_checks, require_up_to_date,
        restrict_push, allowed_push_users, require_signed_commits
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (project_id, branch_pattern)
      DO UPDATE SET
        require_pull_request = $3,
        required_approvals = $4,
        require_status_checks = $5,
        required_status_checks = $6,
        require_up_to_date = $7,
        restrict_push = $8,
        allowed_push_users = $9,
        require_signed_commits = $10,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        projectId,
        data.branchPattern,
        data.requirePullRequest || false,
        data.requiredApprovals || 0,
        data.requireStatusChecks || false,
        JSON.stringify(data.requiredStatusChecks || []),
        data.requireUpToDate || false,
        data.restrictPush || false,
        JSON.stringify(data.allowedPushUsers || []),
        data.requireSignedCommits || false,
      ]
    );
    return result.rows[0];
  }

  /**
   * Get branch protection rules
   */
  async getBranchProtectionRules(projectId: number): Promise<BranchProtectionRule[]> {
    const result = await this.pool.query(
      'SELECT * FROM branch_protection_rules WHERE project_id = $1',
      [projectId]
    );
    return result.rows;
  }

  /**
   * Delete branch protection rule
   */
  async deleteBranchProtection(ruleId: number): Promise<void> {
    await this.pool.query('DELETE FROM branch_protection_rules WHERE id = $1', [ruleId]);
  }

  /**
   * Create deployment protection
   */
  async createDeploymentProtection(
    projectId: number,
    environment: string,
    data: {
      requireApproval?: boolean;
      requiredApprovers?: number[];
      approvalTimeout?: number;
      autoRollback?: boolean;
      protectionRules?: Record<string, any>;
    }
  ): Promise<DeploymentProtection> {
    const result = await this.pool.query(
      `INSERT INTO deployment_protections (
        project_id, environment, require_approval, required_approvers,
        approval_timeout, auto_rollback, protection_rules
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (project_id, environment)
      DO UPDATE SET
        require_approval = $3,
        required_approvers = $4,
        approval_timeout = $5,
        auto_rollback = $6,
        protection_rules = $7,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        projectId,
        environment,
        data.requireApproval || false,
        JSON.stringify(data.requiredApprovers || []),
        data.approvalTimeout || 24,
        data.autoRollback || false,
        JSON.stringify(data.protectionRules || {}),
      ]
    );
    return result.rows[0];
  }

  /**
   * Request deployment approval
   */
  async requestDeploymentApproval(
    projectId: number,
    userId: number,
    data: RequestDeploymentApprovalRequest
  ): Promise<DeploymentApproval> {
    const result = await this.pool.query(
      `INSERT INTO deployment_approvals (project_id, environment, deployment_id, requested_by, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [projectId, data.environment, data.deploymentId, userId]
    );
    return result.rows[0];
  }

  /**
   * Approve deployment
   */
  async approveDeployment(approvalId: number, userId: number): Promise<void> {
    await this.pool.query(
      `UPDATE deployment_approvals 
       SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'`,
      [userId, approvalId]
    );
  }

  /**
   * Reject deployment
   */
  async rejectDeployment(
    approvalId: number,
    userId: number,
    reason?: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE deployment_approvals 
       SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, rejection_reason = $3
       WHERE id = $2 AND status = 'pending'`,
      [userId, approvalId, reason]
    );
  }

  /**
   * Get pending deployment approvals
   */
  async getPendingApprovals(projectId: number): Promise<DeploymentApproval[]> {
    const result = await this.pool.query(
      `SELECT da.*, u.name as requested_by_name, u.email as requested_by_email
       FROM deployment_approvals da
       LEFT JOIN users u ON da.requested_by = u.id
       WHERE da.project_id = $1 AND da.status = 'pending'
       ORDER BY da.requested_at DESC`,
      [projectId]
    );
    return result.rows;
  }

  /**
   * Detect merge conflicts
   */
  async detectMergeConflicts(
    projectId: number,
    sourceBranch: string,
    targetBranch: string
  ): Promise<{ hasConflicts: boolean; conflictingFiles: string[] }> {
    const git = this.getGit(projectId);

    try {
      // Create a temporary branch to test merge
      const tempBranch = `temp-merge-test-${Date.now()}`;
      await git.checkout(targetBranch);
      await git.checkoutBranch(tempBranch, targetBranch);

      try {
        // Try to merge
        await git.merge([sourceBranch, '--no-commit', '--no-ff']);
        
        // No conflicts
        await git.merge(['--abort']);
        await git.checkout(targetBranch);
        await git.deleteLocalBranch(tempBranch);
        
        return { hasConflicts: false, conflictingFiles: [] };
      } catch (error) {
        // Check for conflicts
        const status = await git.status();
        const conflictingFiles = status.conflicted;

        // Abort merge and cleanup
        try {
          await git.merge(['--abort']);
        } catch (e) {
          // Ignore
        }
        await git.checkout(targetBranch);
        await git.deleteLocalBranch(tempBranch, true);

        return {
          hasConflicts: conflictingFiles.length > 0,
          conflictingFiles,
        };
      }
    } catch (error) {
      throw new Error(`Failed to detect merge conflicts: ${(error as Error).message}`);
    }
  }

  /**
   * Get merge conflict content for a file
   */
  async getMergeConflictContent(
    projectId: number,
    filePath: string,
    sourceBranch: string,
    targetBranch: string
  ): Promise<{
    base: string;
    source: string;
    target: string;
    conflictMarkers: string;
  }> {
    const git = this.getGit(projectId);

    try {
      // Get base version (common ancestor)
      const mergeBase = await git.raw(['merge-base', sourceBranch, targetBranch]);
      const baseCommit = mergeBase.trim();

      // Get file content from each version
      const baseContent = await git.show([`${baseCommit}:${filePath}`]);
      const sourceContent = await git.show([`${sourceBranch}:${filePath}`]);
      const targetContent = await git.show([`${targetBranch}:${filePath}`]);

      // Get conflict markers version (if in conflict state)
      let conflictMarkers = '';
      try {
        const fs = await import('fs/promises');
        const fullPath = path.join(this.workspaceDir, projectId.toString(), filePath);
        conflictMarkers = await fs.readFile(fullPath, 'utf-8');
      } catch (e) {
        // File might not be in conflict state
      }

      return {
        base: baseContent,
        source: sourceContent,
        target: targetContent,
        conflictMarkers,
      };
    } catch (error) {
      throw new Error(`Failed to get merge conflict content: ${(error as Error).message}`);
    }
  }
}
