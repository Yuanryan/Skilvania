-- =============================================
-- Authentication Bridge Schema
-- =============================================
-- This schema provides the bridge between Supabase Auth users
-- and the custom USER table for Google OAuth integration

-- =============================================
-- Table: auth_user_bridge
-- =============================================
-- Links Supabase auth.users to custom USER table
CREATE TABLE IF NOT EXISTS public.auth_user_bridge (
    auth_user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    user_id INTEGER REFERENCES public."USER"("UserID"),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_auth_bridge_auth_user ON public.auth_user_bridge(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_bridge_user ON public.auth_user_bridge(user_id);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE public.auth_user_bridge ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bridge record" ON public.auth_user_bridge;
DROP POLICY IF EXISTS "Users can insert their own bridge record" ON public.auth_user_bridge;

-- Users can view their own bridge record
CREATE POLICY "Users can view their own bridge record" ON public.auth_user_bridge
    FOR SELECT USING (auth_user_id = auth.uid());

-- Users can insert their own bridge record (for registration)
CREATE POLICY "Users can insert their own bridge record" ON public.auth_user_bridge
    FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- =============================================
-- Comments for Documentation
-- =============================================
COMMENT ON TABLE public.auth_user_bridge IS 'Authentication bridge between Supabase Auth and custom USER table';
COMMENT ON COLUMN public.auth_user_bridge.auth_user_id IS 'Supabase Auth user UUID';
COMMENT ON COLUMN public.auth_user_bridge.user_id IS 'Custom USER table UserID';
