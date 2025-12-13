-- Project Suspension Schema
-- Supports idle project suspension and wake-on-request functionality

-- Add suspension-related columns to projects table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'status') THEN
    ALTER TABLE projects ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    COMMENT ON COLUMN projects.status IS 'Project status: active, suspended, or waking';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'last_activity') THEN
    ALTER TABLE projects ADD COLUMN last_activity TIMESTAMP DEFAULT NOW();
    COMMENT ON COLUMN projects.last_activity IS 'Timestamp of last project activity';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'suspended_at') THEN
    ALTER TABLE projects ADD COLUMN suspended_at TIMESTAMP;
    COMMENT ON COLUMN projects.suspended_at IS 'Timestamp when project was suspended';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'projects' AND column_name = 'suspended_state') THEN
    ALTER TABLE projects ADD COLUMN suspended_state JSONB;
    COMMENT ON COLUMN projects.suspended_state IS 'Captured state before suspension';
  END IF;
END $$;

-- Project notifications table for suspension warnings
CREATE TABLE IF NOT EXISTS project_notifications (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  days_before INTEGER,
  sent_at TIMESTAMP DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP,
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_notifications_project_id ON project_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_notifications_type ON project_notifications(type);
CREATE INDEX IF NOT EXISTS idx_project_notifications_sent_at ON project_notifications(sent_at);

COMMENT ON TABLE project_notifications IS 'Notifications sent to users about project suspension';

-- Project configurations table
CREATE TABLE IF NOT EXISTS project_configs (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_project_config FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT unique_project_config UNIQUE (project_id, config_key)
);

CREATE INDEX IF NOT EXISTS idx_project_configs_project_id ON project_configs(project_id);

COMMENT ON TABLE project_configs IS 'Project configuration settings';

-- Project services table
CREATE TABLE IF NOT EXISTS project_services (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'stopped',
  container_id VARCHAR(255),
  image VARCHAR(255),
  ports JSONB,
  environment JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_project_service FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_services_project_id ON project_services(project_id);
CREATE INDEX IF NOT EXISTS idx_project_services_status ON project_services(status);

COMMENT ON TABLE project_services IS 'Services running for each project';

-- Project environment variables table
CREATE TABLE IF NOT EXISTS project_env (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  encrypted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_project_env FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT unique_project_env UNIQUE (project_id, key)
);

CREATE INDEX IF NOT EXISTS idx_project_env_project_id ON project_env(project_id);

COMMENT ON TABLE project_env IS 'Environment variables for projects';

-- Project activity log
CREATE TABLE IF NOT EXISTS project_activity_log (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_project_activity FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_activity_log_project_id ON project_activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_log_timestamp ON project_activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_project_activity_log_type ON project_activity_log(activity_type);

COMMENT ON TABLE project_activity_log IS 'Log of all project activities';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_last_activity ON projects(last_activity);
CREATE INDEX IF NOT EXISTS idx_projects_suspended_at ON projects(suspended_at);

-- Compound index for optimized idle project queries
CREATE INDEX IF NOT EXISTS idx_projects_status_activity ON projects(status, last_activity)
WHERE status = 'active';

-- Function to update last_activity timestamp
CREATE OR REPLACE FUNCTION update_project_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects 
  SET last_activity = NOW() 
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_activity on activity log
DROP TRIGGER IF EXISTS trigger_update_project_activity ON project_activity_log;
CREATE TRIGGER trigger_update_project_activity
  AFTER INSERT ON project_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION update_project_activity();

-- View for projects at risk of suspension
CREATE OR REPLACE VIEW projects_at_risk AS
SELECT 
  p.id,
  p.name,
  p.user_id,
  p.status,
  p.last_activity,
  EXTRACT(EPOCH FROM (NOW() - p.last_activity)) / 86400 AS days_since_activity,
  30 - EXTRACT(EPOCH FROM (NOW() - p.last_activity)) / 86400 AS days_until_suspension
FROM projects p
WHERE p.status = 'active'
  AND p.last_activity < NOW() - INTERVAL '23 days'
ORDER BY p.last_activity ASC;

COMMENT ON VIEW projects_at_risk IS 'Projects that are within 7 days of being suspended';

-- View for suspension statistics
CREATE OR REPLACE VIEW suspension_statistics AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') as active_projects,
  COUNT(*) FILTER (WHERE status = 'suspended') as suspended_projects,
  COUNT(*) FILTER (WHERE status = 'waking') as waking_projects,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_activity)) / 86400)::INTEGER as avg_days_since_activity,
  COUNT(*) FILTER (WHERE last_activity < NOW() - INTERVAL '30 days' AND status = 'active') as projects_eligible_for_suspension
FROM projects;

COMMENT ON VIEW suspension_statistics IS 'Overall suspension statistics';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON project_notifications TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON project_configs TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON project_services TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON project_env TO your_app_user;
-- GRANT SELECT, INSERT ON project_activity_log TO your_app_user;
-- GRANT SELECT ON projects_at_risk TO your_app_user;
-- GRANT SELECT ON suspension_statistics TO your_app_user;
