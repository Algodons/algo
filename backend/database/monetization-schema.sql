-- Monetization System Schema
-- PostgreSQL 15+
-- Comprehensive billing, subscriptions, and usage tracking

-- Subscription plans definition table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10, 2) NOT NULL,
    price_yearly NUMERIC(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    -- Resource limits
    storage_mb INTEGER NOT NULL,
    compute_hours_monthly INTEGER NOT NULL,
    bandwidth_gb_monthly INTEGER NOT NULL,
    concurrent_deployments INTEGER DEFAULT 1,
    -- Features
    features JSONB DEFAULT '{}',
    has_priority_support BOOLEAN DEFAULT false,
    has_advanced_analytics BOOLEAN DEFAULT false,
    has_sso BOOLEAN DEFAULT false,
    has_team_management BOOLEAN DEFAULT false,
    has_custom_pricing BOOLEAN DEFAULT false,
    has_sla BOOLEAN DEFAULT false,
    -- AI features
    bring_own_api_keys BOOLEAN DEFAULT true,
    platform_managed_ai BOOLEAN DEFAULT false,
    -- Status
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage metrics tracking
CREATE TABLE IF NOT EXISTS usage_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('deployment_hours', 'storage', 'bandwidth', 'ai_api_usage', 'build_minutes')),
    value NUMERIC(12, 4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    cost NUMERIC(10, 4) DEFAULT 0,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    billing_period_start DATE,
    billing_period_end DATE
);

-- Billing history and transactions
CREATE TABLE IF NOT EXISTS billing_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('subscription', 'usage', 'credit_purchase', 'refund', 'adjustment')),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    provider VARCHAR(50),
    provider_transaction_id VARCHAR(255),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Stored payment methods (enhanced)
CREATE TABLE IF NOT EXISTS stored_payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'paypal', 'crypto', 'bank_account')),
    provider VARCHAR(50) DEFAULT 'stripe',
    provider_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    -- Card details (tokenized)
    last_four VARCHAR(4),
    brand VARCHAR(50),
    exp_month INTEGER,
    exp_year INTEGER,
    -- Other payment method details
    email VARCHAR(255), -- For PayPal
    wallet_address VARCHAR(255), -- For crypto
    -- Metadata
    billing_name VARCHAR(255),
    billing_address JSONB,
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage alerts configuration
CREATE TABLE IF NOT EXISTS usage_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    threshold_percentage INTEGER NOT NULL CHECK (threshold_percentage > 0 AND threshold_percentage <= 100),
    notification_channels JSONB DEFAULT '["email"]', -- email, sms, dashboard
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage alert history
CREATE TABLE IF NOT EXISTS usage_alert_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES usage_alerts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    threshold_value NUMERIC(12, 2),
    current_value NUMERIC(12, 2),
    percentage_used NUMERIC(5, 2),
    notification_sent BOOLEAN DEFAULT false,
    notification_channels JSONB,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prepaid credits system
CREATE TABLE IF NOT EXISTS prepaid_credits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(10, 2) DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    auto_reload_enabled BOOLEAN DEFAULT false,
    auto_reload_threshold NUMERIC(10, 2),
    auto_reload_amount NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit transactions
CREATE TABLE IF NOT EXISTS prepaid_credit_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'adjustment', 'auto_reload')),
    description TEXT,
    balance_before NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    usage_metric_id INTEGER REFERENCES usage_metrics(id) ON DELETE SET NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment gateway webhooks
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) UNIQUE,
    payload JSONB NOT NULL,
    signature VARCHAR(500),
    verified BOOLEAN DEFAULT false,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription change history
CREATE TABLE IF NOT EXISTS subscription_change_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('created', 'upgraded', 'downgraded', 'cancelled', 'reactivated', 'paused', 'resumed')),
    old_tier VARCHAR(50),
    new_tier VARCHAR(50),
    old_billing_cycle VARCHAR(20),
    new_billing_cycle VARCHAR(20),
    proration_amount NUMERIC(10, 2),
    reason TEXT,
    initiated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice line items for detailed billing
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('subscription', 'usage', 'overage', 'credit', 'discount', 'tax')),
    quantity NUMERIC(12, 4),
    unit_price NUMERIC(10, 4),
    amount NUMERIC(10, 2) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discount/promo code redemptions
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
    id SERIAL PRIMARY KEY,
    discount_code_id INTEGER NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    discount_amount NUMERIC(10, 2) NOT NULL,
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment failure tracking
CREATE TABLE IF NOT EXISTS payment_failures (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    payment_method_id INTEGER REFERENCES stored_payment_methods(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    provider VARCHAR(50),
    error_code VARCHAR(100),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP,
    resolved_at TIMESTAMP,
    failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI API usage tracking (for platform-managed keys)
CREATE TABLE IF NOT EXISTS ai_api_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- openai, anthropic, etc.
    model VARCHAR(100),
    tokens_used INTEGER NOT NULL,
    cost_usd NUMERIC(10, 6) NOT NULL,
    markup_percentage NUMERIC(5, 2) DEFAULT 20.00,
    total_charge NUMERIC(10, 6) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    billing_period_start DATE,
    billing_period_end DATE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id ON usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_project_id ON usage_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_timestamp ON usage_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_billing_period ON usage_metrics(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at);
CREATE INDEX IF NOT EXISTS idx_stored_payment_methods_user_id ON stored_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_user_id ON usage_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_alert_history_user_id ON usage_alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_credits_user_id ON prepaid_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_credit_transactions_user_id ON prepaid_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_id ON payment_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_subscription_change_history_user_id ON subscription_change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_user_id ON promo_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_user_id ON payment_failures(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_resolved ON payment_failures(resolved_at);
CREATE INDEX IF NOT EXISTS idx_ai_api_usage_user_id ON ai_api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_usage_billing_period ON ai_api_usage(billing_period_start, billing_period_end);

-- Create triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stored_payment_methods_updated_at BEFORE UPDATE ON stored_payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_alerts_updated_at BEFORE UPDATE ON usage_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prepaid_credits_updated_at BEFORE UPDATE ON prepaid_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, 
    storage_mb, compute_hours_monthly, bandwidth_gb_monthly, concurrent_deployments,
    features, has_priority_support, has_advanced_analytics, has_sso, has_team_management,
    bring_own_api_keys, platform_managed_ai, sort_order)
VALUES 
    ('free', 'Free Tier', 'Perfect for getting started', 0.00, 0.00,
     500, 500, 10, 1,
     '{"support": "Community forum only"}',
     false, false, false, false, true, false, 1),
    
    ('pro', 'Pro Tier', 'For professional developers', 15.00, 150.00,
     5000, 2000, 50, 3,
     '{"support": "Priority support", "analytics": "Advanced analytics"}',
     true, true, false, false, true, true, 2),
    
    ('team', 'Team Tier', 'For growing teams', 49.00, 490.00,
     20000, 5000, 200, 10,
     '{"support": "Priority support", "sso": "Single Sign-On", "team": "Team management"}',
     true, true, true, true, true, true, 3),
    
    ('enterprise', 'Enterprise Tier', 'Custom solutions for large organizations', 0.00, 0.00,
     -1, -1, -1, -1,
     '{"support": "Dedicated support", "sla": "99.9% uptime SLA", "custom": "Custom resources"}',
     true, true, true, true, true, true, 4)
ON CONFLICT (name) DO NOTHING;
