-- Admin Control System Schema Extensions
-- PostgreSQL 15+

-- Subscriptions and tiers table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused', 'past_due')),
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    pause_starts_at TIMESTAMP,
    pause_ends_at TIMESTAMP,
    trial_ends_at TIMESTAMP,
    provider VARCHAR(50) DEFAULT 'stripe',
    provider_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- User suspensions and moderation
CREATE TABLE IF NOT EXISTS user_suspensions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    suspended_by INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'lifted')),
    suspended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lifted_at TIMESTAMP,
    lifted_by INTEGER REFERENCES users(id),
    lift_reason TEXT,
    notes TEXT
);

-- User credits system
CREATE TABLE IF NOT EXISTS user_credits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit transactions history
CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit', 'adjustment')),
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    performed_by INTEGER REFERENCES users(id),
    balance_after NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Affiliates program
CREATE TABLE IF NOT EXISTS affiliates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    affiliate_code VARCHAR(50) UNIQUE NOT NULL,
    commission_type VARCHAR(20) DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed', 'tiered')),
    commission_value NUMERIC(10, 2) NOT NULL,
    tier_config JSONB, -- For tiered commission structures
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    total_referrals INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_revenue NUMERIC(10, 2) DEFAULT 0,
    total_commissions NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referrals tracking
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    referred_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    referral_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired')),
    conversion_value NUMERIC(10, 2),
    commission_amount NUMERIC(10, 2),
    commission_paid BOOLEAN DEFAULT false,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    converted_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- Discount codes
CREATE TABLE IF NOT EXISTS discount_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value NUMERIC(10, 2) NOT NULL,
    affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE SET NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    min_purchase_amount NUMERIC(10, 2),
    applicable_tiers JSONB, -- Array of tier names
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discount code usage tracking
CREATE TABLE IF NOT EXISTS discount_code_usage (
    id SERIAL PRIMARY KEY,
    discount_code_id INTEGER NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_amount NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Affiliate payouts
CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    method VARCHAR(20) NOT NULL CHECK (method IN ('stripe_connect', 'paypal', 'bank_transfer', 'manual')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
    provider_payout_id VARCHAR(255),
    scheduled_at TIMESTAMP,
    processed_at TIMESTAMP,
    failed_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refunds tracking
CREATE TABLE IF NOT EXISTS refunds (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    type VARCHAR(20) NOT NULL CHECK (type IN ('full', 'partial')),
    reason VARCHAR(100) NOT NULL,
    reason_details TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'failed', 'rejected')),
    provider VARCHAR(50) DEFAULT 'stripe',
    provider_refund_id VARCHAR(255),
    processed_by INTEGER REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feature flags for gradual rollout
CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_segments JSONB, -- User segments for targeting
    metadata JSONB,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feature flag history
CREATE TABLE IF NOT EXISTS feature_flag_history (
    id SERIAL PRIMARY KEY,
    feature_flag_id INTEGER NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    previous_value JSONB NOT NULL,
    new_value JSONB NOT NULL,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System announcements and maintenance
CREATE TABLE IF NOT EXISTS system_announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical', 'maintenance')),
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    display_locations JSONB, -- Array of locations to display (dashboard, editor, etc.)
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate limits configuration
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    endpoint_pattern VARCHAR(255),
    limit_type VARCHAR(20) DEFAULT 'user' CHECK (limit_type IN ('user', 'ip', 'endpoint', 'global')),
    requests_per_minute INTEGER,
    requests_per_hour INTEGER,
    requests_per_day INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_one_identifier CHECK (
        (user_id IS NOT NULL)::integer + 
        (ip_address IS NOT NULL)::integer + 
        (endpoint_pattern IS NOT NULL)::integer = 1
    )
);

-- Rate limit violations log
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id SERIAL PRIMARY KEY,
    rate_limit_id INTEGER REFERENCES rate_limits(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    violation_count INTEGER DEFAULT 1,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin impersonation sessions for audit
CREATE TABLE IF NOT EXISTS admin_impersonations (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES users(id),
    target_user_id INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    ip_address VARCHAR(45),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    actions_performed INTEGER DEFAULT 0,
    session_token VARCHAR(255) UNIQUE
);

-- Churn tracking and analysis
CREATE TABLE IF NOT EXISTS churn_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('cancelled', 'downgraded', 'paused')),
    previous_tier VARCHAR(50),
    new_tier VARCHAR(50),
    cancellation_reason VARCHAR(100),
    cancellation_details TEXT,
    feedback TEXT,
    could_have_been_prevented BOOLEAN,
    event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Server health metrics
CREATE TABLE IF NOT EXISTS server_health (
    id SERIAL PRIMARY KEY,
    server_id VARCHAR(100) NOT NULL,
    cpu_usage NUMERIC(5, 2),
    memory_usage NUMERIC(5, 2),
    disk_usage NUMERIC(5, 2),
    network_in_mbps NUMERIC(10, 2),
    network_out_mbps NUMERIC(10, 2),
    active_connections INTEGER,
    status VARCHAR(20) DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical', 'down')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Container metrics (Kubernetes)
CREATE TABLE IF NOT EXISTS container_metrics (
    id SERIAL PRIMARY KEY,
    namespace VARCHAR(100),
    pod_name VARCHAR(255) NOT NULL,
    container_name VARCHAR(255),
    node_name VARCHAR(255),
    cpu_usage NUMERIC(10, 2),
    memory_usage NUMERIC(10, 2),
    restart_count INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployment queue
CREATE TABLE IF NOT EXISTS deployment_queue (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 0,
    build_config JSONB,
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

-- Failed payment retry configuration
CREATE TABLE IF NOT EXISTS payment_retry_config (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    retry_schedule JSONB NOT NULL, -- Array of retry intervals
    current_retry_attempt INTEGER DEFAULT 0,
    grace_period_days INTEGER DEFAULT 7,
    last_retry_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    dunning_status VARCHAR(20) DEFAULT 'active' CHECK (dunning_status IN ('active', 'paused', 'exhausted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax configuration for different regions
CREATE TABLE IF NOT EXISTS tax_configuration (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL,
    state_code VARCHAR(10),
    tax_type VARCHAR(20) NOT NULL CHECK (tax_type IN ('vat', 'sales_tax', 'gst')),
    rate NUMERIC(5, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_code, state_code, tax_type, effective_from)
);

-- Tax exempt users
CREATE TABLE IF NOT EXISTS tax_exempt_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    exemption_type VARCHAR(50) NOT NULL,
    exemption_certificate_number VARCHAR(100),
    exemption_reason TEXT,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Geographic distribution cache
CREATE TABLE IF NOT EXISTS user_geography (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    timezone VARCHAR(50),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform performance metrics
CREATE TABLE IF NOT EXISTS platform_performance (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    p50_latency NUMERIC(10, 2),
    p95_latency NUMERIC(10, 2),
    p99_latency NUMERIC(10, 2),
    avg_response_time NUMERIC(10, 2),
    request_count INTEGER,
    error_count INTEGER,
    error_rate NUMERIC(5, 2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CDN cache management
CREATE TABLE IF NOT EXISTS cdn_cache_operations (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('purge_all', 'purge_url', 'purge_pattern')),
    target_pattern TEXT,
    urls_purged INTEGER,
    initiated_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    provider VARCHAR(50),
    provider_operation_id VARCHAR(255),
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_status ON user_suspensions(status);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON affiliate_payouts(status);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flag_history_flag_id ON feature_flag_history(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_system_announcements_active ON system_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_address ON rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_timestamp ON rate_limit_violations(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_impersonations_admin ON admin_impersonations(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_impersonations_target ON admin_impersonations(target_user_id);
CREATE INDEX IF NOT EXISTS idx_churn_events_user_id ON churn_events(user_id);
CREATE INDEX IF NOT EXISTS idx_churn_events_event_date ON churn_events(event_date);
CREATE INDEX IF NOT EXISTS idx_server_health_server_id ON server_health(server_id);
CREATE INDEX IF NOT EXISTS idx_server_health_timestamp ON server_health(timestamp);
CREATE INDEX IF NOT EXISTS idx_container_metrics_pod_name ON container_metrics(pod_name);
CREATE INDEX IF NOT EXISTS idx_container_metrics_timestamp ON container_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_deployment_queue_status ON deployment_queue(status);
CREATE INDEX IF NOT EXISTS idx_deployment_queue_project_id ON deployment_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_retry_config_user_id ON payment_retry_config(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_configuration_country ON tax_configuration(country_code);
CREATE INDEX IF NOT EXISTS idx_user_geography_user_id ON user_geography(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_performance_timestamp ON platform_performance(timestamp);

-- Create triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON affiliates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON discount_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_payouts_updated_at BEFORE UPDATE ON affiliate_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_announcements_updated_at BEFORE UPDATE ON system_announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_retry_config_updated_at BEFORE UPDATE ON payment_retry_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_configuration_updated_at BEFORE UPDATE ON tax_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_exempt_users_updated_at BEFORE UPDATE ON tax_exempt_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Extend audit_logs table with admin-specific action types
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS admin_action BOOLEAN DEFAULT false;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS requires_2fa BOOLEAN DEFAULT false;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add subscription tier to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
