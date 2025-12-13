// Team Collaboration and Productivity Types

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatar_url?: string;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type OrganizationRole = 'owner' | 'admin' | 'developer' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'suspended';

export interface OrganizationMember {
  id: number;
  organization_id: number;
  user_id: number;
  role: OrganizationRole;
  invited_by?: number;
  invited_at: Date;
  joined_at?: Date;
  status: MemberStatus;
}

export interface ProjectPermissions {
  id: number;
  project_id: number;
  organization_id?: number;
  user_id?: number;
  permissions: {
    read: boolean;
    write: boolean;
    deploy: boolean;
    admin: boolean;
  };
  granted_by?: number;
  granted_at: Date;
  expires_at?: Date;
}

export interface TeamActivityLog {
  id: number;
  organization_id?: number;
  project_id?: number;
  user_id?: number;
  activity_type: string;
  resource_type?: string;
  resource_id?: number;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: Date;
}

export type EnvVariableScope = 'organization' | 'project';

export interface SharedEnvVariable {
  id: number;
  organization_id?: number;
  project_id?: number;
  key: string;
  value: string;
  encrypted: boolean;
  scope: EnvVariableScope;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
  last_accessed_at?: Date;
  access_count: number;
}

export type SessionType = 'editing' | 'terminal' | 'debugging' | 'voice' | 'video';

export interface CollaborationSession {
  id: number;
  project_id: number;
  session_name?: string;
  session_type: SessionType;
  started_by?: number;
  started_at: Date;
  ended_at?: Date;
  is_active: boolean;
  settings: Record<string, any>;
  recording_url?: string;
}

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface UserPresence {
  id: number;
  user_id: number;
  project_id?: number;
  session_id: string;
  status: PresenceStatus;
  current_file?: string;
  cursor_position?: {
    line: number;
    column: number;
  };
  last_activity: Date;
  connection_info?: Record<string, any>;
}

export interface CodeComment {
  id: number;
  project_id: number;
  file_path: string;
  line_number: number;
  line_end?: number;
  thread_id?: number;
  user_id: number;
  content: string;
  resolved: boolean;
  resolved_by?: number;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CodeCommentMention {
  id: number;
  comment_id: number;
  user_id: number;
  notified: boolean;
  created_at: Date;
}

export type PullRequestStatus = 'open' | 'closed' | 'merged' | 'draft';

export interface PullRequest {
  id: number;
  project_id: number;
  number: number;
  title: string;
  description?: string;
  author_id: number;
  source_branch: string;
  target_branch: string;
  status: PullRequestStatus;
  merge_commit_sha?: string;
  merged_by?: number;
  merged_at?: Date;
  closed_by?: number;
  closed_at?: Date;
  labels: string[];
  milestone?: string;
  created_at: Date;
  updated_at: Date;
}

export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'commented';

export interface PullRequestReview {
  id: number;
  pull_request_id: number;
  reviewer_id: number;
  status: ReviewStatus;
  comment?: string;
  submitted_at: Date;
}

export interface PullRequestReviewComment {
  id: number;
  review_id: number;
  file_path: string;
  line_number: number;
  content: string;
  suggestion?: string;
  resolved: boolean;
  created_at: Date;
}

export interface BranchProtectionRule {
  id: number;
  project_id: number;
  branch_pattern: string;
  require_pull_request: boolean;
  required_approvals: number;
  require_status_checks: boolean;
  required_status_checks: string[];
  require_up_to_date: boolean;
  restrict_push: boolean;
  allowed_push_users: number[];
  require_signed_commits: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DeploymentProtection {
  id: number;
  project_id: number;
  environment: string;
  require_approval: boolean;
  required_approvers: number[];
  approval_timeout: number;
  auto_rollback: boolean;
  protection_rules: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type DeploymentApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface DeploymentApproval {
  id: number;
  project_id: number;
  environment: string;
  deployment_id: string;
  requested_by?: number;
  requested_at: Date;
  status: DeploymentApprovalStatus;
  approved_by?: number;
  approved_at?: Date;
  rejection_reason?: string;
}

export interface TeamBilling {
  id: number;
  organization_id: number;
  billing_period_start: Date;
  billing_period_end: Date;
  total_compute_hours: number;
  total_storage_gb: number;
  total_bandwidth_gb: number;
  total_cost: number;
  currency: string;
  status: string;
  paid_at?: Date;
  created_at: Date;
}

export interface MemberUsage {
  id: number;
  organization_id: number;
  user_id: number;
  project_id?: number;
  date: Date;
  compute_hours: number;
  storage_gb: number;
  bandwidth_gb: number;
  created_at: Date;
}

// WebSocket event types
export interface CollaborationEvent {
  type: 'presence' | 'cursor' | 'comment' | 'edit' | 'terminal' | 'debug';
  userId: number;
  projectId: number;
  data: any;
  timestamp: Date;
}

export interface PresenceUpdate {
  userId: number;
  userName: string;
  status: PresenceStatus;
  currentFile?: string;
  cursorPosition?: { line: number; column: number };
  color?: string;
}

export interface TerminalShareSession {
  sessionId: string;
  projectId: number;
  ownerId: number;
  participants: number[];
  accessControl: 'view-only' | 'interactive';
  isRecording: boolean;
}

export interface DebugSession {
  sessionId: string;
  projectId: number;
  participants: number[];
  breakpoints: Array<{
    file: string;
    line: number;
    condition?: string;
  }>;
  currentState?: any;
}

// Voice/Video chat types
export interface VoiceChatSession {
  sessionId: string;
  projectId: number;
  participants: Array<{
    userId: number;
    userName: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
  }>;
  startedAt: Date;
}

// Request/Response types
export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: OrganizationRole;
}

export interface UpdateMemberRoleRequest {
  role: OrganizationRole;
}

export interface SetProjectPermissionsRequest {
  userId?: number;
  organizationId?: number;
  permissions: {
    read: boolean;
    write: boolean;
    deploy: boolean;
    admin: boolean;
  };
}

export interface CreateCommentRequest {
  filePath: string;
  lineNumber: number;
  lineEnd?: number;
  content: string;
  mentions?: number[];
}

export interface CreatePullRequestRequest {
  title: string;
  description?: string;
  sourceBranch: string;
  targetBranch: string;
  labels?: string[];
  milestone?: string;
}

export interface SubmitReviewRequest {
  status: ReviewStatus;
  comment?: string;
  comments?: Array<{
    filePath: string;
    lineNumber: number;
    content: string;
    suggestion?: string;
  }>;
}

export interface CreateBranchProtectionRequest {
  branchPattern: string;
  requirePullRequest?: boolean;
  requiredApprovals?: number;
  requireStatusChecks?: boolean;
  requiredStatusChecks?: string[];
  requireUpToDate?: boolean;
  restrictPush?: boolean;
  allowedPushUsers?: number[];
  requireSignedCommits?: boolean;
}

export interface RequestDeploymentApprovalRequest {
  deploymentId: string;
  environment: string;
}
