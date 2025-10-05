-- Supabase Database Schema for Autonia Broker
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  service_name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'asia-south1',
  status TEXT NOT NULL DEFAULT 'pending',
  operation_id TEXT UNIQUE,
  url TEXT,
  log_url TEXT,
  public_access BOOLEAN DEFAULT true,
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for better query performance
  CONSTRAINT deployments_status_check CHECK (status IN ('pending', 'building', 'success', 'failed'))
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_service_name ON deployments(service_name);
CREATE INDEX IF NOT EXISTS idx_deployments_operation_id ON deployments(operation_id);
CREATE INDEX IF NOT EXISTS idx_deployments_deployed_at ON deployments(deployed_at DESC);

-- Enable Row Level Security
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own deployments
CREATE POLICY "Users can view own deployments"
  ON deployments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own deployments
CREATE POLICY "Users can insert own deployments"
  ON deployments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own deployments
CREATE POLICY "Users can update own deployments"
  ON deployments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (for broker service account)
CREATE POLICY "Service role has full access"
  ON deployments
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_deployments_updated_at
  BEFORE UPDATE ON deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View for deployment statistics (optional)
CREATE OR REPLACE VIEW deployment_stats AS
SELECT 
  user_id,
  user_email,
  COUNT(*) as total_deployments,
  COUNT(*) FILTER (WHERE status = 'success') as successful_deployments,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_deployments,
  MAX(deployed_at) as last_deployment_at
FROM deployments
GROUP BY user_id, user_email;

-- Grant access to authenticated users
GRANT SELECT ON deployment_stats TO authenticated;
