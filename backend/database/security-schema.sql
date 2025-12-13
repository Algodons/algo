-- Security and Compliance Schema
-- Database schema for security features, audit logging, and compliance

-- ============================================================================
-- IP Whitelist Configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS ip_whitelist_config (
  organization_id INTEGER PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  allowed_ips JSONB,
  allowed_ranges JSONB,
  block_message TEXT,
  log_blocked_attempts BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_ip_blocks (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  path TEXT NOT NULL,
  blocked_at TIMESTAMP DEFAULT NOW(),
  user_id INTEGER,
  organization_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ip_blocks_ip ON security_ip_blocks(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blocks_time ON security_ip_blocks(blocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_blocks_org ON security_ip_blocks(organization_id);

-- ============================================================================
-- Audit Logging
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  
  -- Actor
  user_id INTEGER,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  session_id VARCHAR(255),
  
  -- Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  organization_id INTEGER,
  
  -- Target
  target_type VARCHAR(100),
  target_id VARCHAR(255),
  target_name VARCHAR(255),
  
  -- Action
  action VARCHAR(255) NOT NULL,
  resource VARCHAR(255),
  method VARCHAR(10),
  path TEXT,
  
  -- Results
  success BOOLEAN NOT NULL,
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Additional data
  metadata JSONB,
  changes JSONB,
  
  -- Tamper detection
  previous_hash VARCHAR(64),
  log_hash VARCHAR(64) NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);

-- ============================================================================
-- GDPR Compliance
-- ============================================================================

-- Consent management
CREATE TABLE IF NOT EXISTS user_consents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  consent_type VARCHAR(50) NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);

-- Data export requests (right to data portability)
CREATE TABLE IF NOT EXISTS data_export_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  download_url TEXT,
  expires_at TIMESTAMP,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);

-- Data deletion requests (right to erasure)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  requested_at TIMESTAMP DEFAULT NOW(),
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_scheduled ON data_deletion_requests(scheduled_at);

-- Data retention policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id SERIAL PRIMARY KEY,
  data_type VARCHAR(100) NOT NULL UNIQUE,
  retention_period_days INTEGER NOT NULL,
  purpose VARCHAR(100) NOT NULL,
  legal_basis TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Data processing records
CREATE TABLE IF NOT EXISTS data_processing_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  purpose VARCHAR(100) NOT NULL,
  data_types TEXT[] NOT NULL,
  legal_basis VARCHAR(100) NOT NULL,
  recipients TEXT[],
  retention_period VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_processing_records_user_id ON data_processing_records(user_id);

-- ============================================================================
-- SOC 2 Compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS soc2_compliance_checks (
  id SERIAL PRIMARY KEY,
  control_id VARCHAR(20) NOT NULL,
  check_timestamp TIMESTAMP NOT NULL,
  passed BOOLEAN NOT NULL,
  findings TEXT,
  evidence TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_control_id ON soc2_compliance_checks(control_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_timestamp ON soc2_compliance_checks(check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_passed ON soc2_compliance_checks(passed);

CREATE TABLE IF NOT EXISTS soc2_control_evidence (
  id SERIAL PRIMARY KEY,
  control_id VARCHAR(20) NOT NULL,
  evidence_type VARCHAR(100) NOT NULL,
  description TEXT,
  file_path TEXT,
  collected_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_control_evidence_control_id ON soc2_control_evidence(control_id);

CREATE TABLE IF NOT EXISTS soc2_audit_reports (
  id SERIAL PRIMARY KEY,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  auditor VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  findings TEXT,
  recommendations TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SAML Authentication
-- ============================================================================

CREATE TABLE IF NOT EXISTS saml_providers (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  provider_name VARCHAR(100) NOT NULL,
  provider_type VARCHAR(50) NOT NULL, -- okta, azure, generic
  entity_id VARCHAR(255) NOT NULL,
  sso_url TEXT NOT NULL,
  certificate TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, provider_name)
);

CREATE TABLE IF NOT EXISTS saml_sessions (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER,
  provider_id INTEGER REFERENCES saml_providers(id),
  name_id VARCHAR(255),
  session_index VARCHAR(255),
  attributes JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saml_sessions_user_id ON saml_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_saml_sessions_expires ON saml_sessions(expires_at);

-- ============================================================================
-- Security Incidents
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_incidents (
  id SERIAL PRIMARY KEY,
  incident_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  affected_users INTEGER[],
  affected_systems TEXT[],
  detected_at TIMESTAMP NOT NULL,
  reported_at TIMESTAMP,
  resolved_at TIMESTAMP,
  root_cause TEXT,
  remediation_steps TEXT,
  lessons_learned TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_type ON security_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_detected ON security_incidents(detected_at DESC);

-- ============================================================================
-- Encryption Key Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS encryption_keys (
  id SERIAL PRIMARY KEY,
  key_id UUID UNIQUE NOT NULL,
  key_type VARCHAR(50) NOT NULL, -- master, data, backup
  algorithm VARCHAR(50) NOT NULL,
  key_length INTEGER NOT NULL,
  encrypted_key TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, rotated, deprecated
  created_at TIMESTAMP DEFAULT NOW(),
  rotated_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_key_id ON encryption_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_status ON encryption_keys(status);

CREATE TABLE IF NOT EXISTS key_rotation_log (
  id SERIAL PRIMARY KEY,
  old_key_id UUID NOT NULL,
  new_key_id UUID NOT NULL,
  rotation_reason VARCHAR(100),
  rotated_by INTEGER,
  rotated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- ============================================================================
-- Rate Limiting
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  user_id INTEGER,
  endpoint VARCHAR(255) NOT NULL,
  limit_type VARCHAR(50) NOT NULL,
  requests_count INTEGER NOT NULL,
  limit_threshold INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL,
  blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip ON rate_limit_violations(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user ON rate_limit_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_time ON rate_limit_violations(created_at DESC);

-- ============================================================================
-- Security Metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- counter, gauge, histogram
  labels JSONB,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_metrics_name ON security_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_security_metrics_time ON security_metrics(recorded_at DESC);

-- ============================================================================
-- Views for Reporting
-- ============================================================================

-- Security dashboard view
CREATE OR REPLACE VIEW security_dashboard AS
SELECT
  (SELECT COUNT(*) FROM audit_logs WHERE timestamp > NOW() - INTERVAL '24 hours') as audit_events_24h,
  (SELECT COUNT(*) FROM audit_logs WHERE severity = 'critical' AND timestamp > NOW() - INTERVAL '24 hours') as critical_events_24h,
  (SELECT COUNT(*) FROM security_incidents WHERE status = 'open') as open_incidents,
  (SELECT COUNT(*) FROM rate_limit_violations WHERE created_at > NOW() - INTERVAL '1 hour') as rate_limit_violations_1h,
  (SELECT COUNT(*) FROM security_ip_blocks WHERE blocked_at > NOW() - INTERVAL '24 hours') as ip_blocks_24h,
  (SELECT COUNT(*) FROM data_deletion_requests WHERE status = 'pending') as pending_deletion_requests,
  (SELECT COUNT(*) FROM data_export_requests WHERE status = 'pending') as pending_export_requests;

-- Compliance metrics view
CREATE OR REPLACE VIEW compliance_metrics AS
SELECT
  (SELECT COUNT(*) FROM user_consents WHERE granted = true) as total_consents_granted,
  (SELECT COUNT(*) FROM data_retention_policies) as retention_policies_defined,
  (SELECT COUNT(*) FROM soc2_compliance_checks WHERE check_timestamp > NOW() - INTERVAL '30 days' AND passed = true) as soc2_checks_passed_30d,
  (SELECT COUNT(*) FROM soc2_compliance_checks WHERE check_timestamp > NOW() - INTERVAL '30 days' AND passed = false) as soc2_checks_failed_30d,
  (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - requested_at))/3600) FROM data_export_requests WHERE completed_at IS NOT NULL) as avg_export_completion_hours;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to clean up old audit logs (respecting retention policy)
CREATE OR REPLACE FUNCTION archive_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- In production, move to archive table instead of deleting
  -- For now, just count what would be archived
  SELECT COUNT(*) INTO archived_count
  FROM audit_logs
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to execute scheduled data deletions
CREATE OR REPLACE FUNCTION process_scheduled_deletions()
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  deletion_record RECORD;
BEGIN
  FOR deletion_record IN 
    SELECT id, user_id 
    FROM data_deletion_requests 
    WHERE status = 'scheduled' AND scheduled_at <= NOW()
  LOOP
    -- Update status to processing
    UPDATE data_deletion_requests 
    SET status = 'processing' 
    WHERE id = deletion_record.id;
    
    -- Anonymize user data (actual implementation would go here)
    -- This is a placeholder
    
    -- Mark as completed
    UPDATE data_deletion_requests 
    SET status = 'completed', completed_at = NOW() 
    WHERE id = deletion_record.id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ip_whitelist_config_updated_at
  BEFORE UPDATE ON ip_whitelist_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saml_providers_updated_at
  BEFORE UPDATE ON saml_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Immutable audit log with hash chain for tamper detection';
COMMENT ON TABLE user_consents IS 'GDPR consent management';
COMMENT ON TABLE data_export_requests IS 'GDPR right to data portability';
COMMENT ON TABLE data_deletion_requests IS 'GDPR right to erasure (right to be forgotten)';
COMMENT ON TABLE soc2_compliance_checks IS 'SOC 2 Type II automated compliance checks';
COMMENT ON TABLE security_incidents IS 'Security incident tracking and response';
COMMENT ON TABLE encryption_keys IS 'Encryption key management and rotation';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant read access to application user
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO algo;

-- Grant write access only to specific tables
-- GRANT INSERT, UPDATE ON audit_logs TO algo;
-- GRANT INSERT, UPDATE ON user_consents TO algo;
-- etc.
