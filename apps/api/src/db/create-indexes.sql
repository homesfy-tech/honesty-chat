-- Create indexes (ignore errors if they already exist)
-- This file can be run multiple times safely

-- Indexes for leads table
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_microsite ON leads(microsite);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_phone_microsite ON leads(phone, microsite);

-- Indexes for chat_sessions table
CREATE INDEX idx_chat_sessions_microsite ON chat_sessions(microsite);
CREATE INDEX idx_chat_sessions_lead_id ON chat_sessions(lead_id);
CREATE INDEX idx_chat_sessions_project_id ON chat_sessions(project_id);

-- Indexes for events table
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_project_id ON events(project_id);
CREATE INDEX idx_events_microsite ON events(microsite);
CREATE INDEX idx_events_created_at ON events(created_at);

-- Index for widget_configs table
CREATE INDEX idx_widget_configs_project_id ON widget_configs(project_id);

