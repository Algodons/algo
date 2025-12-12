# Admin Control System API Documentation

## Overview

The Admin Control System provides comprehensive management capabilities for user administration, platform analytics, sales & affiliate management, financial controls, and system administration.

## Authentication

All admin endpoints require authentication via JWT token and admin role.

### Headers

```
Authorization: Bearer <jwt_token>
X-2FA-Token: <totp_token>  # Required for sensitive operations
X-Impersonation-Token: <session_token>  # For impersonation mode
X-Password-Confirmation: <password>  # For sensitive operations
```

### Roles

- **admin**: Super admin with full access
- **moderator**: Limited admin access (read-only for sensitive operations)

## 1. User Management

### Search Users

```http
GET /api/admin/users/search
```

**Query Parameters:**
- `email` (optional): Filter by email (partial match)
- `username` (optional): Filter by username (partial match)
- `registrationDateFrom` (optional): Filter by registration date
- `registrationDateTo` (optional): Filter by registration date
- `subscriptionTier` (optional): Filter by tier (free, starter, pro, enterprise)
- `status` (optional): Filter by status (active, suspended)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sortBy` (optional): Sort field (default: created_at)
- `sortOrder` (optional): Sort order (ASC, DESC, default: DESC)

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "subscription_tier": "pro",
      "is_suspended": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

### Get User Details

```http
GET /api/admin/users/:id
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "pro",
    "subscription_status": "active",
    "credit_balance": 100.00,
    "is_suspended": false,
    "suspension": null
  }
}
```

### Suspend User

```http
POST /api/admin/users/:id/suspend
```

**Requires:** 2FA

**Request Body:**
```json
{
  "reason": "Violation of terms of service",
  "notes": "Detailed explanation..."
}
```

### Activate User

```http
POST /api/admin/users/:id/activate
```

**Requires:** 2FA

**Request Body:**
```json
{
  "reason": "Appeal accepted"
}
```

### Get User Analytics

```http
GET /api/admin/users/:id/analytics?period=30d
```

**Query Parameters:**
- `period` (optional): 7d, 30d, 90d (default: 30d)

**Response:**
```json
{
  "resourceMetrics": [
    {
      "metric_type": "cpu",
      "total": 100.5,
      "average": 3.5,
      "unit": "hours",
      "date": "2024-01-01"
    }
  ],
  "apiUsage": {
    "total_requests": 1000,
    "avg_response_time": 120.5,
    "error_count": 10
  },
  "projects": {
    "total_projects": 5
  }
}
```

### Start Impersonation

```http
POST /api/admin/users/:id/impersonate
```

**Requires:** Super Admin, 2FA

**Request Body:**
```json
{
  "reason": "Support ticket #12345"
}
```

**Response:**
```json
{
  "sessionToken": "abc123...",
  "message": "Impersonation session started",
  "expiresIn": "1 hour"
}
```

### End Impersonation

```http
POST /api/admin/users/:id/impersonate/end
```

**Request Body:**
```json
{
  "sessionToken": "abc123..."
}
```

### Bulk Email Campaign

```http
POST /api/admin/users/bulk/email
```

**Requires:** Super Admin, 2FA

**Request Body:**
```json
{
  "subject": "Important Update",
  "body": "Email content...",
  "template": "announcement",
  "filters": {
    "subscriptionTier": "pro",
    "status": "active"
  }
}
```

### Bulk Credit Adjustment

```http
POST /api/admin/users/bulk/credits
```

**Requires:** Super Admin, 2FA

**Request Body:**
```json
{
  "amount": 50.00,
  "reason": "Promotional credit",
  "userIds": [1, 2, 3]
}
```

### Override Subscription

```http
POST /api/admin/users/:id/subscription/override
```

**Requires:** 2FA

**Request Body:**
```json
{
  "tier": "enterprise",
  "amount": 99.00,
  "reason": "Custom enterprise deal"
}
```

## 2. Platform Analytics

### Active Users Dashboard

```http
GET /api/admin/analytics/active-users
```

**Response:**
```json
{
  "activeUsers": 150,
  "activeSessions": 200,
  "concurrentDeployments": 45,
  "activeProjects": 320,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Revenue Metrics

```http
GET /api/admin/analytics/revenue?period=12m
```

**Response:**
```json
{
  "mrr": "50000.00",
  "arr": "600000.00",
  "growthRate": "15.50",
  "trends": [
    {
      "month": "2024-01-01",
      "new_subscriptions": 25,
      "revenue": "5000.00"
    }
  ],
  "subscriptionDistribution": [
    {
      "tier": "pro",
      "count": 100,
      "revenue": "30000.00"
    }
  ],
  "currency": "USD"
}
```

### Churn Analysis

```http
GET /api/admin/analytics/churn
```

**Response:**
```json
{
  "monthlyChurn": [
    {
      "month": "2024-01-01",
      "churned_users": 10,
      "total_active": 500,
      "churn_rate": "2.00"
    }
  ],
  "cancellationReasons": [
    {
      "cancellation_reason": "too_expensive",
      "count": 15,
      "percentage": "45.00"
    }
  ],
  "cohortAnalysis": [
    {
      "cohortMonth": "2024-01-01",
      "users": 100,
      "retainedUsers": 85,
      "retentionRate": "85.00"
    }
  ]
}
```

### Resource Utilization

```http
GET /api/admin/analytics/resources?period=24h
```

**Response:**
```json
{
  "metrics": [
    {
      "metric_type": "cpu",
      "time_bucket": "2024-01-01 12:00:00",
      "total": 1000.5,
      "average": 50.5,
      "peak": 100.0,
      "unit": "cores"
    }
  ],
  "containers": [
    {
      "status": "running",
      "count": 150
    }
  ],
  "totalStorage": 5000.00,
  "totalBandwidth": 10000.00
}
```

### Template Statistics

```http
GET /api/admin/analytics/templates
```

**Response:**
```json
{
  "topTemplates": [
    {
      "name": "React + TypeScript",
      "language": "javascript",
      "framework": "react",
      "usage_count": 500,
      "project_count": 450
    }
  ],
  "languageDistribution": [
    {
      "language": "javascript",
      "count": 1000,
      "percentage": "45.00"
    }
  ],
  "frameworkDistribution": [
    {
      "framework": "react",
      "count": 500,
      "percentage": "50.00"
    }
  ]
}
```

### Geographic Distribution

```http
GET /api/admin/analytics/geography
```

**Response:**
```json
{
  "countries": [
    {
      "country_code": "US",
      "country_name": "United States",
      "user_count": 500,
      "percentage": "50.00"
    }
  ],
  "regions": [
    {
      "region": "California",
      "user_count": 200
    }
  ],
  "timezones": [
    {
      "timezone": "America/Los_Angeles",
      "user_count": 150
    }
  ]
}
```

### Performance Metrics

```http
GET /api/admin/analytics/performance?period=24h
```

**Response:**
```json
{
  "apiPerformance": [
    {
      "endpoint": "/api/projects",
      "request_count": 5000,
      "avg_response_time": 120.5,
      "p50_latency": 100.0,
      "p95_latency": 250.0,
      "p99_latency": 500.0,
      "error_count": 10
    }
  ],
  "overall": {
    "avg_p50": 100.0,
    "avg_p95": 250.0,
    "avg_p99": 500.0,
    "avg_error_rate": 0.2
  },
  "databasePerformance": []
}
```

### Executive Summary

```http
GET /api/admin/analytics/summary
```

**Response:**
```json
{
  "users": {
    "total_users": 1000,
    "new_users_30d": 50,
    "active_users": 950
  },
  "projects": {
    "total_projects": 5000,
    "new_projects_30d": 250,
    "running_projects": 150
  },
  "subscriptions": {
    "total_subscriptions": 500,
    "monthly_revenue": "50000.00"
  },
  "deployments": {
    "total_deployments": 10000,
    "deployments_24h": 150,
    "avg_deployment_time": 120.5
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 3. Sales & Affiliate Management

### Create Affiliate

```http
POST /api/admin/affiliates
```

**Request Body:**
```json
{
  "userId": 1,
  "commissionType": "percentage",
  "commissionValue": 20.00,
  "tierConfig": {
    "tiers": [
      { "threshold": 1000, "rate": 15 },
      { "threshold": 5000, "rate": 20 }
    ]
  }
}
```

### List Affiliates

```http
GET /api/admin/affiliates?status=active&page=1&limit=20
```

### Get Affiliate Details

```http
GET /api/admin/affiliates/:id
```

**Response:**
```json
{
  "affiliate": {
    "id": 1,
    "affiliate_code": "ABC12345",
    "commission_type": "percentage",
    "commission_value": 20.00,
    "status": "active"
  },
  "stats": {
    "total_referrals": 50,
    "conversions": 25,
    "total_revenue": "5000.00",
    "total_commissions": "1000.00"
  },
  "recentReferrals": []
}
```

### Update Affiliate

```http
PUT /api/admin/affiliates/:id
```

**Request Body:**
```json
{
  "commissionType": "tiered",
  "commissionValue": 25.00,
  "status": "active"
}
```

### Create Discount Code

```http
POST /api/admin/affiliates/discount-codes
```

**Request Body:**
```json
{
  "code": "SUMMER2024",
  "type": "percentage",
  "value": 20.00,
  "affiliateId": 1,
  "usageLimit": 100,
  "minPurchaseAmount": 50.00,
  "applicableTiers": ["pro", "enterprise"],
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### List Discount Codes

```http
GET /api/admin/affiliates/discount-codes/list?isActive=true
```

### List Payouts

```http
GET /api/admin/affiliates/payouts?status=pending
```

### Create Payout

```http
POST /api/admin/affiliates/payouts
```

**Requires:** 2FA

**Request Body:**
```json
{
  "affiliateId": 1,
  "amount": 500.00,
  "method": "stripe_connect",
  "scheduledAt": "2024-01-15T00:00:00Z"
}
```

### Process Payout

```http
POST /api/admin/affiliates/payouts/:id/process
```

**Requires:** 2FA

**Request Body:**
```json
{
  "providerPayoutId": "po_abc123"
}
```

### Affiliate Dashboard

```http
GET /api/admin/affiliates/dashboard
```

**Response:**
```json
{
  "stats": {
    "total_affiliates": 100,
    "active_affiliates": 85,
    "total_referrals": 500,
    "total_conversions": 250,
    "total_revenue": "50000.00",
    "total_commissions_owed": "10000.00",
    "total_commissions_paid": "8000.00"
  },
  "topPerformers": [],
  "pendingPayouts": "2000.00"
}
```

## 4. Financial Controls

### Revenue Reconciliation

```http
GET /api/admin/financial/reconciliation?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "platformRevenue": [
    {
      "total_revenue": "50000.00",
      "transaction_count": 500,
      "currency": "USD"
    }
  ],
  "refunds": [
    {
      "total_refunds": "1000.00",
      "refund_count": 10,
      "currency": "USD"
    }
  ],
  "subscriptionRevenue": [],
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

### List Subscriptions

```http
GET /api/admin/financial/subscriptions?status=active&tier=pro&page=1&limit=20
```

### Upgrade Subscription

```http
POST /api/admin/financial/subscriptions/:id/upgrade
```

**Requires:** 2FA

**Request Body:**
```json
{
  "newTier": "enterprise",
  "newAmount": 199.00,
  "reason": "Custom enterprise deal"
}
```

### Cancel Subscription

```http
POST /api/admin/financial/subscriptions/:id/cancel
```

**Requires:** 2FA

**Request Body:**
```json
{
  "reason": "User request",
  "immediate": true
}
```

### Pause Subscription

```http
POST /api/admin/financial/subscriptions/:id/pause
```

**Requires:** 2FA

**Request Body:**
```json
{
  "pauseStartsAt": "2024-02-01T00:00:00Z",
  "pauseEndsAt": "2024-03-01T00:00:00Z"
}
```

### List Refunds

```http
GET /api/admin/financial/refunds?status=pending&page=1&limit=20
```

### Create Refund

```http
POST /api/admin/financial/refunds
```

**Requires:** 2FA

**Request Body:**
```json
{
  "userId": 1,
  "invoiceId": 100,
  "amount": 50.00,
  "type": "partial",
  "reason": "service_issue",
  "reasonDetails": "Downtime on 2024-01-15"
}
```

### Process Refund

```http
POST /api/admin/financial/refunds/:id/process
```

**Requires:** 2FA

**Request Body:**
```json
{
  "providerRefundId": "re_abc123"
}
```

### Get Tax Configuration

```http
GET /api/admin/financial/tax-config
```

### Create Tax Configuration

```http
POST /api/admin/financial/tax-config
```

**Requires:** 2FA

**Request Body:**
```json
{
  "countryCode": "US",
  "stateCode": "CA",
  "taxType": "sales_tax",
  "rate": 8.5,
  "effectiveFrom": "2024-01-01",
  "effectiveTo": "2024-12-31"
}
```

### Get Payment Retry Status

```http
GET /api/admin/financial/payment-retry
```

### Trigger Payment Retry

```http
POST /api/admin/financial/payment-retry/:userId/trigger
```

**Requires:** 2FA

## 5. System Administration

### Server Health

```http
GET /api/admin/system/health?period=1h
```

**Response:**
```json
{
  "aggregated": [
    {
      "server_id": "web-01",
      "avg_cpu": 45.5,
      "max_cpu": 80.0,
      "avg_memory": 60.0,
      "max_memory": 85.0,
      "avg_disk": 50.0,
      "status": "healthy"
    }
  ],
  "latest": []
}
```

### Database Pool Status

```http
GET /api/admin/system/database-pool
```

**Response:**
```json
{
  "pool": {
    "totalConnections": 20,
    "idleConnections": 15,
    "waitingClients": 0
  },
  "performance": {
    "total_queries": 10000,
    "avg_response_time": 50.5,
    "max_response_time": 500.0
  }
}
```

### Container Metrics

```http
GET /api/admin/system/containers?period=1h
```

**Response:**
```json
{
  "pods": [
    {
      "status": "Running",
      "count": 50,
      "avg_cpu": 45.5,
      "avg_memory": 60.0
    }
  ],
  "nodes": [],
  "topRestarts": []
}
```

### Deployment Queue

```http
GET /api/admin/system/deployment-queue?status=pending
```

### Retry Deployment

```http
POST /api/admin/system/deployment-queue/:id/retry
```

### Cancel Deployment

```http
POST /api/admin/system/deployment-queue/:id/cancel
```

### List Announcements

```http
GET /api/admin/system/announcements?isActive=true
```

### Create Announcement

```http
POST /api/admin/system/announcements
```

**Requires:** Super Admin

**Request Body:**
```json
{
  "title": "Scheduled Maintenance",
  "message": "We will be performing maintenance on...",
  "type": "maintenance",
  "severity": "high",
  "displayLocations": ["dashboard", "editor"],
  "startsAt": "2024-01-15T00:00:00Z",
  "endsAt": "2024-01-15T04:00:00Z"
}
```

### Update Announcement

```http
PUT /api/admin/system/announcements/:id
```

**Requires:** Super Admin

### List Feature Flags

```http
GET /api/admin/system/feature-flags
```

### Create Feature Flag

```http
POST /api/admin/system/feature-flags
```

**Requires:** Super Admin, 2FA

**Request Body:**
```json
{
  "name": "new_editor",
  "description": "New code editor with AI features",
  "isEnabled": false,
  "rolloutPercentage": 10,
  "targetSegments": ["pro", "enterprise"],
  "metadata": {}
}
```

### Update Feature Flag

```http
PUT /api/admin/system/feature-flags/:id
```

**Requires:** Super Admin, 2FA

**Request Body:**
```json
{
  "isEnabled": true,
  "rolloutPercentage": 50,
  "changeReason": "Gradual rollout to 50%"
}
```

### List Rate Limits

```http
GET /api/admin/system/rate-limits
```

### Create Rate Limit

```http
POST /api/admin/system/rate-limits
```

**Requires:** Super Admin, 2FA

**Request Body:**
```json
{
  "userId": 1,
  "limitType": "user",
  "requestsPerMinute": 100,
  "requestsPerHour": 5000,
  "requestsPerDay": 100000
}
```

### Purge CDN Cache

```http
POST /api/admin/system/cdn/purge
```

**Requires:** Super Admin, 2FA

**Request Body:**
```json
{
  "operationType": "purge_url",
  "targetPattern": "/static/*",
  "urls": ["https://cdn.example.com/static/app.js"]
}
```

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 429 Rate Limited
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process request"
}
```

## Security Features

### IP Whitelisting

Configure allowed IP addresses for admin access in environment variables:

```
ADMIN_ALLOWED_IPS=192.168.1.1,10.0.0.1
```

### 2FA Requirements

Sensitive operations (marked with **Requires: 2FA**) require a valid TOTP token:

```http
X-2FA-Token: 123456
```

### Audit Logging

All admin actions are automatically logged with:
- User ID
- Action performed
- Resource affected
- IP address
- Timestamp
- Success/failure status

### Session Timeout

Admin sessions automatically timeout after 30 minutes of inactivity.

## Rate Limits

Default rate limits for admin endpoints:
- 100 requests per minute
- 5000 requests per hour

Higher limits can be configured per admin user.
