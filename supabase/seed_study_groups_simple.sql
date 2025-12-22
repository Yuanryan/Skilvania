-- =============================================
-- Seed Study Groups - Simple Step-by-Step Version
-- =============================================
-- Run these queries one by one in Supabase SQL Editor
-- =============================================

-- Step 1: Get a creator user ID (change this to your admin user ID if you have one)
-- Replace USER_ID_HERE with an actual UserID from your USER table
-- You can find user IDs with: SELECT "UserID", "Username" FROM public."USER" LIMIT 10;

-- Step 2: Create public groups for each tag
-- This will create groups for all tags that don't already have a public group

INSERT INTO study_groups ("Name", "Description", "Type", "TagID", "CreatorID")
SELECT 
    t."Name" || ' Study Group' AS "Name",
    'Public study group for all ' || t."Name" || ' courses. Join to connect with fellow learners!' AS "Description",
    'public' AS "Type",
    t."TagID",
    (SELECT "UserID" FROM public."USER" ORDER BY "UserID" LIMIT 1) AS "CreatorID"
FROM public.tag t
WHERE NOT EXISTS (
    SELECT 1 
    FROM study_groups sg 
    WHERE sg."TagID" = t."TagID" 
      AND sg."Type" = 'public'
)
ON CONFLICT DO NOTHING;

-- Step 3: Add random users to each public group
-- This adds up to 5 random users per group (excluding the creator and existing members)

WITH random_users_per_group AS (
    SELECT 
        sg."GroupID",
        u."UserID",
        ROW_NUMBER() OVER (PARTITION BY sg."GroupID" ORDER BY RANDOM()) AS rn
    FROM study_groups sg
    CROSS JOIN public."USER" u
    WHERE sg."Type" = 'public'
      AND u."UserID" != sg."CreatorID"
      AND u."UserID" NOT IN (
          SELECT "UserID" 
          FROM group_members 
          WHERE "GroupID" = sg."GroupID"
      )
)
INSERT INTO group_members ("GroupID", "UserID", "Role")
SELECT "GroupID", "UserID", 'member'
FROM random_users_per_group
WHERE rn <= 5
ON CONFLICT ("GroupID", "UserID") DO NOTHING;

-- =============================================
-- Verification Queries
-- =============================================

-- See all public groups with member counts
SELECT 
    sg."GroupID",
    sg."Name",
    t."Name" AS "TagName",
    COUNT(gm."UserID") AS "MemberCount",
    sg."CreatorID"
FROM study_groups sg
LEFT JOIN public.tag t ON sg."TagID" = t."TagID"
LEFT JOIN group_members gm ON sg."GroupID" = gm."GroupID"
WHERE sg."Type" = 'public'
GROUP BY sg."GroupID", sg."Name", t."Name", sg."CreatorID"
ORDER BY sg."Name";

-- See members of a specific group (replace GROUP_ID with actual GroupID)
-- SELECT 
--     u."Username",
--     u."Level",
--     u."XP",
--     gm."Role",
--     gm."JoinedAt"
-- FROM group_members gm
-- JOIN public."USER" u ON gm."UserID" = u."UserID"
-- WHERE gm."GroupID" = GROUP_ID
-- ORDER BY gm."JoinedAt";

