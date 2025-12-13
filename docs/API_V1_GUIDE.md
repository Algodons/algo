# Algo Platform API v1 Guide

Comprehensive guide for the Algo Cloud IDE Platform REST API v1.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Users](#users)
  - [Projects](#projects)
  - [Files](#files)
  - [Deployments](#deployments)
  - [Webhooks](#webhooks)
  - [Resources](#resources)
  - [Billing](#billing)
  - [AI Agents](#ai-agents)
  - [ML Models](#ml-models)
- [SDKs](#sdks)
- [Examples](#examples)
- [Error Handling](#error-handling)

## Overview

The Algo Platform API v1 provides programmatic access to all platform features including:

- User and project management
- File system operations
- Deployment and CI/CD
- Webhook subscriptions
- Resource monitoring
- AI agent invocation
- ML model predictions

**Base URL**: `https://api.algo.dev/v1` (Production)  
**Base URL**: `http://localhost:4000/api/v1` (Development)

## Authentication

All API requests (except user registration) require authentication via Bearer token:

```bash
Authorization: Bearer YOUR_API_KEY
```

### Obtaining an API Key

1. Sign up for an account
2. Navigate to Settings > API Keys
3. Generate a new API key
4. Store it securely (it won't be shown again)

### Example Request

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.algo.dev/v1/projects
```

## Rate Limiting

API requests are rate-limited to ensure fair usage:

- **Free Tier**: 1,000 requests/hour
- **Pro Tier**: 10,000 requests/hour
- **Enterprise**: Custom limits

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Endpoints

### Users

#### Create User

```http
POST /users
```

Create a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Get User

```http
GET /users/:id
```

#### Update User

```http
PUT /users/:id
```

#### Delete User

```http
DELETE /users/:id
```

#### List Users

```http
GET /users?page=1&limit=20&search=john
```

### Projects

#### Create Project

```http
POST /projects
```

**Request Body**:
```json
{
  "name": "My Awesome Project",
  "description": "A project description",
  "template": "react",
  "visibility": "private"
}
```

#### Deploy Project

```http
POST /projects/:id/deploy
```

Initiates deployment of a project.

**Response** (202):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "project_id": 123,
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Clone Project

```http
POST /projects/:id/clone
```

**Request Body**:
```json
{
  "name": "Cloned Project"
}
```

### Files

#### Read File

```http
GET /files/:path?projectId=123
```

#### Create File

```http
POST /files/:path
```

**Request Body**:
```json
{
  "projectId": "123",
  "content": "console.log('Hello World');",
  "directory": false
}
```

#### Update File

```http
PUT /files/:path
```

#### Delete File

```http
DELETE /files/:path?projectId=123
```

### Webhooks

#### Register Webhook

```http
POST /webhooks
```

**Request Body**:
```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["deployment.completed", "build.failed"],
  "project_id": 123,
  "secret": "optional-custom-secret"
}
```

#### List Webhooks

```http
GET /webhooks?project_id=123&page=1&limit=20
```

#### Webhook Deliveries

```http
GET /webhooks/:id/deliveries
```

View delivery history and status for a webhook.

### Resources

#### Get Usage

```http
GET /resources/usage?project_id=123&metric=cpu
```

**Response**:
```json
{
  "success": true,
  "data": {
    "usage": [...],
    "aggregates": {
      "cpu": {
        "total": 1234.56,
        "average": 12.34,
        "peak": 45.67,
        "unit": "percent"
      }
    }
  }
}
```

#### Get Limits

```http
GET /resources/limits
```

### AI Agents

#### List Agents

```http
GET /ai/agents?category=development&page=1
```

#### Invoke Agent

```http
POST /ai/agents/:agentId/invoke
```

**Request Body**:
```json
{
  "input": "Generate a React component",
  "context": {
    "language": "typescript"
  },
  "parameters": {
    "temperature": 0.7
  }
}
```

### ML Models

#### List Models

```http
GET /ai/models?type=nlp
```

#### Run Prediction

```http
POST /ai/models/:modelId/predict
```

**Request Body**:
```json
{
  "input": "This is a sample text",
  "parameters": {
    "max_length": 100
  }
}
```

## SDKs

### JavaScript/TypeScript

```bash
npm install @algo/sdk
```

```typescript
import { AlgoSDK } from '@algo/sdk';

const algo = new AlgoSDK({
  apiKey: 'YOUR_API_KEY'
});

// Create a project
const project = await algo.projects.create({
  name: 'My Project'
});

// Deploy
const deployment = await algo.projects.deploy(project.id);
```

### Python

```bash
pip install algo-sdk
```

```python
from algo_sdk import AlgoSDK

algo = AlgoSDK(api_key='YOUR_API_KEY')

# Create a project
project = algo.projects.create(name='My Project')

# Deploy
deployment = algo.projects.deploy(project.id)
```

### CLI

```bash
npm install -g @algo/cli
```

```bash
# Configure
algo config --api-key YOUR_API_KEY

# Deploy
algo projects deploy 123

# List resources
algo resources usage
```

## Examples

### Complete Workflow

```typescript
// 1. Create a project
const project = await algo.projects.create({
  name: 'My App',
  template: 'react'
});

// 2. Create files
await algo.files.create('src/App.tsx', project.id, `
  import React from 'react';
  export default function App() {
    return <div>Hello World</div>;
  }
`);

// 3. Setup webhook
const webhook = await algo.webhooks.create({
  url: 'https://my-domain.com/webhook',
  events: ['deployment.completed'],
  project_id: project.id
});

// 4. Deploy
const deployment = await algo.projects.deploy(project.id);

// 5. Monitor
const status = await algo.deployments.get(deployment.id);
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error message"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `202` - Accepted (async operation)
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

### SDK Error Handling

```typescript
try {
  await algo.projects.deploy(projectId);
} catch (error) {
  if (error.statusCode === 404) {
    console.log('Project not found');
  } else if (error.statusCode === 429) {
    console.log('Rate limit exceeded');
  } else {
    console.log('Error:', error.message);
  }
}
```

## Support

- Documentation: https://docs.algo.dev
- API Status: https://status.algo.dev
- Support Email: support@algo.dev
- GitHub Issues: https://github.com/Algodons/algo/issues
