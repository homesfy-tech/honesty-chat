-- MySQL Schema for Homesfy Chat Buddy
-- Run this to create all tables

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sessions table for authentication tokens
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20),
    bhk_type VARCHAR(50) NOT NULL,
    bhk INT,
    microsite VARCHAR(255) NOT NULL,
    lead_source VARCHAR(100) DEFAULT 'ChatWidget',
    status VARCHAR(50) DEFAULT 'new',
    metadata JSON DEFAULT ('{}'),
    conversation JSON DEFAULT ('[]'),
    location JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (status IN ('new', 'contacted', 'qualified', 'closed'))
);

-- Create indexes for leads (ignore errors if index already exists)
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_microsite ON leads(microsite);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_phone_microsite ON leads(phone, microsite);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    microsite VARCHAR(255) NOT NULL,
    project_id VARCHAR(255),
    lead_id INT,
    phone VARCHAR(20),
    bhk_type VARCHAR(50),
    conversation JSON DEFAULT ('[]'),
    metadata JSON DEFAULT ('{}'),
    location JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

-- Create indexes for chat_sessions (ignore errors if index already exists)
CREATE INDEX idx_chat_sessions_microsite ON chat_sessions(microsite);
CREATE INDEX idx_chat_sessions_lead_id ON chat_sessions(lead_id);
CREATE INDEX idx_chat_sessions_project_id ON chat_sessions(project_id);

-- Events table for analytics
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    microsite VARCHAR(255),
    payload JSON DEFAULT ('{}'),
    location JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for events (ignore errors if index already exists)
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_project_id ON events(project_id);
CREATE INDEX idx_events_microsite ON events(microsite);
CREATE INDEX idx_events_created_at ON events(created_at);

-- Widget config table
CREATE TABLE IF NOT EXISTS widget_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(255) UNIQUE NOT NULL,
    agent_name VARCHAR(255) DEFAULT 'Riya from Homesfy',
    avatar_url VARCHAR(500) DEFAULT 'https://cdn.homesfy.com/assets/riya-avatar.png',
    primary_color VARCHAR(20) DEFAULT '#6158ff',
    followup_message TEXT,
    bhk_prompt TEXT,
    inventory_message TEXT,
    phone_prompt TEXT,
    thank_you_message TEXT,
    bubble_position VARCHAR(20) DEFAULT 'bottom-right',
    auto_open_delay_ms INT DEFAULT 4000,
    welcome_message TEXT,
    property_info JSON DEFAULT ('{}'),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (bubble_position IN ('bottom-right', 'bottom-left'))
);

-- Create index for widget_configs (ignore errors if index already exists)
CREATE INDEX idx_widget_configs_project_id ON widget_configs(project_id);
