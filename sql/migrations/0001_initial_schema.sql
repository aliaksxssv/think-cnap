-- Initial database schema for ThinkCNAP (PostgreSQL)
-- This migration creates all required tables

-- Security domains table
CREATE TABLE IF NOT EXISTS security_domains (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Security controls table
CREATE TABLE IF NOT EXISTS security_controls (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (domain_id) REFERENCES security_domains(id) ON DELETE CASCADE
);

-- Action items table
CREATE TABLE IF NOT EXISTS action_items (
    id SERIAL PRIMARY KEY,
    control_id INTEGER NOT NULL,
    measure_id TEXT NOT NULL UNIQUE,
    measure TEXT NOT NULL,
    comment TEXT,
    mitre TEXT,
    tags TEXT,
    FOREIGN KEY (control_id) REFERENCES security_controls(id) ON DELETE CASCADE
);

-- Scoring table (includes default and user-specific scoring)
CREATE TABLE IF NOT EXISTS scoring (
    id SERIAL PRIMARY KEY,
    measure_id TEXT NOT NULL,
    user_id TEXT,
    impact TEXT NOT NULL,
    effort TEXT NOT NULL,
    before_score INTEGER NOT NULL,
    maturity_score INTEGER NOT NULL,
    goal_score INTEGER NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    UNIQUE(measure_id, user_id, is_default),
    FOREIGN KEY (measure_id) REFERENCES action_items(measure_id) ON DELETE CASCADE
);

-- Users table (created but not seeded with data)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    name TEXT,
    google_id TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified INTEGER DEFAULT 0,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- MITRE TTPs table
CREATE TABLE IF NOT EXISTS mitre_ttps (
    id SERIAL PRIMARY KEY,
    tactic TEXT NOT NULL,
    technique TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MITRE exploitation examples table
CREATE TABLE IF NOT EXISTS mitre_exploitation_examples (
    id SERIAL PRIMARY KEY,
    ttp_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    code_block TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ttp_id) REFERENCES mitre_ttps(id) ON DELETE CASCADE
);

-- Measure-TTP relationships table
CREATE TABLE IF NOT EXISTS measure_ttp_relationships (
    id SERIAL PRIMARY KEY,
    measure_id TEXT NOT NULL,
    ttp_id INTEGER NOT NULL,
    FOREIGN KEY (measure_id) REFERENCES action_items(measure_id) ON DELETE CASCADE,
    FOREIGN KEY (ttp_id) REFERENCES mitre_ttps(id) ON DELETE CASCADE,
    UNIQUE(measure_id, ttp_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_controls_domain_id ON security_controls(domain_id);
CREATE INDEX IF NOT EXISTS idx_action_items_control_id ON action_items(control_id);
CREATE INDEX IF NOT EXISTS idx_action_items_measure_id ON action_items(measure_id);
CREATE INDEX IF NOT EXISTS idx_action_items_tags ON action_items(tags);
CREATE INDEX IF NOT EXISTS idx_scoring_measure_id ON scoring(measure_id);
CREATE INDEX IF NOT EXISTS idx_scoring_user_id ON scoring(user_id);
CREATE INDEX IF NOT EXISTS idx_scoring_is_default ON scoring(is_default);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_mitre_exploitation_examples_ttp_id ON mitre_exploitation_examples(ttp_id);
CREATE INDEX IF NOT EXISTS idx_measure_ttp_relationships_measure_id ON measure_ttp_relationships(measure_id);
CREATE INDEX IF NOT EXISTS idx_measure_ttp_relationships_ttp_id ON measure_ttp_relationships(ttp_id);