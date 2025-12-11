-- PostgreSQL Schema for Homesfy Chat Buddy
-- Run this to create all tables

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for authentication tokens
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20),
    bhk_type VARCHAR(50) NOT NULL,
    bhk INTEGER,
    microsite VARCHAR(255) NOT NULL,
    lead_source VARCHAR(100) DEFAULT 'ChatWidget',
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
    metadata JSONB DEFAULT '{}',
    conversation JSONB DEFAULT '[]',
    location JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_microsite ON leads(microsite);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_phone_microsite ON leads(phone, microsite);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    microsite VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    bhk_type VARCHAR(50),
    conversation JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    location JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_microsite ON chat_sessions(microsite);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lead_id ON chat_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_project_id ON chat_sessions(project_id);

-- Events table for analytics
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    microsite VARCHAR(255),
    payload JSONB DEFAULT '{}',
    location JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
CREATE INDEX IF NOT EXISTS idx_events_microsite ON events(microsite);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Widget config table
CREATE TABLE IF NOT EXISTS widget_configs (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) UNIQUE NOT NULL,
    agent_name VARCHAR(255) DEFAULT 'Riya from Homesfy',
    avatar_url VARCHAR(500) DEFAULT 'https://cdn.homesfy.com/assets/riya-avatar.png',
    primary_color VARCHAR(20) DEFAULT '#6158ff',
    followup_message TEXT DEFAULT 'Sure… I''ll send that across right away!',
    bhk_prompt TEXT DEFAULT 'Which configuration you are looking for?',
    inventory_message TEXT DEFAULT 'That''s cool… we have inventory available with us.',
    phone_prompt TEXT DEFAULT 'Please enter your mobile number...',
    thank_you_message TEXT DEFAULT 'Thanks! Our expert will call you shortly 📞',
    bubble_position VARCHAR(20) DEFAULT 'bottom-right' CHECK (bubble_position IN ('bottom-right', 'bottom-left')),
    auto_open_delay_ms INTEGER DEFAULT 4000,
    welcome_message TEXT DEFAULT 'Hi, I''m Riya from Homesfy 👋\nHow can I help you today?',
    property_info JSONB DEFAULT '{}',
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for widget_configs
CREATE INDEX IF NOT EXISTS idx_widget_configs_project_id ON widget_configs(project_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_configs_updated_at BEFORE UPDATE ON widget_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

