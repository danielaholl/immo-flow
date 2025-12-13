-- Migration 000: Auth Setup
-- Creates users table and current_user_id() function for RLS policies
-- This must run BEFORE all other migrations

-- Create users table in public schema (used by the API)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create current_user_id() function for RLS policies
-- This reads from the session variable set by queryWithUser() in the API
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Create roles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
END
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Create index on users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create updated_at trigger for users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
