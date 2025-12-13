-- Team Collaboration and Productivity Features Schema
-- PostgreSQL 15+

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization member roles: owner, admin, developer, viewer
CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
    invited_by INTEGER REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    UNIQUE(organization_id, user_id)
);

-- Project permissions: read, write, deploy, admin
CREATE TABLE IF NOT EXISTS project_permissions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permissions JSONB NOT NULL DEFAULT '{"read": false, "write": false, "deploy": false, "admin": false}',
    granted_by INTEGER REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    CONSTRAINT user_or_org_required CHECK (
        (organization_id IS NOT NULL AND user_id IS NULL) OR
        (organization_id IS NULL AND user_id IS NOT NULL)
    )
);

-- Team activity logs
CREATE TABLE IF NOT EXISTS team_activity_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shared environment variables (encrypted)
CREATE TABLE IF NOT EXISTS shared_env_variables (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    encrypted BOOLEAN DEFAULT true,
    scope VARCHAR(50) DEFAULT 'project' CHECK (scope IN ('organization', 'project')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    CONSTRAINT scope_reference CHECK (
        (scope = 'organization' AND organization_id IS NOT NULL) OR
        (scope = 'project' AND project_id IS NOT NULL)
    )
);

-- Collaboration sessions
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_name VARCHAR(255),
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('editing', 'terminal', 'debugging', 'voice', 'video')),
    started_by INTEGER REFERENCES users(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    recording_url VARCHAR(500)
);

-- User presence tracking
CREATE TABLE IF NOT EXISTS user_presence (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
    current_file VARCHAR(500),
    cursor_position JSONB,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    connection_info JSONB,
    UNIQUE(user_id, session_id)
);

-- Code comments
CREATE TABLE IF NOT EXISTS code_comments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    line_number INTEGER NOT NULL,
    line_end INTEGER,
    thread_id INTEGER REFERENCES code_comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    resolved BOOLEAN DEFAULT false,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Code comment mentions
CREATE TABLE IF NOT EXISTS code_comment_mentions (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES code_comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pull requests
CREATE TABLE IF NOT EXISTS pull_requests (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    author_id INTEGER NOT NULL REFERENCES users(id),
    source_branch VARCHAR(255) NOT NULL,
    target_branch VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'merged', 'draft')),
    merge_commit_sha VARCHAR(255),
    merged_by INTEGER REFERENCES users(id),
    merged_at TIMESTAMP,
    closed_by INTEGER REFERENCES users(id),
    closed_at TIMESTAMP,
    labels JSONB DEFAULT '[]',
    milestone VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, number)
);

-- PR reviews
CREATE TABLE IF NOT EXISTS pr_reviews (
    id SERIAL PRIMARY KEY,
    pull_request_id INTEGER NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'changes_requested', 'commented')),
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PR review comments
CREATE TABLE IF NOT EXISTS pr_review_comments (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES pr_reviews(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    line_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    suggestion TEXT,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branch protection rules
CREATE TABLE IF NOT EXISTS branch_protection_rules (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    branch_pattern VARCHAR(255) NOT NULL,
    require_pull_request BOOLEAN DEFAULT false,
    required_approvals INTEGER DEFAULT 0,
    require_status_checks BOOLEAN DEFAULT false,
    required_status_checks JSONB DEFAULT '[]',
    require_up_to_date BOOLEAN DEFAULT false,
    restrict_push BOOLEAN DEFAULT false,
    allowed_push_users JSONB DEFAULT '[]',
    require_signed_commits BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, branch_pattern)
);

-- Deployment protections
CREATE TABLE IF NOT EXISTS deployment_protections (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment VARCHAR(100) NOT NULL,
    require_approval BOOLEAN DEFAULT false,
    required_approvers JSONB DEFAULT '[]',
    approval_timeout INTEGER DEFAULT 24,
    auto_rollback BOOLEAN DEFAULT false,
    protection_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, environment)
);

-- Deployment approvals
CREATE TABLE IF NOT EXISTS deployment_approvals (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment VARCHAR(100) NOT NULL,
    deployment_id VARCHAR(255) NOT NULL,
    requested_by INTEGER REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT
);

-- Team billing
CREATE TABLE IF NOT EXISTS team_billing (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    total_compute_hours DECIMAL(10, 2) DEFAULT 0,
    total_storage_gb DECIMAL(10, 2) DEFAULT 0,
    total_bandwidth_gb DECIMAL(10, 2) DEFAULT 0,
    total_cost DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member usage tracking
CREATE TABLE IF NOT EXISTS member_usage (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    compute_hours DECIMAL(10, 2) DEFAULT 0,
    storage_gb DECIMAL(10, 2) DEFAULT 0,
    bandwidth_gb DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id, project_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status);
CREATE INDEX IF NOT EXISTS idx_project_permissions_project_id ON project_permissions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_permissions_user_id ON project_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_org_id ON team_activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_project_id ON team_activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_created_at ON team_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_shared_env_variables_org_id ON shared_env_variables(organization_id);
CREATE INDEX IF NOT EXISTS idx_shared_env_variables_project_id ON shared_env_variables(project_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_project_id ON collaboration_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active ON collaboration_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_project_id ON user_presence(project_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_session_id ON user_presence(session_id);
CREATE INDEX IF NOT EXISTS idx_code_comments_project_id ON code_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_code_comments_thread_id ON code_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_code_comments_resolved ON code_comments(resolved);
CREATE INDEX IF NOT EXISTS idx_pull_requests_project_id ON pull_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_status ON pull_requests(status);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_pr_id ON pr_reviews(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_reviewer_id ON pr_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_branch_protection_project_id ON branch_protection_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_deployment_protections_project_id ON deployment_protections(project_id);
CREATE INDEX IF NOT EXISTS idx_deployment_approvals_project_id ON deployment_approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_deployment_approvals_status ON deployment_approvals(status);
CREATE INDEX IF NOT EXISTS idx_team_billing_org_id ON team_billing(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_usage_org_id ON member_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_usage_user_id ON member_usage(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_env_variables_updated_at BEFORE UPDATE ON shared_env_variables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_comments_updated_at BEFORE UPDATE ON code_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pull_requests_updated_at BEFORE UPDATE ON pull_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branch_protection_rules_updated_at BEFORE UPDATE ON branch_protection_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployment_protections_updated_at BEFORE UPDATE ON deployment_protections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
