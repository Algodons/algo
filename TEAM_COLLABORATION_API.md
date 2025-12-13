# Team Collaboration API Documentation

Complete API documentation for team productivity, collaboration, and version control features.

## Table of Contents
- [Authentication](#authentication)
- [Team Management](#team-management)
- [Collaboration](#collaboration)
- [Version Control](#version-control)
- [Team Billing](#team-billing)
- [WebSocket Events](#websocket-events)

---

## Authentication

All API endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

---

## Team Management

### Organizations

#### Create Organization
```http
POST /api/teams
Content-Type: application/json

{
  "name": "My Organization",
  "slug": "my-org",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "organization": {
    "id": 1,
    "name": "My Organization",
    "slug": "my-org",
    "description": "Optional description",
    "settings": {},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get User's Organizations
```http
GET /api/teams
```

**Response:**
```json
{
  "organizations": [
    {
      "id": 1,
      "name": "My Organization",
      "slug": "my-org",
      "description": "Optional description",
      "settings": {},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Organization by ID
```http
GET /api/teams/:organizationId
```

**Response:**
```json
{
  "organization": {
    "id": 1,
    "name": "My Organization",
    "slug": "my-org",
    "description": "Optional description",
    "settings": {},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### Members

#### Invite Member
```http
POST /api/teams/:organizationId/members
Content-Type: application/json

{
  "email": "user@example.com",
  "role": "developer"
}
```

Roles: `owner`, `admin`, `developer`, `viewer`

**Response:**
```json
{
  "member": {
    "id": 1,
    "organization_id": 1,
    "user_id": 2,
    "role": "developer",
    "invited_by": 1,
    "invited_at": "2024-01-01T00:00:00Z",
    "status": "pending"
  }
}
```

#### Accept Invitation
```http
POST /api/teams/:organizationId/accept
```

**Response:**
```json
{
  "message": "Invitation accepted"
}
```

#### Get Organization Members
```http
GET /api/teams/:organizationId/members
```

**Response:**
```json
{
  "members": [
    {
      "id": 1,
      "organization_id": 1,
      "user_id": 1,
      "role": "owner",
      "status": "active",
      "email": "owner@example.com",
      "user_name": "John Doe",
      "avatar_url": "https://example.com/avatar.jpg"
    }
  ]
}
```

#### Update Member Role
```http
PATCH /api/teams/:organizationId/members/:userId
Content-Type: application/json

{
  "role": "admin"
}
```

**Response:**
```json
{
  "message": "Member role updated"
}
```

#### Remove Member
```http
DELETE /api/teams/:organizationId/members/:userId
```

**Response:**
```json
{
  "message": "Member removed"
}
```

### Project Permissions

#### Set Project Permissions
```http
POST /api/teams/projects/:projectId/permissions
Content-Type: application/json

{
  "userId": 2,
  "permissions": {
    "read": true,
    "write": true,
    "deploy": false,
    "admin": false
  }
}
```

Or for organization-wide permissions:
```json
{
  "organizationId": 1,
  "permissions": {
    "read": true,
    "write": true,
    "deploy": true,
    "admin": false
  }
}
```

**Response:**
```json
{
  "permissions": {
    "id": 1,
    "project_id": 1,
    "user_id": 2,
    "permissions": {
      "read": true,
      "write": true,
      "deploy": false,
      "admin": false
    },
    "granted_by": 1,
    "granted_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Check Project Permission
```http
GET /api/teams/projects/:projectId/permissions/check?permission=write
```

**Response:**
```json
{
  "hasPermission": true
}
```

### Activity Feed

#### Get Activity Feed
```http
GET /api/teams/:organizationId/activity?limit=50&offset=0
```

**Response:**
```json
{
  "activities": [
    {
      "id": 1,
      "organization_id": 1,
      "user_id": 1,
      "activity_type": "member_invited",
      "details": {
        "invitedUserId": 2,
        "role": "developer"
      },
      "created_at": "2024-01-01T00:00:00Z",
      "user_name": "John Doe",
      "user_email": "john@example.com"
    }
  ]
}
```

### Shared Environment Variables

#### Set Environment Variable
```http
POST /api/teams/:organizationId/env-variables
Content-Type: application/json

{
  "key": "API_KEY",
  "value": "secret_value",
  "encrypt": true
}
```

**Response:**
```json
{
  "variable": {
    "id": 1,
    "organization_id": 1,
    "key": "API_KEY",
    "value": "[ENCRYPTED]",
    "encrypted": true,
    "scope": "organization",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Environment Variables
```http
GET /api/teams/:organizationId/env-variables?decrypt=true
```

**Response:**
```json
{
  "variables": [
    {
      "id": 1,
      "organization_id": 1,
      "key": "API_KEY",
      "value": "secret_value",
      "encrypted": true,
      "scope": "organization",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Delete Environment Variable
```http
DELETE /api/teams/:organizationId/env-variables/:variableId
```

**Response:**
```json
{
  "message": "Environment variable deleted"
}
```

---

## Collaboration

### Sessions

#### Create Collaboration Session
```http
POST /api/collaboration/sessions
Content-Type: application/json

{
  "projectId": 1,
  "sessionType": "editing",
  "sessionName": "Main Feature Development"
}
```

Session types: `editing`, `terminal`, `debugging`, `voice`, `video`

**Response:**
```json
{
  "session": {
    "id": 1,
    "project_id": 1,
    "session_type": "editing",
    "session_name": "Main Feature Development",
    "started_by": 1,
    "started_at": "2024-01-01T00:00:00Z",
    "is_active": true,
    "settings": {}
  }
}
```

#### End Session
```http
POST /api/collaboration/sessions/:sessionId/end
```

**Response:**
```json
{
  "message": "Session ended"
}
```

#### Get Active Sessions
```http
GET /api/collaboration/projects/:projectId/sessions
```

**Response:**
```json
{
  "sessions": [
    {
      "id": 1,
      "project_id": 1,
      "session_type": "editing",
      "started_by": 1,
      "started_by_name": "John Doe",
      "started_at": "2024-01-01T00:00:00Z",
      "is_active": true
    }
  ]
}
```

### Presence

#### Update User Presence
```http
POST /api/collaboration/presence
Content-Type: application/json

{
  "projectId": 1,
  "sessionId": "socket-id-123",
  "status": "online",
  "currentFile": "/src/index.ts",
  "cursorPosition": {
    "line": 10,
    "column": 5
  }
}
```

**Response:**
```json
{
  "presence": {
    "id": 1,
    "user_id": 1,
    "project_id": 1,
    "session_id": "socket-id-123",
    "status": "online",
    "current_file": "/src/index.ts",
    "cursor_position": {
      "line": 10,
      "column": 5
    },
    "last_activity": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Active Users
```http
GET /api/collaboration/projects/:projectId/users
```

**Response:**
```json
{
  "users": [
    {
      "userId": 1,
      "userName": "John Doe",
      "status": "online",
      "currentFile": "/src/index.ts",
      "cursorPosition": {
        "line": 10,
        "column": 5
      },
      "color": "#FF6B6B"
    }
  ]
}
```

#### Remove Presence
```http
DELETE /api/collaboration/presence/:sessionId
```

### Code Comments

#### Create Comment
```http
POST /api/collaboration/comments
Content-Type: application/json

{
  "projectId": 1,
  "filePath": "/src/index.ts",
  "lineNumber": 10,
  "lineEnd": 15,
  "content": "This function needs optimization",
  "mentions": [2, 3]
}
```

**Response:**
```json
{
  "comment": {
    "id": 1,
    "project_id": 1,
    "file_path": "/src/index.ts",
    "line_number": 10,
    "line_end": 15,
    "user_id": 1,
    "content": "This function needs optimization",
    "resolved": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Reply to Comment
```http
POST /api/collaboration/comments/:commentId/replies
Content-Type: application/json

{
  "content": "I'll work on this today",
  "mentions": [1]
}
```

**Response:**
```json
{
  "reply": {
    "id": 2,
    "thread_id": 1,
    "user_id": 2,
    "content": "I'll work on this today",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Resolve Comment
```http
POST /api/collaboration/comments/:commentId/resolve
```

**Response:**
```json
{
  "message": "Comment resolved"
}
```

#### Get File Comments
```http
GET /api/collaboration/projects/:projectId/files/:filePath/comments
```

**Response:**
```json
{
  "comments": [
    {
      "id": 1,
      "file_path": "/src/index.ts",
      "line_number": 10,
      "content": "This function needs optimization",
      "user_name": "John Doe",
      "resolved": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Project Comments
```http
GET /api/collaboration/projects/:projectId/comments?resolved=false
```

**Response:**
```json
{
  "comments": [
    {
      "id": 1,
      "file_path": "/src/index.ts",
      "line_number": 10,
      "content": "This function needs optimization",
      "user_name": "John Doe",
      "resolved": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Get Comment Thread
```http
GET /api/collaboration/comments/:commentId/thread
```

**Response:**
```json
{
  "thread": [
    {
      "id": 1,
      "content": "This function needs optimization",
      "user_name": "John Doe",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "thread_id": 1,
      "content": "I'll work on this today",
      "user_name": "Jane Smith",
      "created_at": "2024-01-01T00:01:00Z"
    }
  ]
}
```

---

## Version Control

### Pull Requests

#### Create Pull Request
```http
POST /api/version-control/projects/:projectId/pull-requests
Content-Type: application/json

{
  "title": "Add new feature",
  "description": "This PR adds...",
  "sourceBranch": "feature/new-feature",
  "targetBranch": "main",
  "labels": ["feature", "enhancement"],
  "milestone": "v1.0"
}
```

**Response:**
```json
{
  "pullRequest": {
    "id": 1,
    "project_id": 1,
    "number": 1,
    "title": "Add new feature",
    "author_id": 1,
    "source_branch": "feature/new-feature",
    "target_branch": "main",
    "status": "open",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Pull Request
```http
GET /api/version-control/projects/:projectId/pull-requests/:prNumber
```

**Response:**
```json
{
  "pullRequest": {
    "id": 1,
    "number": 1,
    "title": "Add new feature",
    "description": "This PR adds...",
    "author_id": 1,
    "author_name": "John Doe",
    "source_branch": "feature/new-feature",
    "target_branch": "main",
    "status": "open",
    "labels": ["feature", "enhancement"],
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Pull Requests
```http
GET /api/version-control/projects/:projectId/pull-requests?status=open
```

**Response:**
```json
{
  "pullRequests": [
    {
      "id": 1,
      "number": 1,
      "title": "Add new feature",
      "author_name": "John Doe",
      "status": "open",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Submit Review
```http
POST /api/version-control/pull-requests/:pullRequestId/reviews
Content-Type: application/json

{
  "status": "approved",
  "comment": "Looks good!",
  "comments": [
    {
      "filePath": "/src/index.ts",
      "lineNumber": 10,
      "content": "Consider using const here",
      "suggestion": "const value = ..."
    }
  ]
}
```

Review statuses: `pending`, `approved`, `changes_requested`, `commented`

**Response:**
```json
{
  "review": {
    "id": 1,
    "pull_request_id": 1,
    "reviewer_id": 2,
    "status": "approved",
    "comment": "Looks good!",
    "submitted_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Reviews
```http
GET /api/version-control/pull-requests/:pullRequestId/reviews
```

**Response:**
```json
{
  "reviews": [
    {
      "id": 1,
      "reviewer_id": 2,
      "reviewer_name": "Jane Smith",
      "status": "approved",
      "comment": "Looks good!",
      "submitted_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Check If PR Can Be Merged
```http
GET /api/version-control/pull-requests/:pullRequestId/can-merge
```

**Response:**
```json
{
  "canMerge": false,
  "reasons": [
    "Requires 2 approvals, has 1",
    "Changes requested by reviewers"
  ]
}
```

#### Merge Pull Request
```http
POST /api/version-control/pull-requests/:pullRequestId/merge
Content-Type: application/json

{
  "strategy": "squash"
}
```

Strategies: `merge`, `squash`, `rebase`

**Response:**
```json
{
  "message": "Pull request merged successfully"
}
```

#### Close Pull Request
```http
POST /api/version-control/pull-requests/:pullRequestId/close
```

**Response:**
```json
{
  "message": "Pull request closed"
}
```

### Branch Protection

#### Create Branch Protection Rule
```http
POST /api/version-control/projects/:projectId/branch-protection
Content-Type: application/json

{
  "branchPattern": "main",
  "requirePullRequest": true,
  "requiredApprovals": 2,
  "requireStatusChecks": true,
  "requiredStatusChecks": ["ci", "tests"],
  "requireUpToDate": true,
  "restrictPush": true,
  "allowedPushUsers": [1, 2],
  "requireSignedCommits": false
}
```

**Response:**
```json
{
  "rule": {
    "id": 1,
    "project_id": 1,
    "branch_pattern": "main",
    "require_pull_request": true,
    "required_approvals": 2,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Branch Protection Rules
```http
GET /api/version-control/projects/:projectId/branch-protection
```

**Response:**
```json
{
  "rules": [
    {
      "id": 1,
      "branch_pattern": "main",
      "require_pull_request": true,
      "required_approvals": 2
    }
  ]
}
```

#### Delete Branch Protection Rule
```http
DELETE /api/version-control/branch-protection/:ruleId
```

**Response:**
```json
{
  "message": "Branch protection rule deleted"
}
```

### Deployment Protection

#### Create Deployment Protection
```http
POST /api/version-control/projects/:projectId/deployment-protection
Content-Type: application/json

{
  "environment": "production",
  "requireApproval": true,
  "requiredApprovers": [1, 2],
  "approvalTimeout": 24,
  "autoRollback": true
}
```

**Response:**
```json
{
  "protection": {
    "id": 1,
    "project_id": 1,
    "environment": "production",
    "require_approval": true,
    "required_approvers": [1, 2],
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Request Deployment Approval
```http
POST /api/version-control/projects/:projectId/deployment-approvals
Content-Type: application/json

{
  "deploymentId": "deploy-123",
  "environment": "production"
}
```

**Response:**
```json
{
  "approval": {
    "id": 1,
    "deployment_id": "deploy-123",
    "environment": "production",
    "status": "pending",
    "requested_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Approve Deployment
```http
POST /api/version-control/deployment-approvals/:approvalId/approve
```

**Response:**
```json
{
  "message": "Deployment approved"
}
```

#### Reject Deployment
```http
POST /api/version-control/deployment-approvals/:approvalId/reject
Content-Type: application/json

{
  "reason": "Failed tests"
}
```

**Response:**
```json
{
  "message": "Deployment rejected"
}
```

#### Get Pending Approvals
```http
GET /api/version-control/projects/:projectId/deployment-approvals/pending
```

**Response:**
```json
{
  "approvals": [
    {
      "id": 1,
      "deployment_id": "deploy-123",
      "environment": "production",
      "status": "pending",
      "requested_by_name": "John Doe",
      "requested_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Merge Conflicts

#### Detect Merge Conflicts
```http
POST /api/version-control/projects/:projectId/merge-conflicts/detect
Content-Type: application/json

{
  "sourceBranch": "feature/new-feature",
  "targetBranch": "main"
}
```

**Response:**
```json
{
  "hasConflicts": true,
  "conflictingFiles": [
    "/src/index.ts",
    "/src/utils.ts"
  ]
}
```

#### Get Merge Conflict Content
```http
POST /api/version-control/projects/:projectId/merge-conflicts/content
Content-Type: application/json

{
  "filePath": "/src/index.ts",
  "sourceBranch": "feature/new-feature",
  "targetBranch": "main"
}
```

**Response:**
```json
{
  "base": "// Base version content",
  "source": "// Source branch content",
  "target": "// Target branch content",
  "conflictMarkers": "// Content with <<<<<<< markers"
}
```

---

## Team Billing

### Usage Tracking

#### Track Usage
```http
POST /api/team-billing/usage
Content-Type: application/json

{
  "organizationId": 1,
  "userId": 1,
  "projectId": 1,
  "computeHours": 2.5,
  "storageGb": 10.0,
  "bandwidthGb": 5.0
}
```

**Response:**
```json
{
  "message": "Usage tracked successfully"
}
```

#### Get Member Usage
```http
GET /api/team-billing/:organizationId/usage?userId=1&startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "usage": [
    {
      "user_id": 1,
      "user_name": "John Doe",
      "project_name": "My Project",
      "date": "2024-01-01",
      "compute_hours": 2.5,
      "storage_gb": 10.0,
      "bandwidth_gb": 5.0
    }
  ]
}
```

#### Get Aggregated Usage by Member
```http
GET /api/team-billing/:organizationId/usage/by-member?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "usage": [
    {
      "userId": 1,
      "userName": "John Doe",
      "totalComputeHours": 50.0,
      "totalStorageGb": 100.0,
      "totalBandwidthGb": 25.0,
      "estimatedCost": 10.50
    }
  ]
}
```

#### Get Aggregated Usage by Project
```http
GET /api/team-billing/:organizationId/usage/by-project?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "usage": [
    {
      "projectId": 1,
      "projectName": "My Project",
      "totalComputeHours": 100.0,
      "totalStorageGb": 200.0,
      "totalBandwidthGb": 50.0,
      "estimatedCost": 21.00
    }
  ]
}
```

### Billing Records

#### Create Billing Record
```http
POST /api/team-billing/:organizationId/billing
Content-Type: application/json

{
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31"
}
```

**Response:**
```json
{
  "billing": {
    "id": 1,
    "organization_id": 1,
    "billing_period_start": "2024-01-01",
    "billing_period_end": "2024-01-31",
    "total_compute_hours": 100.0,
    "total_storage_gb": 200.0,
    "total_bandwidth_gb": 50.0,
    "total_cost": 21.00,
    "currency": "USD",
    "status": "pending"
  }
}
```

#### Get Billing Records
```http
GET /api/team-billing/:organizationId/billing?limit=12
```

**Response:**
```json
{
  "billing": [
    {
      "id": 1,
      "billing_period_start": "2024-01-01",
      "billing_period_end": "2024-01-31",
      "total_cost": 21.00,
      "status": "paid",
      "paid_at": "2024-02-01T00:00:00Z"
    }
  ]
}
```

#### Mark Billing as Paid
```http
POST /api/team-billing/:organizationId/billing/:billingId/paid
```

**Response:**
```json
{
  "message": "Billing marked as paid"
}
```

#### Get Current Billing Cycle
```http
GET /api/team-billing/:organizationId/billing/current
```

**Response:**
```json
{
  "computeHours": 25.0,
  "storageGb": 50.0,
  "bandwidthGb": 10.0,
  "estimatedCost": 5.50,
  "periodStart": "2024-01-01T00:00:00Z",
  "periodEnd": "2024-01-31T23:59:59Z"
}
```

#### Get Usage Trend
```http
GET /api/team-billing/:organizationId/usage/trend?days=30
```

**Response:**
```json
{
  "trend": [
    {
      "date": "2024-01-01",
      "computeHours": 2.5,
      "storageGb": 10.0,
      "bandwidthGb": 5.0
    },
    {
      "date": "2024-01-02",
      "computeHours": 3.0,
      "storageGb": 10.0,
      "bandwidthGb": 6.0
    }
  ]
}
```

---

## WebSocket Events

### Connection

Connect to the Socket.IO server:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: '<jwt_token>'
  }
});
```

### Collaboration Events

#### Join Project
```javascript
socket.emit('collaboration:join-project', {
  projectId: 1,
  userId: 1,
  userName: 'John Doe'
});

socket.on('collaboration:user-joined', (data) => {
  console.log('User joined:', data.userName);
});

socket.on('collaboration:active-users', (data) => {
  console.log('Active users:', data.users);
});
```

#### Leave Project
```javascript
socket.emit('collaboration:leave-project', {
  projectId: 1,
  userId: 1
});

socket.on('collaboration:user-left', (data) => {
  console.log('User left:', data.userId);
});
```

#### Cursor Updates
```javascript
// Send cursor position
socket.emit('collaboration:cursor-update', {
  projectId: 1,
  userId: 1,
  filePath: '/src/index.ts',
  cursorPosition: { line: 10, column: 5 }
});

// Receive cursor updates from others
socket.on('collaboration:cursor-update', (data) => {
  console.log('Cursor update:', data);
});
```

#### File Events
```javascript
// Notify when opening a file
socket.emit('collaboration:file-opened', {
  projectId: 1,
  userId: 1,
  filePath: '/src/index.ts'
});

socket.on('collaboration:file-opened', (data) => {
  console.log('File opened:', data.filePath);
});
```

#### Comments
```javascript
// Notify about new comment
socket.emit('collaboration:comment-added', {
  projectId: 1,
  comment: { /* comment object */ }
});

socket.on('collaboration:comment-added', (data) => {
  console.log('New comment:', data.comment);
});

// Notify about resolved comment
socket.emit('collaboration:comment-resolved', {
  projectId: 1,
  commentId: 1
});

socket.on('collaboration:comment-resolved', (data) => {
  console.log('Comment resolved:', data.commentId);
});
```

#### Terminal Sharing
```javascript
// Start terminal sharing
socket.emit('terminal:share-start', {
  sessionId: 'terminal-123',
  projectId: 1,
  userId: 1,
  accessControl: 'view-only' // or 'interactive'
});

socket.on('terminal:share-started', (data) => {
  console.log('Terminal sharing started:', data.sessionId);
});

// Join terminal session
socket.emit('terminal:share-join', {
  sessionId: 'terminal-123',
  userId: 2
});

socket.on('terminal:participant-joined', (data) => {
  console.log('Participant joined terminal:', data.userId);
});

// Send terminal data
socket.emit('terminal:share-data', {
  sessionId: 'terminal-123',
  data: 'ls -la\n'
});

socket.on('terminal:share-data', (data) => {
  console.log('Terminal data:', data.data);
});

// End terminal sharing
socket.emit('terminal:share-end', {
  sessionId: 'terminal-123',
  userId: 1
});

socket.on('terminal:share-ended', (data) => {
  console.log('Terminal sharing ended');
});
```

#### Debug Sessions
```javascript
// Start debug session
socket.emit('debug:session-start', {
  sessionId: 'debug-123',
  projectId: 1,
  userId: 1
});

socket.on('debug:session-started', (data) => {
  console.log('Debug session started');
});

// Update breakpoints
socket.emit('debug:breakpoint-update', {
  sessionId: 'debug-123',
  breakpoints: [
    { file: '/src/index.ts', line: 10, condition: 'x > 5' }
  ]
});

socket.on('debug:breakpoint-update', (data) => {
  console.log('Breakpoints updated:', data.breakpoints);
});

// Update debug state
socket.emit('debug:state-update', {
  sessionId: 'debug-123',
  state: { /* current debug state */ }
});

socket.on('debug:state-update', (data) => {
  console.log('Debug state:', data.state);
});
```

#### Voice/Video Chat
```javascript
// Start voice session
socket.emit('voice:session-start', {
  sessionId: 'voice-123',
  projectId: 1,
  userId: 1
});

socket.on('voice:session-started', (data) => {
  console.log('Voice session started');
});

// Update media state
socket.emit('voice:media-update', {
  sessionId: 'voice-123',
  userId: 1,
  media: {
    isAudioEnabled: true,
    isVideoEnabled: false,
    isScreenSharing: false
  }
});

socket.on('voice:media-update', (data) => {
  console.log('Media state updated:', data);
});

// WebRTC signaling
socket.emit('voice:signal', {
  sessionId: 'voice-123',
  targetUserId: 2,
  signal: { /* WebRTC signal data */ }
});

socket.on('voice:signal', (data) => {
  console.log('Received signal from:', data.fromUserId);
  // Handle WebRTC signaling
});
```

#### Heartbeat
```javascript
// Send heartbeat to keep presence alive
setInterval(() => {
  socket.emit('collaboration:heartbeat', {
    projectId: 1,
    userId: 1
  });
}, 30000); // Every 30 seconds
```

---

## Error Handling

All API endpoints return error responses in the following format:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse. WebSocket connections are also monitored for excessive message rates.

Default limits:
- API: 100 requests per minute per user
- WebSocket: 1000 messages per minute per connection

---

## Security Considerations

1. **Authentication**: All API endpoints require valid JWT tokens
2. **Authorization**: Role-based access control (RBAC) is enforced
3. **Encryption**: Sensitive data (environment variables) are encrypted at rest using AES-256-CBC
4. **Input Validation**: All inputs are validated and sanitized
5. **SQL Injection**: All queries use parameterized statements
6. **XSS Protection**: Content is properly escaped
7. **Rate Limiting**: Prevents abuse and DoS attacks
8. **Audit Logging**: All sensitive operations are logged

---

## Pricing

Example pricing (configurable):
- Compute: $0.10 per hour
- Storage: $0.02 per GB
- Bandwidth: $0.05 per GB

---

## Support

For API support or questions, contact the development team or file an issue in the repository.
