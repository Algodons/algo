# Monetization System Documentation

## Overview

The Algo Cloud IDE monetization system provides comprehensive billing, subscriptions, usage tracking, and payment processing capabilities. This document covers the complete implementation including database schema, backend services, API endpoints, and frontend components.

## Table of Contents

1. [Pricing Tiers](#pricing-tiers)
2. [Usage-Based Billing](#usage-based-billing)
3. [Database Schema](#database-schema)
4. [Backend Services](#backend-services)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Payment Gateway Integration](#payment-gateway-integration)
8. [Setup and Configuration](#setup-and-configuration)
9. [Testing](#testing)

---

## Pricing Tiers

### Free Tier
- **Price:** $0/month
- **Storage:** 500 MB
- **Compute Hours:** 500 hours/month
- **Bandwidth:** 10 GB/month
- **Concurrent Deployments:** 1
- **Support:** Community forum only
- **AI Features:** Bring-your-own API keys (unlimited usage)

### Pro Tier
- **Price:** $15/month or $150/year (save 17%)
- **Storage:** 5 GB
- **Compute Hours:** 2,000 hours/month
- **Bandwidth:** 50 GB/month
- **Concurrent Deployments:** 3
- **Support:** Priority support
- **Features:** Advanced analytics
- **AI Features:** Platform-managed keys available with cost + 20% markup

### Team Tier
- **Price:** $49/month or $490/year (save 17%)
- **Storage:** 20 GB
- **Compute Hours:** 5,000 hours/month
- **Bandwidth:** 200 GB/month
- **Concurrent Deployments:** 10
- **Support:** Priority support
- **Features:** Advanced analytics, SSO, Team management
- **AI Features:** Platform-managed keys available with cost + 20% markup

### Enterprise Tier
- **Price:** Custom pricing
- **Storage:** Unlimited
- **Compute Hours:** Unlimited
- **Bandwidth:** Unlimited
- **Concurrent Deployments:** Unlimited
- **Support:** Dedicated support
- **Features:** All features + Custom resources, 99.9% SLA
- **AI Features:** Custom AI solutions available

---

## Usage-Based Billing

Beyond the plan limits, users are charged for additional usage:

- **Deployment Hours:** $0.01/hour for active deployments
- **Database Storage:** $0.10/GB/month
- **Bandwidth:** $0.05/GB beyond quota
- **AI API Usage:** Cost + 20% markup (for platform-managed keys)
- **Build Minutes:** $0.005/minute

---

## Database Schema

### Core Tables

#### subscription_plans
Defines available subscription tiers and their features.

```sql
CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    price_monthly NUMERIC(10, 2) NOT NULL,
    price_yearly NUMERIC(10, 2),
    storage_mb INTEGER NOT NULL,
    compute_hours_monthly INTEGER NOT NULL,
    bandwidth_gb_monthly INTEGER NOT NULL,
    concurrent_deployments INTEGER DEFAULT 1,
    features JSONB,
    has_priority_support BOOLEAN DEFAULT false,
    has_advanced_analytics BOOLEAN DEFAULT false,
    has_sso BOOLEAN DEFAULT false,
    has_team_management BOOLEAN DEFAULT false,
    bring_own_api_keys BOOLEAN DEFAULT true,
    platform_managed_ai BOOLEAN DEFAULT false
);
```

#### usage_metrics
Tracks all resource usage for billing purposes.

```sql
CREATE TABLE usage_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id),
    metric_type VARCHAR(50) NOT NULL,
    value NUMERIC(12, 4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    cost NUMERIC(10, 4) DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    billing_period_start DATE,
    billing_period_end DATE
);
```

#### billing_history
Records all billing transactions.

```sql
CREATE TABLE billing_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    invoice_id INTEGER REFERENCES invoices(id),
    transaction_type VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    provider VARCHAR(50),
    provider_transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### prepaid_credits
Manages prepaid credit balances.

```sql
CREATE TABLE prepaid_credits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    balance NUMERIC(10, 2) DEFAULT 0,
    auto_reload_enabled BOOLEAN DEFAULT false,
    auto_reload_threshold NUMERIC(10, 2),
    auto_reload_amount NUMERIC(10, 2)
);
```

#### usage_alerts
Configuration for usage monitoring alerts.

```sql
CREATE TABLE usage_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    metric_type VARCHAR(50) NOT NULL,
    threshold_percentage INTEGER NOT NULL,
    notification_channels JSONB DEFAULT '["email"]',
    is_active BOOLEAN DEFAULT true
);
```

See `backend/database/monetization-schema.sql` for complete schema.

---

## Backend Services

### SubscriptionService
Handles subscription lifecycle management.

**Key Methods:**
- `getPlans()` - Retrieve all available plans
- `getUserSubscription(userId)` - Get user's current subscription
- `createSubscription(userId, planName, billingCycle)` - Create new subscription
- `upgradeSubscription(userId, newPlanName)` - Upgrade to higher tier
- `downgradeSubscription(userId, newPlanName)` - Downgrade to lower tier
- `cancelSubscription(userId, reason)` - Cancel subscription
- `checkResourceLimits(userId)` - Verify usage within limits

**Location:** `backend/src/services/subscription-service.ts`

### UsageTrackingService
Tracks and calculates resource usage.

**Key Methods:**
- `recordUsage(userId, metricType, value, unit)` - Record usage event
- `getCurrentUsage(userId)` - Get current billing period usage
- `getUsageHistory(userId, startDate, endDate)` - Historical usage data
- `trackDeploymentHours(userId, projectId, hours)` - Track deployment time
- `trackStorageUsage(userId, projectId, megabytes)` - Track storage
- `trackBandwidthUsage(userId, projectId, gigabytes)` - Track bandwidth
- `trackAIUsage(userId, projectId, provider, model, tokens, cost)` - Track AI API usage

**Location:** `backend/src/services/usage-tracking-service.ts`

### BillingService
Manages invoicing and payment processing.

**Key Methods:**
- `generateSubscriptionInvoice(userId, subscriptionId, amount, periodStart, periodEnd)` - Create subscription invoice
- `generateUsageInvoice(userId, periodStart, periodEnd)` - Create usage-based invoice
- `processPayment(invoiceId, paymentMethodId, provider)` - Process payment
- `getUserInvoices(userId)` - Get user's invoice history
- `addPaymentMethod(userId, type, provider, providerPaymentMethodId, details)` - Add payment method
- `handleWebhook(provider, eventType, eventId, payload, signature)` - Process payment gateway webhooks

**Location:** `backend/src/services/billing-service.ts`

### CreditsService
Manages prepaid credit system.

**Key Methods:**
- `getBalance(userId)` - Get credit balance
- `purchaseCredits(userId, amount)` - Purchase credits
- `deductCredits(userId, amount, description)` - Deduct credits for usage
- `configureAutoReload(userId, enabled, threshold, amount)` - Configure auto-reload
- `grantBonusCredits(userId, amount, reason)` - Award promotional credits
- `refundCredits(userId, amount, reason)` - Refund credits

**Location:** `backend/src/services/credits-service.ts`

---

## API Endpoints

### Subscription Management

#### `GET /api/subscriptions/plans`
Get all available subscription plans.

**Response:**
```json
{
  "plans": [
    {
      "id": 1,
      "name": "free",
      "displayName": "Free Tier",
      "priceMonthly": 0,
      "storageMb": 500,
      "computeHoursMonthly": 500,
      ...
    }
  ]
}
```

#### `GET /api/subscriptions/current`
Get user's current subscription.

**Response:**
```json
{
  "subscription": {
    "tier": "pro",
    "status": "active",
    "billingCycle": "monthly",
    "amount": 15,
    "currentPeriodStart": "2024-01-01T00:00:00Z",
    "currentPeriodEnd": "2024-02-01T00:00:00Z"
  }
}
```

#### `POST /api/subscriptions/subscribe`
Subscribe to a plan.

**Request:**
```json
{
  "planName": "pro",
  "billingCycle": "monthly",
  "trialDays": 14
}
```

#### `POST /api/subscriptions/upgrade`
Upgrade subscription.

**Request:**
```json
{
  "planName": "team",
  "billingCycle": "yearly"
}
```

#### `DELETE /api/subscriptions/cancel`
Cancel subscription.

**Request:**
```json
{
  "reason": "No longer needed"
}
```

### Usage Tracking

#### `GET /api/usage/current`
Get current billing period usage.

**Response:**
```json
{
  "usage": {
    "period": {
      "start": "2024-01-01",
      "end": "2024-02-01"
    },
    "metrics": {
      "deployment_hours": {
        "value": 120.5,
        "cost": 1.21,
        "unit": "hours"
      },
      "storage": {
        "value": 1024,
        "cost": 0.10,
        "unit": "MB"
      }
    },
    "totalCost": 1.31
  }
}
```

#### `GET /api/usage/history`
Get usage history.

**Query Parameters:**
- `startDate` (required)
- `endDate` (required)
- `metricType` (optional)

### Billing

#### `GET /api/billing/invoices`
Get user's invoices.

**Response:**
```json
{
  "invoices": [
    {
      "id": 1,
      "invoiceNumber": "INV-2024-000001",
      "amount": 15.00,
      "currency": "USD",
      "status": "paid",
      "issuedAt": "2024-01-01T00:00:00Z",
      "paidAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

#### `GET /api/billing/invoices/:invoiceId`
Get invoice details with line items.

#### `POST /api/billing/invoices/:invoiceId/pay`
Process payment for invoice.

**Request:**
```json
{
  "paymentMethodId": 1,
  "provider": "stripe"
}
```

#### `GET /api/billing/payment-methods`
Get user's payment methods.

#### `POST /api/billing/payment-methods`
Add new payment method.

**Request:**
```json
{
  "type": "card",
  "provider": "stripe",
  "providerPaymentMethodId": "pm_1234567890",
  "details": {
    "lastFour": "4242",
    "brand": "visa",
    "isDefault": true
  }
}
```

### Credits

#### `GET /api/credits/balance`
Get credit balance.

**Response:**
```json
{
  "balance": {
    "userId": 1,
    "balance": 50.00,
    "currency": "USD",
    "autoReloadEnabled": true,
    "autoReloadThreshold": 10.00,
    "autoReloadAmount": 25.00
  }
}
```

#### `POST /api/credits/purchase`
Purchase credits.

**Request:**
```json
{
  "amount": 50.00,
  "paymentMethodId": 1
}
```

#### `POST /api/credits/auto-reload`
Configure auto-reload.

**Request:**
```json
{
  "enabled": true,
  "threshold": 10.00,
  "amount": 25.00
}
```

### Alerts

#### `GET /api/alerts`
Get configured alerts.

#### `POST /api/alerts/configure`
Configure usage alert.

**Request:**
```json
{
  "metricType": "storage",
  "thresholdPercentage": 75,
  "notificationChannels": ["email", "dashboard"],
  "isActive": true
}
```

#### `DELETE /api/alerts/:alertId`
Delete alert.

#### `GET /api/alerts/history`
Get alert trigger history.

---

## Frontend Components

### Pricing Page
**Component:** `src/components/Pricing.tsx`

Displays all subscription tiers with:
- Monthly/yearly billing toggle
- Feature comparison
- Usage-based pricing details
- Subscribe buttons

### Billing Dashboard
**Component:** `src/components/BillingDashboard.tsx`

Shows:
- Current subscription details
- Real-time usage metrics
- Invoice history
- Payment methods management

### Credits Management
**Component:** `src/components/CreditsManagement.tsx`

Provides:
- Current credit balance display
- Credit purchase interface
- Auto-reload configuration
- Transaction history

### Usage Alerts
**Component:** `src/components/UsageAlerts.tsx`

Allows users to:
- Configure usage alerts
- Set notification thresholds
- View alert history
- Manage alert settings

---

## Payment Gateway Integration

### Stripe Integration

The system is designed to integrate with Stripe for card payments.

**Setup:**
1. Install Stripe SDK: `npm install stripe`
2. Configure environment variables:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. Initialize Stripe in billing service:
   ```typescript
   import Stripe from 'stripe';
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
   ```

### PayPal Integration (Placeholder)

Configure PayPal credentials:
```
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_SECRET=your_secret
PAYPAL_MODE=sandbox
```

### Cryptocurrency (Coinbase Commerce)

Configure Coinbase Commerce:
```
COINBASE_COMMERCE_API_KEY=your_api_key
COINBASE_COMMERCE_WEBHOOK_SECRET=your_webhook_secret
```

---

## Setup and Configuration

### Environment Variables

Add to `.env`:
```bash
# Payment Gateways
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

PAYPAL_CLIENT_ID=your_client_id
PAYPAL_SECRET=your_secret
PAYPAL_MODE=sandbox

COINBASE_COMMERCE_API_KEY=your_api_key

# Billing Configuration
BILLING_EMAIL_FROM=billing@algo-ide.com
INVOICE_GENERATION_ENABLED=true
USAGE_TRACKING_ENABLED=true
USAGE_BILLING_DAY=1
```

### Database Initialization

1. Run the monetization schema:
   ```bash
   psql -U algo_user -d algo_ide -f backend/database/monetization-schema.sql
   ```

2. Verify tables are created:
   ```sql
   \dt subscription_plans
   \dt usage_metrics
   \dt billing_history
   ```

3. Default plans are automatically inserted.

### Backend Server

The monetization routes are automatically loaded in `backend/src/index.ts`:
```typescript
app.use('/api/subscriptions', createSubscriptionRoutes(dashboardPool));
app.use('/api/usage', createUsageRoutes(dashboardPool));
app.use('/api/billing', createBillingRoutes(dashboardPool));
app.use('/api/credits', createCreditsRoutes(dashboardPool));
app.use('/api/alerts', createAlertsRoutes(dashboardPool));
```

---

## Testing

### Unit Tests

Test billing calculations:
```typescript
describe('BillingService', () => {
  test('calculates usage cost correctly', () => {
    const cost = calculateUsageCost('deployment_hours', 100);
    expect(cost).toBe(1.00);
  });
});
```

### Integration Tests

Test subscription lifecycle:
```typescript
describe('Subscription Flow', () => {
  test('user can subscribe to pro plan', async () => {
    const subscription = await subscriptionService.createSubscription(
      userId,
      'pro',
      'monthly'
    );
    expect(subscription.tier).toBe('pro');
  });
});
```

### Manual Testing

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Test API endpoints using cURL or Postman:
   ```bash
   curl http://localhost:4000/api/subscriptions/plans
   ```

3. Test frontend components:
   ```bash
   npm run dev
   # Navigate to /pricing, /billing, etc.
   ```

---

## Security Considerations

1. **Payment Data:** Never store raw card numbers. Use tokenization via payment gateways.
2. **Webhook Verification:** Always verify webhook signatures.
3. **Rate Limiting:** Apply rate limits to payment endpoints.
4. **Audit Logging:** Log all billing operations.
5. **PCI Compliance:** Follow PCI DSS guidelines for payment processing.

---

## Troubleshooting

### Common Issues

**Issue:** Plans not loading
- Check database connection
- Verify schema is initialized
- Check API endpoint logs

**Issue:** Usage not tracked
- Verify usage tracking is enabled in environment
- Check that metrics are being recorded in the database

**Issue:** Payment failures
- Verify payment gateway credentials
- Check webhook configuration
- Review error logs for specific error codes

---

## Future Enhancements

- [ ] Multi-currency support
- [ ] Tax calculation integration
- [ ] Advanced analytics dashboard
- [ ] Automated invoice PDF generation
- [ ] SMS notifications for alerts
- [ ] Referral program integration
- [ ] Volume discounts
- [ ] Custom contract management for Enterprise

---

## Support

For questions or issues:
- Email: support@algo-ide.com
- Documentation: https://docs.algo-ide.com
- GitHub Issues: https://github.com/Algodons/algo/issues
