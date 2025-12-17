# Team Collaboration Frontend Components - Implementation Guide

This document describes the frontend UI components implemented for the team collaboration features.

## Overview

The frontend implementation provides a complete set of React components built with Next.js, TypeScript, and Tailwind CSS. All components are designed to work seamlessly with the existing backend API infrastructure.

## Components Implemented

### 1. Organization Management

#### `OrganizationList`
- **Location**: `frontend/src/components/team-collaboration/organizations/organization-list.tsx`
- **Purpose**: Display and manage organizations
- **Features**:
  - List all user's organizations
  - Create new organizations
  - View organization details
  - Navigate to organization settings

#### `TeamMembers`
- **Location**: `frontend/src/components/team-collaboration/organizations/team-members.tsx`
- **Purpose**: Manage team members and roles
- **Features**:
  - Invite new members via email
  - Assign roles (Owner, Admin, Developer, Viewer)
  - Update member roles
  - Remove members
  - View pending invitations

#### `ActivityFeed`
- **Location**: `frontend/src/components/team-collaboration/organizations/activity-feed.tsx`
- **Purpose**: Display team activity stream
- **Features**:
  - Real-time activity updates
  - Categorized activity icons
  - Time-based filtering
  - Activity type filtering

### 2. Real-Time Collaboration

#### `PresenceIndicator`
- **Location**: `frontend/src/components/team-collaboration/presence/presence-indicator.tsx`
- **Purpose**: Show active users with cursor tracking
- **Features**:
  - Live user presence
  - Cursor position tracking
  - Current file indication
  - Status indicators (online/away/offline)
  - User-specific colors
  - Tooltip with detailed information

#### `TerminalSharing`
- **Location**: `frontend/src/components/team-collaboration/presence/terminal-sharing.tsx`
- **Purpose**: Share terminal sessions with team
- **Features**:
  - Start/stop terminal sharing
  - Access control (view-only/interactive)
  - Session recording
  - Participant tracking
  - Session ID sharing

#### `CodeComments`
- **Location**: `frontend/src/components/team-collaboration/comments/code-comments.tsx`
- **Purpose**: In-line code commenting and discussions
- **Features**:
  - Line-specific comments
  - Comment threads
  - Resolve/unresolve comments
  - File and project-level views
  - Filter resolved comments

### 3. Version Control

#### `PullRequestList`
- **Location**: `frontend/src/components/team-collaboration/pull-requests/pull-request-list.tsx`
- **Purpose**: Browse and manage pull requests
- **Features**:
  - List PRs by status (open/closed/all)
  - Visual status indicators
  - Branch visualization
  - Labels and milestones
  - Time-based information

#### `CreatePullRequest`
- **Location**: `frontend/src/components/team-collaboration/pull-requests/create-pull-request.tsx`
- **Purpose**: Create new pull requests
- **Features**:
  - Branch selection (source/target)
  - Visual branch flow
  - Title and description
  - Labels management
  - Milestone assignment
  - Validation

#### `MergeConflictResolver`
- **Location**: `frontend/src/components/team-collaboration/pull-requests/merge-conflict-resolver.tsx`
- **Purpose**: Visual merge conflict resolution
- **Features**:
  - Three-way merge view (base/source/target)
  - Conflict-by-conflict resolution
  - Manual editing option
  - Progress tracking
  - File-level conflict grouping
  - Expandable/collapsible conflicts

### 4. Team Management

#### `ProjectPermissionsManager`
- **Location**: `frontend/src/components/team-collaboration/permissions/project-permissions.tsx`
- **Purpose**: Manage project access permissions
- **Features**:
  - Granular permissions (read/write/deploy/admin)
  - User and organization permissions
  - Permission expiration dates
  - Toggle permissions
  - Permission legend

#### `EnvironmentVariables`
- **Location**: `frontend/src/components/team-collaboration/env-vars/environment-variables.tsx`
- **Purpose**: Manage encrypted environment variables
- **Features**:
  - Add/delete variables
  - Show/hide values
  - Copy to clipboard
  - Scope indicators (org/project)
  - Encryption status
  - Security notices

### 5. Team Billing

#### `TeamBillingDashboard`
- **Location**: `frontend/src/components/team-collaboration/billing/team-billing-dashboard.tsx`
- **Purpose**: Track and visualize team usage and costs
- **Features**:
  - Current billing period overview
  - Cost breakdown by resource type
  - Usage by team member
  - Progress indicators
  - Historical data
  - Currency formatting

## API Client

### `team-api.ts`
- **Location**: `frontend/src/lib/team-api.ts`
- **Purpose**: Centralized API client for all team collaboration endpoints
- **Modules**:
  - `organizationApi`: Organization CRUD operations
  - `memberApi`: Member management
  - `activityApi`: Activity feed
  - `presenceApi`: User presence
  - `commentsApi`: Code comments
  - `pullRequestApi`: Pull request operations
  - `reviewApi`: Code reviews
  - `billingApi`: Billing and usage
  - `permissionsApi`: Permission management

## Type Definitions

### `collaboration.ts`
- **Location**: `frontend/src/lib/types/collaboration.ts`
- **Purpose**: TypeScript type definitions for all collaboration entities
- **Types Included**:
  - Organization and member types
  - Permission types
  - Activity log types
  - Presence and session types
  - Pull request types
  - Billing types
  - Request/response types

## Usage Examples

### Using OrganizationList
```tsx
import { OrganizationList } from '@/components/team-collaboration';

export default function OrganizationsPage() {
  return (
    <div className="container mx-auto p-6">
      <OrganizationList />
    </div>
  );
}
```

### Using PresenceIndicator
```tsx
import { PresenceIndicator } from '@/components/team-collaboration';

export default function EditorPage({ projectId }: { projectId: number }) {
  return (
    <div>
      <PresenceIndicator projectId={projectId} />
      {/* Editor content */}
    </div>
  );
}
```

### Using PullRequestList
```tsx
import { PullRequestList } from '@/components/team-collaboration';

export default function PullRequestsPage({ projectId }: { projectId: number }) {
  return (
    <div className="container mx-auto p-6">
      <PullRequestList projectId={projectId} />
    </div>
  );
}
```

## Integration with Existing Components

The team collaboration components are designed to integrate seamlessly with the existing platform:

1. **Authentication**: All API calls use the existing auth token from localStorage
2. **UI Components**: Built using the same Radix UI and Tailwind CSS as existing components
3. **State Management**: Uses React hooks and local state (can be integrated with Zustand if needed)
4. **Real-time**: Ready for WebSocket integration via Socket.io client

## Styling

All components follow the existing design system:
- **Tailwind CSS** for styling
- **Radix UI** for accessible primitives
- **Lucide Icons** for consistent iconography
- **Responsive design** for all screen sizes
- **Dark mode ready** (via Tailwind CSS classes)

## Next Steps

### To Complete Implementation:

1. **Voice/Video Integration**:
   - Add WebRTC or Agora.io integration
   - Create voice chat UI component
   - Implement screen sharing

2. **Deployment Approval Workflow**:
   - Create deployment approval request UI
   - Add approval/rejection flow
   - Environment-based protection rules UI

3. **Branch Protection Settings**:
   - UI for configuring branch protection rules
   - Status check requirements
   - Required reviewers

4. **Testing**:
   - Unit tests for components
   - Integration tests for API calls
   - E2E tests for complete workflows

5. **Documentation**:
   - Component Storybook
   - User guides
   - API documentation

## File Structure

```
frontend/src/components/team-collaboration/
├── index.ts                          # Main exports
├── billing/
│   └── team-billing-dashboard.tsx    # Billing overview
├── comments/
│   └── code-comments.tsx             # Code commenting
├── env-vars/
│   └── environment-variables.tsx     # Env vars management
├── organizations/
│   ├── organization-list.tsx         # Org listing
│   ├── team-members.tsx              # Member management
│   └── activity-feed.tsx             # Activity stream
├── permissions/
│   └── project-permissions.tsx       # Permission management
├── presence/
│   ├── presence-indicator.tsx        # User presence
│   └── terminal-sharing.tsx          # Terminal sharing
└── pull-requests/
    ├── pull-request-list.tsx         # PR listing
    ├── create-pull-request.tsx       # PR creation
    └── merge-conflict-resolver.tsx   # Conflict resolution

frontend/src/lib/
├── team-api.ts                       # API client
└── types/
    └── collaboration.ts              # TypeScript types
```

## Dependencies

All required dependencies are already in `package.json`:
- `react` and `react-dom`
- `next`
- `typescript`
- `tailwindcss`
- `@radix-ui/*` components
- `lucide-react` for icons
- `axios` for HTTP requests
- `socket.io-client` for WebSocket connections

## Performance Considerations

- **Code splitting**: Components are lazy-loadable
- **API caching**: Consider adding React Query for data caching
- **Optimistic updates**: Some components update UI before API confirmation
- **Polling intervals**: Configurable refresh rates for live data
- **Virtualization**: Consider adding for large lists (activity feed, etc.)

## Security Considerations

- All sensitive data (env vars) are masked by default
- Clipboard operations use secure browser APIs
- Role-based access checks in UI (backend enforces)
- HTTPS-only for production
- Token refresh handling

## Browser Support

Components are compatible with:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

## Accessibility

All components follow WCAG 2.1 Level AA guidelines:
- Keyboard navigation
- Screen reader support
- Focus management
- Color contrast ratios
- ARIA labels

## Contributing

When adding new components:
1. Follow the existing component structure
2. Use TypeScript with proper types
3. Include loading and error states
4. Add proper accessibility attributes
5. Test on multiple screen sizes
6. Update this documentation
