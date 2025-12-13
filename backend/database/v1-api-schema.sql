-- API v1 Platform Schema
-- This schema extends the existing database with tables for the comprehensive REST API platform

-- Projects table (if not exists)
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template VARCHAR(50),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cloned_from INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'building', 'deploying', 'active', 'failed', 'rolling_back')),
    build_logs TEXT,
    deployment_url VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deployed_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    events JSONB NOT NULL,
    secret VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_project_id ON webhooks(project_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);

-- Webhook deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
    attempts INTEGER DEFAULT 0,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- Resource usage table
CREATE TABLE IF NOT EXISTS resource_usage (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    metric VARCHAR(50) NOT NULL CHECK (metric IN ('cpu', 'memory', 'storage', 'bandwidth')),
    value DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_usage_project_id ON resource_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_metric ON resource_usage(metric);
CREATE INDEX IF NOT EXISTS idx_resource_usage_timestamp ON resource_usage(timestamp);

-- Subscriptions table (if not exists)
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    cpu_limit INTEGER,
    memory_limit INTEGER,
    storage_limit INTEGER,
    bandwidth_limit INTEGER,
    max_projects INTEGER,
    features JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User subscriptions table (if not exists)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Billing transactions table (if not exists)
CREATE TABLE IF NOT EXISTS billing_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id ON billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status ON billing_transactions(status);

-- AI Agents table
CREATE TABLE IF NOT EXISTS ai_agents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    version VARCHAR(20),
    capabilities JSONB,
    parameters_schema JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_category ON ai_agents(category);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON ai_agents(active);

-- AI Agent invocations table
CREATE TABLE IF NOT EXISTS ai_agent_invocations (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL REFERENCES ai_agents(id),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    input JSONB NOT NULL,
    context JSONB,
    parameters JSONB,
    output JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    tokens_used INTEGER,
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_invocations_agent_id ON ai_agent_invocations(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_invocations_user_id ON ai_agent_invocations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_invocations_status ON ai_agent_invocations(status);

-- ML Models table
CREATE TABLE IF NOT EXISTS ml_models (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) CHECK (type IN ('classification', 'regression', 'nlp', 'cv')),
    version VARCHAR(20),
    input_schema JSONB,
    output_schema JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_models_type ON ml_models(type);
CREATE INDEX IF NOT EXISTS idx_ml_models_active ON ml_models(active);

-- ML Predictions table
CREATE TABLE IF NOT EXISTS ml_predictions (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(50) NOT NULL REFERENCES ml_models(id),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    input JSONB NOT NULL,
    parameters JSONB,
    output JSONB,
    confidence DECIMAL(5, 4),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_model_id ON ml_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_id ON ml_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_status ON ml_predictions(status);

-- Insert sample AI agents
INSERT INTO ai_agents (id, name, description, category, version, capabilities, active)
VALUES
    ('code-assistant', 'Code Assistant', 'AI-powered code completion and assistance', 'development', '1.0.0', '{"languages": ["javascript", "python", "typescript", "java"]}', true),
    ('code-review', 'Code Reviewer', 'Automated code review and suggestions', 'development', '1.0.0', '{"analysis": ["security", "performance", "best-practices"]}', true),
    ('documentation-generator', 'Documentation Generator', 'Automatic documentation generation', 'development', '1.0.0', '{"formats": ["markdown", "html", "pdf"]}', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample ML models
INSERT INTO ml_models (id, name, description, type, version, active)
VALUES
    ('sentiment-analysis', 'Sentiment Analysis', 'Analyze sentiment in text', 'nlp', '1.0.0', true),
    ('image-classification', 'Image Classification', 'Classify images into categories', 'cv', '1.0.0', true),
    ('text-classification', 'Text Classification', 'Classify text into categories', 'nlp', '1.0.0', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample subscriptions (if not exists)
INSERT INTO subscriptions (name, price, billing_period, cpu_limit, memory_limit, storage_limit, bandwidth_limit, max_projects, features)
VALUES
    ('Free', 0.00, 'monthly', 1, 512, 1024, 10240, 3, '{"support": "community"}'),
    ('Pro', 29.99, 'monthly', 4, 2048, 10240, 102400, 10, '{"support": "email", "priority": "normal"}'),
    ('Enterprise', 99.99, 'monthly', 16, 8192, 102400, 1048576, 50, '{"support": "priority", "custom": true}')
ON CONFLICT DO NOTHING;
