# User Dashboard Guide

## Overview

The Algo Cloud IDE Dashboard provides a comprehensive interface for managing your cloud development projects, monitoring resource usage, managing API integrations, and configuring account settings.

## Features

### 1. Project Management

#### Overview
The Projects section allows you to manage all your cloud projects in one place with powerful filtering and organization tools.

#### Features:
- **Grid/List View Toggle**: Switch between grid cards and list view for your projects
- **Search and Filters**: Find projects quickly by name, description, or programming language
- **Project Templates**: Start new projects from pre-configured templates:
  - Next.js Starter (TypeScript)
  - React + Vite (JavaScript)
  - FastAPI Backend (Python)
  - Django REST API (Python)
  - And more...
- **Quick Stats**: See deployment status, last edited time, and resource usage at a glance
- **Favorites**: Star important projects for quick access
- **Collaboration**: Share projects and invite team members with role-based permissions:
  - **Viewer**: Read-only access
  - **Editor**: Can edit and deploy
  - **Admin**: Full control including sharing
- **Project Transfer**: Transfer ownership to other users

#### How to Use:

**Creating a New Project:**
1. Click "New Project" button
2. Select a template from the dialog
3. Enter project name
4. Click "Use Template"

**Filtering Projects:**
- Use the search bar to filter by name or description
- Use the language dropdown to filter by programming language
- Toggle favorites to show only starred projects

**Sharing a Project:**
1. Click the share icon on a project card
2. Enter the collaborator's email
3. Select their role (Viewer, Editor, or Admin)
4. Click "Send Invite"

### 2. Resource Monitoring

#### Overview
Monitor your resource consumption in real-time and track costs across multiple dimensions.

#### Features:
- **Real-time Usage Graphs**: Live monitoring of CPU, memory, storage, and bandwidth
- **Visual Indicators**: Progress bars with color-coded warnings:
  - Green: < 75% usage
  - Yellow: 75-90% usage
  - Red: > 90% usage
- **Billing Breakdown**: Detailed cost analysis by resource type
- **Usage Forecasts**: AI-powered predictions for next billing period
- **Resource Alerts**: Configure thresholds to receive notifications
- **Historical Analytics**: Track usage trends over time

#### Resource Types:
- **CPU**: Percentage-based usage (0-100%)
- **Memory**: Usage in MB/GB with configurable limits
- **Storage**: Disk usage in MB/GB
- **Bandwidth**: Data transfer in MB/GB

#### Billing Information:
- Current period costs broken down by resource type
- Forecasted costs with confidence levels
- Trend indicators (increasing/decreasing/stable)
- Cost breakdown per resource category

#### Setting Up Alerts:
1. Navigate to Resources tab
2. Click "Configure" in the Alerts section
3. Choose resource type
4. Set threshold value or percentage
5. Enable the alert

### 3. API Management

#### Overview
Manage API keys, webhooks, and monitor API usage analytics.

#### API Keys

**Features:**
- Generate scoped API keys for different applications
- View last used timestamps
- Revoke or delete keys anytime
- Scope-based permissions (read, write, deploy)

**Creating an API Key:**
1. Go to API tab → API Keys
2. Click "Create Key"
3. Enter a descriptive name
4. Select permissions (scopes)
5. Set optional expiration date
6. Click "Generate API Key"
7. **Important**: Copy the key immediately (shown only once)

**Security Best Practices:**
- Create separate keys for different environments (dev, staging, production)
- Use minimal required permissions for each key
- Rotate keys regularly
- Never commit keys to version control

#### Webhooks

**Features:**
- Configure webhook endpoints for real-time event notifications
- Subscribe to specific events
- View delivery history and success rates
- Automatic retry mechanism for failed deliveries

**Creating a Webhook:**
1. Go to API tab → Webhooks
2. Click "Add Webhook"
3. Enter webhook name
4. Provide payload URL
5. Select events to subscribe to:
   - deployment.success
   - deployment.failure
   - build.started
   - build.completed
   - resource.alert
6. Click "Create Webhook"
7. Note the webhook secret for signature verification

**Webhook Payload Format:**
```json
{
  "event": "deployment.success",
  "timestamp": "2024-03-15T10:30:00Z",
  "data": {
    "projectId": "123",
    "projectName": "My Project",
    "deploymentUrl": "https://..."
  }
}
```

**Signature Verification:**
Webhooks include an `X-Algo-Signature` header with HMAC-SHA256 signature for verification.

#### API Analytics

**Metrics Tracked:**
- Total requests
- Success rate (%)
- Average response time (ms)
- Requests by endpoint
- Requests by status code
- Timeline of requests

**Use Cases:**
- Monitor API performance
- Identify slow endpoints
- Track error rates
- Optimize API usage

### 4. Account Settings

#### Profile Management

**Editable Fields:**
- Full name
- Email address
- Avatar/profile picture

**Updating Profile:**
1. Go to Settings tab → Profile
2. Edit desired fields
3. Click "Save Changes"

#### Organizations/Teams

**Features:**
- Create and manage organizations
- Invite team members
- Role-based access control:
  - **Owner**: Full control
  - **Admin**: Manage members and projects
  - **Member**: Access shared resources

**Creating an Organization:**
1. Go to Settings → Organizations
2. Click "Create Organization"
3. Enter organization name and slug
4. Add description (optional)
5. Click "Create"

**Inviting Members:**
1. Select organization
2. Click "Manage"
3. Click "Invite Member"
4. Enter email and select role
5. Click "Send Invite"

#### Billing & Payment Methods

**Features:**
- Add multiple payment methods
- Set default payment method
- View invoice history
- Download invoices as PDF

**Adding a Payment Method:**
1. Go to Settings → Billing
2. Click "Add Method"
3. Enter payment details
4. Click "Save"

**Viewing Invoices:**
- All invoices are listed with date, amount, and status
- Download individual invoices as PDF
- Filter by payment status (paid, open, overdue)

#### Notification Preferences

**Email Notifications:**
- Deployment success/failure
- Resource usage alerts
- Billing updates
- Security notifications

**Slack Integration:**
1. Create a Slack webhook URL
2. Go to Settings → Notifications
3. Paste webhook URL
4. Enable Slack notifications
5. Click "Save Preferences"

#### Security Settings

**Two-Factor Authentication (2FA):**
1. Go to Settings → Security
2. Click "Enable 2FA"
3. Scan QR code with authenticator app
4. Enter verification code
5. Save backup codes securely
6. Click "Enable"

**SSH Key Management:**

**Adding SSH Key:**
1. Generate SSH key pair locally:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
2. Copy public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
3. Go to Settings → Security → SSH Keys
4. Click "Add SSH Key"
5. Paste public key
6. Enter descriptive name
7. Click "Add"

**Using SSH Keys:**
```bash
git clone git@algo.example.com:username/project.git
```

**Personal Access Tokens:**

**Creating a Token:**
1. Go to Settings → Tokens
2. Click "Generate Token"
3. Enter token name
4. Select scopes
5. Set optional expiration
6. Click "Generate"
7. **Copy token immediately** (shown only once)

**Using Tokens:**
```bash
# With curl
curl -H "Authorization: Bearer pat_..." https://api.algo.example.com/projects

# With CLI
algo-cli login --token pat_...
```

## Real-time Features

### Live Resource Monitoring
The dashboard automatically updates resource metrics every few seconds when connected via WebSocket.

### Notification System
Receive in-app notifications for:
- Deployment status changes
- Resource threshold alerts
- Webhook delivery failures
- Security events

### Deployment Status
Watch live deployment progress without refreshing the page.

## API Integration

### Base URL
```
https://api.algo.example.com
```

### Authentication
All API requests require authentication via:
- API Key in header: `X-API-Key: algo_sk_...`
- Personal Access Token: `Authorization: Bearer pat_...`

### Example Requests

**List Projects:**
```bash
curl -H "X-API-Key: your_api_key" \
  https://api.algo.example.com/api/dashboard/projects/projects
```

**Get Current Resource Usage:**
```bash
curl -H "X-API-Key: your_api_key" \
  https://api.algo.example.com/api/dashboard/resources/usage/current
```

**Create Webhook:**
```bash
curl -X POST \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Deploy Hook",
    "url": "https://example.com/webhook",
    "events": ["deployment.success"]
  }' \
  https://api.algo.example.com/api/dashboard/api/webhooks
```

## Troubleshooting

### Common Issues

**Cannot connect to WebSocket:**
- Check if backend server is running
- Verify CORS settings
- Check browser console for errors

**API key not working:**
- Ensure key is active (not revoked)
- Check if key has expired
- Verify correct scopes for the operation

**Resource metrics not updating:**
- Check WebSocket connection status
- Verify subscription to resource updates
- Check if metrics are being recorded

**2FA issues:**
- Use backup codes if you lost access to authenticator
- Contact support to reset 2FA

### Getting Help

- Documentation: https://docs.algo.example.com
- Support: support@algo.example.com
- Community: https://community.algo.example.com

## Best Practices

1. **Security**
   - Enable 2FA on your account
   - Rotate API keys regularly
   - Use scoped permissions (principle of least privilege)
   - Never share credentials

2. **Resource Management**
   - Set up resource alerts before hitting limits
   - Monitor billing forecasts
   - Clean up unused projects

3. **API Usage**
   - Implement proper error handling
   - Respect rate limits
   - Use webhooks for event-driven architecture
   - Cache responses when appropriate

4. **Collaboration**
   - Use organizations for team projects
   - Assign appropriate roles to team members
   - Use project sharing for external collaborators
   - Document shared project conventions

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + N`: New project
- `Ctrl/Cmd + ,`: Open settings
- `Esc`: Close dialogs

## Updates and Changelog

The dashboard is continuously improved. Check the changelog for new features and updates.
