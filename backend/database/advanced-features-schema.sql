-- Advanced Features Schema for Hackathon-Winning Admin System
-- AI, Blockchain, Gamification, Real-time Analytics, Accessibility, and Infrastructure

-- ============================================================================
-- AI & PREDICTIVE ANALYTICS
-- ============================================================================

-- Churn Predictions
CREATE TABLE IF NOT EXISTS churn_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    probability DECIMAL(5,4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    factors JSONB NOT NULL,
    recommended_actions JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_churn_user (user_id),
    INDEX idx_churn_risk (risk_level),
    INDEX idx_churn_created (created_at)
);

-- Upsell Opportunities
CREATE TABLE IF NOT EXISTS upsell_opportunities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_tier VARCHAR(50) NOT NULL,
    suggested_tier VARCHAR(50) NOT NULL,
    probability DECIMAL(5,4) NOT NULL,
    expected_revenue DECIMAL(10,2) NOT NULL,
    optimal_timing_days INTEGER NOT NULL,
    reasoning JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'presented', 'accepted', 'rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    presented_at TIMESTAMP,
    INDEX idx_upsell_user (user_id),
    INDEX idx_upsell_status (status),
    INDEX idx_upsell_timing (optimal_timing_days)
);

-- Fraud Detection Events
CREATE TABLE IF NOT EXISTS fraud_detection_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    fraud_score DECIMAL(5,4) NOT NULL CHECK (fraud_score >= 0 AND fraud_score <= 1),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    anomalies JSONB NOT NULL,
    requires_review BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_fraud_user (user_id),
    INDEX idx_fraud_risk (risk_level),
    INDEX idx_fraud_review (requires_review),
    INDEX idx_fraud_created (created_at)
);

-- ML Models (extends existing)
CREATE TABLE IF NOT EXISTS ml_models (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('classification', 'regression', 'nlp', 'cv')),
    version VARCHAR(50) NOT NULL,
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ML Predictions
CREATE TABLE IF NOT EXISTS ml_predictions (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(100) NOT NULL REFERENCES ml_models(id),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    input JSONB NOT NULL,
    parameters JSONB,
    output JSONB,
    confidence DECIMAL(5,4),
    execution_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    INDEX idx_pred_model (model_id),
    INDEX idx_pred_user (user_id),
    INDEX idx_pred_status (status)
);

-- ============================================================================
-- GAMIFICATION & ACHIEVEMENTS
-- ============================================================================

-- Gamification Statistics
CREATE TABLE IF NOT EXISTS gamification_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    overall_score INTEGER DEFAULT 0,
    referral_score INTEGER DEFAULT 0,
    revenue_score INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]',
    last_activity_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Achievement Definitions
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('sales', 'referral', 'engagement', 'milestone', 'special')),
    points INTEGER NOT NULL,
    icon_url VARCHAR(500),
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    requirements JSONB NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL REFERENCES achievement_definitions(id),
    unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, achievement_id),
    INDEX idx_user_ach_user (user_id),
    INDEX idx_user_ach_unlocked (unlocked_at)
);

-- Milestone Definitions
CREATE TABLE IF NOT EXISTS milestone_definitions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metric VARCHAR(50) NOT NULL CHECK (metric IN ('referrals', 'revenue', 'level', 'streak')),
    required_value INTEGER NOT NULL,
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('credit', 'discount', 'feature_unlock', 'badge', 'nft')),
    reward_value VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User Milestones
CREATE TABLE IF NOT EXISTS user_milestones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_id VARCHAR(100) NOT NULL REFERENCES milestone_definitions(id),
    claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, milestone_id),
    INDEX idx_user_milestone_user (user_id)
);

-- Notification Events
CREATE TABLE IF NOT EXISTS notification_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_notif_user (user_id),
    INDEX idx_notif_read (read),
    INDEX idx_notif_created (created_at)
);

-- ============================================================================
-- BLOCKCHAIN & WEB3
-- ============================================================================

-- Cryptocurrency Payments
CREATE TABLE IF NOT EXISTS crypto_payments (
    id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20,8) NOT NULL,
    cryptocurrency VARCHAR(10) NOT NULL CHECK (cryptocurrency IN ('BTC', 'ETH', 'USDT', 'USDC')),
    wallet_address VARCHAR(255) NOT NULL,
    transaction_hash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    confirmations INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    INDEX idx_crypto_user (user_id),
    INDEX idx_crypto_status (status),
    INDEX idx_crypto_tx (transaction_hash)
);

-- NFT Rewards
CREATE TABLE IF NOT EXISTS nft_rewards (
    id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL,
    token_id VARCHAR(255) NOT NULL,
    contract_address VARCHAR(255) NOT NULL,
    metadata JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'minting', 'minted', 'failed')),
    blockchain_tx_hash VARCHAR(255),
    minted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_nft_user (user_id),
    INDEX idx_nft_status (status),
    INDEX idx_nft_token (token_id)
);

-- Web3 Wallets
CREATE TABLE IF NOT EXISTS web3_wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('metamask', 'walletconnect', 'coinbase')),
    verified BOOLEAN DEFAULT false,
    connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_wallet_address (address)
);

-- Blockchain Audit Logs (immutable)
CREATE TABLE IF NOT EXISTS blockchain_audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    metadata JSONB NOT NULL,
    blockchain_hash VARCHAR(255) NOT NULL UNIQUE,
    block_number BIGINT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_blockchain_audit_admin (admin_id),
    INDEX idx_blockchain_audit_hash (blockchain_hash),
    INDEX idx_blockchain_audit_timestamp (timestamp)
);

-- ============================================================================
-- REAL-TIME ANALYTICS & DASHBOARDS
-- ============================================================================

-- Custom Dashboards
CREATE TABLE IF NOT EXISTS custom_dashboards (
    id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    widgets JSONB NOT NULL,
    layout VARCHAR(20) DEFAULT 'grid' CHECK (layout IN ('grid', 'flex')),
    shared BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_dashboard_user (user_id),
    INDEX idx_dashboard_shared (shared)
);

-- Revenue Simulations
CREATE TABLE IF NOT EXISTS revenue_simulations (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id),
    current_mrr DECIMAL(12,2) NOT NULL,
    projected_mrr DECIMAL(12,2) NOT NULL,
    changes JSONB NOT NULL,
    total_impact DECIMAL(12,2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_sim_admin (admin_id),
    INDEX idx_sim_created (created_at)
);

-- ============================================================================
-- ACCESSIBILITY & TRANSLATION
-- ============================================================================

-- Language Preferences
CREATE TABLE IF NOT EXISTS language_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    auto_translate BOOLEAN DEFAULT false,
    voice_enabled BOOLEAN DEFAULT false,
    screen_reader_optimized BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Translations Cache
CREATE TABLE IF NOT EXISTS translations (
    id SERIAL PRIMARY KEY,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_lang VARCHAR(10) NOT NULL,
    target_lang VARCHAR(10) NOT NULL,
    confidence DECIMAL(5,4),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_trans_langs (source_lang, target_lang),
    INDEX idx_trans_created (created_at)
);

-- Voice Commands
CREATE TABLE IF NOT EXISTS voice_commands (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    command_text TEXT NOT NULL,
    action VARCHAR(100) NOT NULL,
    parameters JSONB,
    confidence DECIMAL(5,4),
    executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_voice_user (user_id),
    INDEX idx_voice_executed (executed_at)
);

-- Accessibility Reports
CREATE TABLE IF NOT EXISTS accessibility_reports (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    level VARCHAR(5) NOT NULL CHECK (level IN ('A', 'AA', 'AAA')),
    issues JSONB NOT NULL,
    passed_rules INTEGER NOT NULL,
    total_rules INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_access_url (url),
    INDEX idx_access_score (score),
    INDEX idx_access_created (created_at)
);

-- ============================================================================
-- INFRASTRUCTURE & MONITORING
-- ============================================================================

-- Predictive Alerts
CREATE TABLE IF NOT EXISTS predictive_alerts (
    id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('resource_exhaustion', 'pod_failure', 'node_pressure', 'network_issue')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    prediction TEXT NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    estimated_time_to_impact INTEGER NOT NULL,
    suggested_actions JSONB NOT NULL,
    auto_remediation BOOLEAN DEFAULT false,
    auto_remediation_executed BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    INDEX idx_pred_alert_type (type),
    INDEX idx_pred_alert_severity (severity),
    INDEX idx_pred_alert_created (created_at)
);

-- Infrastructure Recoveries
CREATE TABLE IF NOT EXISTS infrastructure_recoveries (
    id VARCHAR(100) PRIMARY KEY,
    incident TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    automated BOOLEAN DEFAULT false,
    actions JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    result TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    INDEX idx_infra_recovery_status (status),
    INDEX idx_infra_recovery_severity (severity),
    INDEX idx_infra_recovery_started (started_at)
);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_gamification_stats_updated_at BEFORE UPDATE ON gamification_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_dashboards_updated_at BEFORE UPDATE ON custom_dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_language_preferences_updated_at BEFORE UPDATE ON language_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_churn_user_risk ON churn_predictions(user_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_user_risk ON fraud_detection_events(user_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_achievement_category ON achievement_definitions(category, active);
CREATE INDEX IF NOT EXISTS idx_milestone_metric ON milestone_definitions(metric, active);
CREATE INDEX IF NOT EXISTS idx_crypto_user_status ON crypto_payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_nft_user_status ON nft_rewards(user_id, status);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default achievement definitions
INSERT INTO achievement_definitions (id, name, description, category, points, icon_url, rarity, requirements) VALUES
('first_referral', 'First Blood', 'Make your first referral', 'referral', 100, '/badges/first_referral.png', 'common', '{"referrals": 1}'),
('ten_referrals', 'Rising Star', 'Successfully refer 10 users', 'referral', 500, '/badges/ten_referrals.png', 'uncommon', '{"referrals": 10}'),
('hundred_referrals', 'Influencer', 'Reach 100 referrals', 'referral', 5000, '/badges/hundred_referrals.png', 'epic', '{"referrals": 100}'),
('week_streak', 'Dedicated', 'Maintain a 7-day streak', 'engagement', 250, '/badges/week_streak.png', 'uncommon', '{"streak": 7}'),
('month_streak', 'Committed', 'Maintain a 30-day streak', 'engagement', 1000, '/badges/month_streak.png', 'rare', '{"streak": 30}'),
('revenue_1k', 'Sales Champion', 'Generate $1,000 in referral revenue', 'sales', 2000, '/badges/revenue_1k.png', 'rare', '{"revenue": 1000}'),
('revenue_10k', 'Sales Legend', 'Generate $10,000 in referral revenue', 'sales', 10000, '/badges/revenue_10k.png', 'legendary', '{"revenue": 10000}')
ON CONFLICT (id) DO NOTHING;

-- Insert default milestone definitions
INSERT INTO milestone_definitions (id, name, description, metric, required_value, reward_type, reward_value) VALUES
('milestone_10_ref', '10 Referrals Milestone', 'Reach 10 successful referrals', 'referrals', 10, 'credit', '100'),
('milestone_50_ref', '50 Referrals Milestone', 'Reach 50 successful referrals', 'referrals', 50, 'badge', 'elite_affiliate'),
('milestone_100_ref', '100 Referrals Milestone', 'Reach 100 successful referrals', 'referrals', 100, 'nft', 'affiliate_champion_nft'),
('milestone_level_10', 'Level 10 Milestone', 'Reach level 10', 'level', 10, 'feature_unlock', 'priority_support'),
('milestone_1k_revenue', '$1K Revenue Milestone', 'Generate $1,000 in revenue', 'revenue', 1000, 'credit', '500')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE churn_predictions IS 'AI-powered churn prediction for proactive retention';
COMMENT ON TABLE upsell_opportunities IS 'ML-generated upsell opportunities with optimal timing';
COMMENT ON TABLE fraud_detection_events IS 'Real-time fraud detection with anomaly analysis';
COMMENT ON TABLE gamification_stats IS 'Gamification scores, levels, and achievements for users';
COMMENT ON TABLE achievement_definitions IS 'Definition of all available achievements and badges';
COMMENT ON TABLE crypto_payments IS 'Cryptocurrency payment processing for subscriptions';
COMMENT ON TABLE nft_rewards IS 'NFT rewards tied to achievements and milestones';
COMMENT ON TABLE blockchain_audit_logs IS 'Immutable audit logs stored on blockchain';
COMMENT ON TABLE custom_dashboards IS 'User-created drag-and-drop custom dashboards';
COMMENT ON TABLE predictive_alerts IS 'Predictive infrastructure alerts with auto-remediation';
COMMENT ON TABLE infrastructure_recoveries IS 'Automated infrastructure recovery actions';
COMMENT ON TABLE language_preferences IS 'User language and accessibility preferences';
COMMENT ON TABLE voice_commands IS 'Voice command history for admin controls';
COMMENT ON TABLE accessibility_reports IS 'Automated accessibility compliance reports';
