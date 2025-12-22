-- =============================================
-- Database Setup Validation Query
-- =============================================
-- Run this in Supabase SQL Editor to verify all tables exist

SELECT
    table_name,
    CASE
        WHEN table_name IN ('USER', 'course', 'node', 'edge', 'userprogress', 'auth_user_bridge', 'community_profiles', 'buddy_connections', 'community_messages') THEN '✅ Required'
        ELSE 'ℹ️  Optional'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'USER', 'achievement', 'course', 'course_tag', 'courserating',
    'edge', 'node', 'roles', 'tag', 'tasktype', 'userachievement',
    'userprogress', 'userrole', 'auth_user_bridge',
    'community_profiles', 'buddy_connections', 'community_messages'
)
ORDER BY
    CASE
        WHEN table_name IN ('USER', 'course', 'node', 'edge', 'userprogress', 'auth_user_bridge', 'community_profiles', 'buddy_connections', 'community_messages') THEN 1
        ELSE 2
    END,
    table_name;

-- Check Row Level Security is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('USER', 'course', 'node', 'edge', 'userprogress', 'auth_user_bridge', 'community_profiles', 'buddy_connections', 'community_messages')
ORDER BY tablename;
