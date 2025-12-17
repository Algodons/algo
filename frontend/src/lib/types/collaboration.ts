// Team Collaboration and Productivity Types - Frontend

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatar_url?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type OrganizationRole = 'owner' | 'admin' | 'developer' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'suspended';

export interface OrganizationMember {
  id: number;
  organization_id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  role: OrganizationRole;
  invited_by?: number;
  invited_at: string;
  joined_at?: string;
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
  granted_at: string;
  expires_at?: string;
}

export interface TeamActivityLog {
  id: number;
  organization_id?: number;
  project_id?: number;
  user_id?: number;
  user_name?: string;
  activity_type: string;
  resource_type?: string;
  resource_id?: number;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
}

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface UserPresence {
  id: number;
  user_id: number;
  user_name: string;
  project_id?: number;
  session_id: string;
  status: PresenceStatus;
  current_file?: string;
  cursor_position?: {
    line: number;
    column: number;
  };
  last_activity: string;
  color?: string;
}

export interface CodeComment {
  id: number;
  project_id: number;
  file_path: string;
  line_number: number;
  line_end?: number;
  thread_id?: number;
  user_id: number;
  user_name?: string;
  content: string;
  resolved: boolean;
  resolved_by?: number;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export type PullRequestStatus = 'open' | 'closed' | 'merged' | 'draft';

export interface PullRequest {
  id: number;
  project_id: number;
  number: number;
  title: string;
  description?: string;
  author_id: number;
  author_name?: string;
  source_branch: string;
  target_branch: string;
  status: PullRequestStatus;
  merge_commit_sha?: string;
  merged_by?: number;
  merged_at?: string;
  closed_by?: number;
  closed_at?: string;
  labels: string[];
  milestone?: string;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'commented';

export interface PullRequestReview {
  id: number;
  pull_request_id: number;
  reviewer_id: number;
  reviewer_name?: string;
  status: ReviewStatus;
  comment?: string;
  submitted_at: string;
}

export interface TeamBilling {
  id: number;
  organization_id: number;
  billing_period_start: string;
  billing_period_end: string;
  total_compute_hours: number;
  total_storage_gb: number;
  total_bandwidth_gb: number;
  total_cost: number;
  currency: string;
  status: string;
  paid_at?: string;
  created_at: string;
}

export interface MemberUsage {
  user_id: number;
  user_name?: string;
  compute_hours: number;
  storage_gb: number;
  bandwidth_gb: number;
  total_cost: number;
}

// Request types
export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: OrganizationRole;
}

export interface CreatePullRequestRequest {
  title: string;
  description?: string;
  sourceBranch: string;
  targetBranch: string;
  labels?: string[];
  milestone?: string;
}
