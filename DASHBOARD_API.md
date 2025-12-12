# Dashboard API Documentation

## Base URL
```
http://localhost:4000/api/dashboard
```

## Authentication

All endpoints require authentication using one of the following methods:

### API Key
```http
X-API-Key: algo_sk_your_api_key_here
```

### Personal Access Token
```http
Authorization: Bearer pat_your_token_here
```

## Project Management API

### Get Projects with Stats

```http
GET /projects/projects
```

**Query Parameters:**
- `search` (optional): Search query for project name/description
- `language` (optional): Filter by programming language
- `favorite` (optional): Set to "true" to show only favorites

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "E-commerce Platform",
      "description": "Full-stack online store",
      "language": "TypeScript",
      "deploymentStatus": "running",
      "lastAccessedAt": "2024-03-15T10:30:00Z",
      "isFavorite": true,
      "resourceUsage": {
        "cpu": 45,
        "memory": 512,
        "storage": 1024
      }
    }
  ]
}
```

### Get Project Templates

```http
GET /projects/templates
```

**Query Parameters:**
- `category` (optional): Filter by template category

**Response:**
```json
{
  "templates": [
    {
      "id": 1,
      "name": "Next.js Starter",
      "language": "TypeScript",
      "framework": "Next.js",
      "category": "web"
    }
  ]
}
```

### Create Project from Template

```http
POST /projects/projects/from-template
```

**Request Body:**
```json
{
  "templateId": 1,
  "projectName": "My New Project"
}
```

**Response:**
```json
{
  "project": {
    "id": 123,
    "name": "My New Project",
    "language": "TypeScript",
    "framework": "Next.js"
  }
}
```

### Toggle Project Favorite

```http
POST /projects/projects/:projectId/favorite
```

**Response:**
```json
{
  "isFavorite": true
}
```

### Share Project

```http
POST /projects/projects/:projectId/share
```

**Request Body:**
```json
{
  "email": "collaborator@example.com",
  "role": "editor"
}
```

**Roles:** `viewer`, `editor`, `admin`

**Response:**
```json
{
  "collaborator": {
    "id": 1,
    "userId": 456,
    "role": "editor",
    "status": "pending"
  }
}
```

### Get Project Collaborators

```http
GET /projects/projects/:projectId/collaborators
```

**Response:**
```json
{
  "collaborators": [
    {
      "id": 1,
      "userId": 456,
      "email": "collaborator@example.com",
      "name": "John Doe",
      "role": "editor",
      "status": "accepted"
    }
  ]
}
```

### Accept Collaboration Invite

```http
POST /projects/projects/:projectId/accept-invite
```

**Response:**
```json
{
  "message": "Invitation accepted"
}
```

### Transfer Project

```http
POST /projects/projects/:projectId/transfer
```

**Request Body:**
```json
{
  "newOwnerEmail": "newowner@example.com"
}
```

## Resource Monitoring API

### Get Current Usage

```http
GET /resources/usage/current
```

**Response:**
```json
{
  "usage": {
    "cpu": {
      "current": 45,
      "limit": 100,
      "percentage": 45,
      "unit": "%"
    },
    "memory": {
      "current": 1536,
      "limit": 2048,
      "percentage": 75,
      "unit": "MB"
    },
    "storage": {
      "current": 3584,
      "limit": 10240,
      "percentage": 35,
      "unit": "MB"
    },
    "bandwidth": {
      "current": 25600,
      "limit": 102400,
      "unit": "MB"
    }
  }
}
```

### Get Historical Usage

```http
GET /resources/usage/historical
```

**Query Parameters:**
- `metric` (required): Metric type (cpu, memory, storage, bandwidth)
- `start` (required): Start date (ISO 8601)
- `end` (required): End date (ISO 8601)

**Response:**
```json
{
  "metrics": [
    {
      "id": 1,
      "metricType": "cpu",
      "value": 45,
      "unit": "%",
      "timestamp": "2024-03-15T10:00:00Z"
    }
  ]
}
```

### Get Usage Time Series

```http
GET /resources/usage/timeseries
```

**Query Parameters:**
- `metric` (required): Metric type
- `hours` (optional): Number of hours to fetch (default: 24)

**Response:**
```json
{
  "timeSeries": [
    {
      "timestamp": "2024-03-15T10:00:00Z",
      "value": 45
    }
  ]
}
```

### Record Metric

```http
POST /resources/usage/record
```

**Request Body:**
```json
{
  "projectId": 123,
  "metricType": "cpu",
  "value": 45,
  "unit": "%"
}
```

### Get Billing Breakdown

```http
GET /resources/billing/current
```

**Response:**
```json
{
  "billing": {
    "id": 1,
    "periodStart": "2024-03-01",
    "periodEnd": "2024-03-31",
    "totalCost": 45.67,
    "cpuCost": 12.34,
    "memoryCost": 15.89,
    "storageCost": 8.44,
    "bandwidthCost": 9.00,
    "status": "pending"
  }
}
```

### Get Usage Forecast

```http
GET /resources/usage/forecast
```

**Query Parameters:**
- `metric` (required): Metric type

**Response:**
```json
{
  "forecast": {
    "metricType": "cpu",
    "currentValue": 45,
    "forecastedValue": 52,
    "forecastDate": "2024-04-15T00:00:00Z",
    "confidence": 0.85,
    "trend": "increasing"
  }
}
```

### Create Resource Alert

```http
POST /resources/alerts
```

**Request Body:**
```json
{
  "metricType": "memory",
  "thresholdValue": 1800,
  "thresholdPercentage": 85
}
```

### Get Alerts

```http
GET /resources/alerts
```

**Response:**
```json
{
  "alerts": [
    {
      "id": 1,
      "metricType": "memory",
      "thresholdValue": 1800,
      "thresholdPercentage": 85,
      "isActive": true,
      "lastTriggeredAt": "2024-03-15T10:30:00Z"
    }
  ]
}
```

## API Management API

### Generate API Key

```http
POST /api/api-keys
```

**Request Body:**
```json
{
  "name": "Production API Key",
  "scopes": ["read", "write", "deploy"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "apiKey": {
    "id": 1,
    "name": "Production API Key",
    "keyPrefix": "algo_sk_prod",
    "scopes": ["read", "write", "deploy"],
    "key": "algo_sk_prod_abc123..." // Only shown once!
  }
}
```

### List API Keys

```http
GET /api/api-keys
```

**Response:**
```json
{
  "apiKeys": [
    {
      "id": 1,
      "name": "Production API Key",
      "keyPrefix": "algo_sk_prod",
      "scopes": ["read", "write", "deploy"],
      "lastUsedAt": "2024-03-15T10:30:00Z",
      "isActive": true
    }
  ]
}
```

### Revoke API Key

```http
POST /api/api-keys/:keyId/revoke
```

### Delete API Key

```http
DELETE /api/api-keys/:keyId
```

### Create Webhook

```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "name": "Deploy Notifications",
  "url": "https://hooks.slack.com/services/...",
  "events": ["deployment.success", "deployment.failure"],
  "projectId": 123,
  "isActive": true
}
```

**Response:**
```json
{
  "webhook": {
    "id": 1,
    "name": "Deploy Notifications",
    "url": "https://hooks.slack.com/services/...",
    "events": ["deployment.success", "deployment.failure"],
    "secret": "whsec_abc123...",
    "isActive": true
  }
}
```

### List Webhooks

```http
GET /api/webhooks
```

**Query Parameters:**
- `projectId` (optional): Filter by project

### Update Webhook

```http
PATCH /api/webhooks/:webhookId
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "isActive": false
}
```

### Delete Webhook

```http
DELETE /api/webhooks/:webhookId
```

### Get Webhook Deliveries

```http
GET /api/webhooks/:webhookId/deliveries
```

**Query Parameters:**
- `limit` (optional): Number of deliveries to fetch (default: 50)

**Response:**
```json
{
  "deliveries": [
    {
      "id": 1,
      "eventType": "deployment.success",
      "responseStatus": 200,
      "success": true,
      "deliveredAt": "2024-03-15T10:30:00Z"
    }
  ]
}
```

### Get API Usage Analytics

```http
GET /api/analytics/usage
```

**Query Parameters:**
- `start` (optional): Start date (ISO 8601)
- `end` (optional): End date (ISO 8601)

**Response:**
```json
{
  "analytics": {
    "totalRequests": 15243,
    "successRate": 99.2,
    "averageResponseTime": 145,
    "requestsByEndpoint": [
      {
        "endpoint": "/api/projects",
        "count": 5432,
        "averageResponseTime": 98
      }
    ],
    "requestsByStatus": [
      {
        "statusCode": 200,
        "count": 15123
      }
    ],
    "timeline": [
      {
        "date": "2024-03-15",
        "count": 543
      }
    ]
  }
}
```

## Account Settings API

### Get Profile

```http
GET /settings/profile
```

**Response:**
```json
{
  "profile": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "https://...",
    "role": "user"
  }
}
```

### Update Profile

```http
PATCH /settings/profile
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "avatarUrl": "https://..."
}
```

### Create Organization

```http
POST /settings/organizations
```

**Request Body:**
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "description": "Our company organization"
}
```

### List Organizations

```http
GET /settings/organizations
```

### Get Organization Members

```http
GET /settings/organizations/:orgId/members
```

### Invite Organization Member

```http
POST /settings/organizations/:orgId/invite
```

**Request Body:**
```json
{
  "email": "member@example.com",
  "role": "admin"
}
```

**Roles:** `owner`, `admin`, `member`

### Add Payment Method

```http
POST /settings/payment-methods
```

**Request Body:**
```json
{
  "type": "card",
  "providerPaymentMethodId": "pm_123456",
  "lastFour": "4242",
  "brand": "Visa",
  "expiresAt": "2025-12-31"
}
```

### List Payment Methods

```http
GET /settings/payment-methods
```

### Set Default Payment Method

```http
POST /settings/payment-methods/:methodId/set-default
```

### Delete Payment Method

```http
DELETE /settings/payment-methods/:methodId
```

### List Invoices

```http
GET /settings/invoices
```

**Response:**
```json
{
  "invoices": [
    {
      "id": 1,
      "invoiceNumber": "INV-2024-001",
      "amount": 45.67,
      "currency": "USD",
      "status": "paid",
      "pdfUrl": "https://...",
      "issuedAt": "2024-03-01T00:00:00Z"
    }
  ]
}
```

### Get Invoice

```http
GET /settings/invoices/:invoiceId
```

### Get Notification Preferences

```http
GET /settings/notifications/preferences
```

**Response:**
```json
{
  "preferences": {
    "emailNotifications": true,
    "emailDeploymentSuccess": true,
    "emailDeploymentFailure": true,
    "emailResourceAlerts": true,
    "emailBillingUpdates": true,
    "slackNotifications": false,
    "slackWebhookUrl": null
  }
}
```

### Update Notification Preferences

```http
PATCH /settings/notifications/preferences
```

**Request Body:**
```json
{
  "emailNotifications": true,
  "slackWebhookUrl": "https://hooks.slack.com/..."
}
```

### Setup 2FA

```http
POST /settings/2fa/setup
```

**Response:**
```json
{
  "secret": "base64_secret",
  "backupCodes": ["ABC123", "DEF456", ...]
}
```

### Enable 2FA

```http
POST /settings/2fa/enable
```

**Request Body:**
```json
{
  "code": "123456"
}
```

### Disable 2FA

```http
POST /settings/2fa/disable
```

### Get 2FA Status

```http
GET /settings/2fa/status
```

**Response:**
```json
{
  "isEnabled": true
}
```

### Add SSH Key

```http
POST /settings/ssh-keys
```

**Request Body:**
```json
{
  "name": "Work Laptop",
  "publicKey": "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5..."
}
```

### List SSH Keys

```http
GET /settings/ssh-keys
```

### Delete SSH Key

```http
DELETE /settings/ssh-keys/:keyId
```

### Create Personal Access Token

```http
POST /settings/tokens
```

**Request Body:**
```json
{
  "name": "CLI Token",
  "scopes": ["read", "write"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "token": {
    "id": 1,
    "name": "CLI Token",
    "plainToken": "pat_abc123...", // Only shown once!
    "tokenPrefix": "pat_cli_",
    "scopes": ["read", "write"]
  }
}
```

### List Personal Access Tokens

```http
GET /settings/tokens
```

### Revoke Personal Access Token

```http
POST /settings/tokens/:tokenId/revoke
```

### Delete Personal Access Token

```http
DELETE /settings/tokens/:tokenId
```

## WebSocket Events

### Connection

```javascript
const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('Connected');
});
```

### Resource Updates

```javascript
// Subscribe to resource updates
socket.emit('subscribe:resources', { projectId: '123' });

// Listen for updates
socket.on('resource:update', (data) => {
  console.log('Resource update:', data);
  // { type: 'cpu', value: 45, timestamp: '...' }
});

// Unsubscribe
socket.emit('unsubscribe:resources', { projectId: '123' });
```

### Notifications

```javascript
// Subscribe to notifications
socket.emit('subscribe:notifications', { userId: '456' });

// Listen for notifications
socket.on('notification', (data) => {
  console.log('Notification:', data);
  // { id: '...', type: 'success', title: '...', message: '...' }
});
```

### Deployment Status

```javascript
// Subscribe to deployment status
socket.emit('subscribe:deployment', { projectId: '123' });

// Listen for status updates
socket.on('deployment:status', (data) => {
  console.log('Deployment status:', data);
  // { status: 'deploying', progress: 50, ... }
});
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message here"
}
```

**Common Status Codes:**
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid authentication
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `500`: Internal Server Error - Server error

## Rate Limiting

API requests are rate limited:
- 1000 requests per hour per API key
- 100 requests per minute per API key

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1615824000
```
