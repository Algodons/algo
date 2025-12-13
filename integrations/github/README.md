# GitHub Integration

OAuth and webhook integration for GitHub repositories.

## Features

- OAuth 2.0 authentication
- Repository synchronization
- Webhook support for push, pull request, and issue events
- Automatic deployment triggers
- Status updates on commits

## Setup

1. Create a GitHub OAuth App at https://github.com/settings/developers
2. Set the callback URL to `https://your-domain.com/api/integrations/github/callback`
3. Add environment variables:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

## OAuth Flow

1. User clicks "Connect GitHub"
2. Redirected to GitHub authorization page
3. User grants permissions
4. Redirected back with authorization code
5. Exchange code for access token
6. Store token and associate with user

## Webhook Events

The integration handles the following webhook events:

- `push` - Trigger deployment on push to main branch
- `pull_request` - Create preview deployment for PRs
- `issues` - Sync issues to project management
- `release` - Trigger production deployment

## API Methods

```typescript
// Get authorization URL
const authUrl = github.getAuthorizationUrl(userId);

// Handle OAuth callback
const tokens = await github.handleCallback(code);

// List repositories
const repos = await github.listRepositories(accessToken);

// Clone repository
await github.cloneRepository(accessToken, repoUrl, projectId);

// Setup webhook
await github.setupWebhook(accessToken, repoName, webhookUrl);
```

## Permissions Required

- `repo` - Full access to repositories
- `read:user` - Read user profile data
- `write:repo_hook` - Create webhooks
