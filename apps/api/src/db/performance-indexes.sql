-- Performance Optimization Indexes
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

-- Index for project ID lookups in metadata (JSONB)
-- This allows fast queries on metadata->>'projectId'
CREATE INDEX IF NOT EXISTS idx_leads_metadata_project_id 
ON leads USING GIN ((metadata->>'projectId'));

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

-- Partial index for active leads (status = 'new' or 'contacted')
CREATE INDEX IF NOT EXISTS idx_leads_active 
ON leads(created_at DESC) 
WHERE status IN ('new', 'contacted');

-- Partial index for recent leads (last 30 days)
-- This helps with dashboard queries showing recent activity
CREATE INDEX IF NOT EXISTS idx_leads_recent 
ON leads(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- Index for phone number lookups (already exists, but ensure it's there)
-- CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

-- Analyze tables to update statistics (helps query planner)
ANALYZE leads;
ANALYZE chat_sessions;
ANALYZE events;
ANALYZE widget_configs;

