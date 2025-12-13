# Algo Platform Integrations

This directory contains integrations for various third-party services with the Algo Cloud IDE Platform.

## Available Integrations

### Version Control
- **GitHub** - OAuth integration, repository sync, webhooks
- **GitLab** - OAuth integration, repository sync, webhooks

### Communication
- **Slack** - Notifications, bot commands, slash commands
- **Discord** - Webhooks, bot integration

### Productivity
- **Notion** - Documentation sync, project management
- **Linear** - Issue tracking, project management

### Deployment
- **Vercel** - Migration tools, deployment sync
- **Netlify** - Migration tools, deployment sync

## Integration Architecture

Each integration follows a standard structure:

```
integration-name/
├── README.md           # Integration-specific documentation
├── config.ts           # Configuration and constants
├── oauth.ts            # OAuth flow implementation
├── webhooks.ts         # Webhook handlers
├── api.ts              # API client
└── types.ts            # TypeScript types
```

## OAuth Flow

All OAuth integrations follow the standard OAuth 2.0 flow:

1. User initiates connection
2. Redirect to provider's authorization URL
3. Provider redirects back with authorization code
4. Exchange code for access token
5. Store token securely
6. Use token for API calls

## Webhook Handling

Webhooks are handled through the main webhook service and routed to specific integration handlers.

## Setup

Each integration requires environment variables to be configured:

```env
# GitHub
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# GitLab
GITLAB_CLIENT_ID=your_client_id
GITLAB_CLIENT_SECRET=your_client_secret

# Slack
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret

# Discord
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_WEBHOOK_URL=your_webhook_url

# Notion
NOTION_CLIENT_ID=your_client_id
NOTION_CLIENT_SECRET=your_client_secret

# Linear
LINEAR_CLIENT_ID=your_client_id
LINEAR_CLIENT_SECRET=your_client_secret
```

## Usage Example

```typescript
import { GitHubIntegration } from './github';
import { SlackIntegration } from './slack';

// Initialize integrations
const github = new GitHubIntegration({
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
});

const slack = new SlackIntegration({
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
});

// Start OAuth flow
const authUrl = github.getAuthorizationUrl(userId);

// Handle callback
const tokens = await github.handleCallback(code);

// Use integration
await slack.sendNotification(channelId, 'Deployment completed!');
```

## Adding New Integrations

To add a new integration:

1. Create a new directory with the integration name
2. Implement the standard interface:
   - OAuth flow (if applicable)
   - Webhook handlers (if applicable)
   - API client methods
3. Add configuration to environment variables
4. Document the integration in this README
5. Add routes in the main application

## Security

- All OAuth tokens are encrypted at rest
- Webhook signatures are verified
- API keys are stored securely
- Rate limiting is enforced
- Audit logging is enabled

## Testing

Each integration should include:
- Unit tests for API methods
- Integration tests for OAuth flow
- Webhook handler tests
- Mock data for testing

## Support

For integration-specific issues, refer to the individual integration README files.
