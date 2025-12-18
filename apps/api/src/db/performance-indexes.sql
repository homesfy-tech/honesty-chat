-- Performance Optimization Indexes for MySQL
-- Run this to add additional indexes for better query performance
-- Especially important for 1000+ microsites and high traffic

-- Composite index for common lead queries (microsite + date)
CREATE INDEX IF NOT EXISTS idx_leads_microsite_created 
ON leads(microsite, created_at DESC);

-- Composite index for status-based queries
CREATE INDEX IF NOT EXISTS idx_leads_status_created 
ON leads(status, created_at DESC);

-- Composite index for microsite + status queries
CREATE INDEX IF NOT EXISTS idx_leads_microsite_status 
ON leads(microsite, status);

-- Note: MySQL doesn't support GIN indexes for JSON (PostgreSQL feature)
-- For JSON queries, consider adding generated columns or use JSON_EXTRACT in queries
-- Example: ALTER TABLE leads ADD COLUMN project_id_extracted VARCHAR(255) AS (JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.projectId'))) STORED;
-- Then: CREATE INDEX idx_leads_project_id_extracted ON leads(project_id_extracted);

-- Composite index for chat sessions (project + date)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_project_created 
ON chat_sessions(project_id, created_at DESC);

-- Composite index for chat sessions (microsite + date)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_microsite_created 
ON chat_sessions(microsite, created_at DESC);

-- Composite index for events (project + type + date)
CREATE INDEX IF NOT EXISTS idx_events_project_type_created 
ON events(project_id, type, created_at DESC);

-- Index for events microsite lookups
CREATE INDEX IF NOT EXISTS idx_events_microsite_created 
ON events(microsite, created_at DESC);

-- Note: MySQL 8.0+ supports functional indexes, but older versions don't support partial indexes
-- For MySQL 5.7, we can't create partial indexes with WHERE clause
-- The following would work in MySQL 8.0+:
-- CREATE INDEX idx_leads_active ON leads(created_at DESC) WHERE status IN ('new', 'contacted');

-- For MySQL 5.7 compatibility, create regular indexes instead:
CREATE INDEX IF NOT EXISTS idx_leads_active 
ON leads(status, created_at DESC);

-- Update table statistics (MySQL equivalent of ANALYZE)
-- Note: MySQL automatically updates statistics, but you can force update with:
-- ANALYZE TABLE leads, chat_sessions, events, widget_configs;
