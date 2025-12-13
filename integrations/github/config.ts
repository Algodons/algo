export const GITHUB_CONFIG = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  apiUrl: 'https://api.github.com',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  scopes: ['repo', 'read:user', 'write:repo_hook'],
  callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/api/integrations/github/callback',
};

export const GITHUB_EVENTS = {
  PUSH: 'push',
  PULL_REQUEST: 'pull_request',
  ISSUES: 'issues',
  RELEASE: 'release',
  WORKFLOW_RUN: 'workflow_run',
} as const;
