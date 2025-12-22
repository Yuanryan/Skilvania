-- =============================================
-- Seed Study Groups - Manual Version (Most Compatible)
-- =============================================
-- This version works step-by-step and is compatible with all PostgreSQL versions
-- =============================================

-- STEP 1: Find your admin/creator user ID
-- Run this first to see available users:
SELECT "UserID", "Username", "Email" FROM public."USER" ORDER BY "UserID" LIMIT 10;

-- STEP 2: Set the creator user ID (replace 1 with your actual UserID)
-- You can also use: (SELECT "UserID" FROM public."USER" ORDER BY "UserID" LIMIT 1)
DO $$
DECLARE
    creator_user_id INT := 1; -- CHANGE THIS to your admin user ID
BEGIN
    -- Create public groups for all tags
    INSERT INTO study_groups ("Name", "Description", "Type", "TagID", "CreatorID")
    SELECT 
        t."Name" || ' Study Group',
        'Public study group for all ' || t."Name" || ' courses. Join to connect with fellow learners!',
        'public',
        t."TagID",
        creator_user_id
    FROM public.tag t
    WHERE NOT EXISTS (
        SELECT 1 
        FROM study_groups sg 
        WHERE sg."TagID" = t."TagID" 
          AND sg."Type" = 'public'
    );
END $$;

-- STEP 3: Add random users to each group
-- This uses a temporary function to randomly select users
DO $$
DECLARE
    group_record RECORD;
    user_record RECORD;
    users_added INT;
    target_users INT := 5; -- Number of users to add per group
BEGIN
    -- Loop through all public groups
    FOR group_record IN 
        SELECT "GroupID", "Name"
        FROM study_groups
        WHERE "Type" = 'public'
    LOOP
        users_added := 0;
        
        -- Get random users not already in this group
        FOR user_record IN
            SELECT "UserID"
            FROM public."USER"
            WHERE "UserID" != (SELECT "CreatorID" FROM study_groups WHERE "GroupID" = group_record."GroupID")
              AND "UserID" NOT IN (
                  SELECT "UserID" 
                  FROM group_members 
                  WHERE "GroupID" = group_record."GroupID"
              )
            ORDER BY RANDOM()
            LIMIT target_users
        LOOP
            -- Add user to group
            INSERT INTO group_members ("GroupID", "UserID", "Role")
            VALUES (group_record."GroupID", user_record."UserID", 'member')
            ON CONFLICT ("GroupID", "UserID") DO NOTHING;
            
            users_added := users_added + 1;
        END LOOP;
        
        RAISE NOTICE 'Group %: Added % users', group_record."Name", users_added;
    END LOOP;
END $$;

-- =============================================
-- Alternative: If DO blocks don't work, use this simpler version
-- =============================================

-- Create groups (run this first):
-- INSERT INTO study_groups ("Name", "Description", "Type", "TagID", "CreatorID")
-- SELECT 
--     t."Name" || ' Study Group',
--     'Public study group for all ' || t."Name" || ' courses.',
--     'public',
--     t."TagID",
--     1  -- Replace 1 with your UserID
-- FROM public.tag t
-- WHERE NOT EXISTS (
--     SELECT 1 FROM study_groups sg 
--     WHERE sg."TagID" = t."TagID" AND sg."Type" = 'public'
-- );

-- Then manually add users to specific groups:
-- INSERT INTO group_members ("GroupID", "UserID", "Role")
-- VALUES 
--     (1, 2, 'member'),  -- GroupID 1, UserID 2
--     (1, 3, 'member'),  -- GroupID 1, UserID 3
--     (2, 2, 'member'),  -- GroupID 2, UserID 2
--     (2, 4, 'member')   -- GroupID 2, UserID 4
-- ON CONFLICT ("GroupID", "UserID") DO NOTHING;

-- =============================================
-- Verification
-- =============================================
SELECT 
    sg."GroupID",
    sg."Name",
    t."Name" AS "TagName",
    COUNT(gm."UserID") AS "MemberCount"
FROM study_groups sg
LEFT JOIN public.tag t ON sg."TagID" = t."TagID"
LEFT JOIN group_members gm ON sg."GroupID" = gm."GroupID"
WHERE sg."Type" = 'public'
GROUP BY sg."GroupID", sg."Name", t."Name"
ORDER BY sg."Name";

