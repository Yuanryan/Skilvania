-- =============================================
-- Seed Study Groups Script
-- =============================================
-- This script creates public study groups for all course tags
-- and randomly adds users to each group
-- =============================================

-- Step 1: Create public groups for all tags
-- Uses the first user as creator (you can change this to a specific UserID)
DO $$
DECLARE
    tag_record RECORD;
    creator_id INT;
    new_group_id INT;
    users_per_group INT := 5; -- Number of random users to add per group
    user_record RECORD;
    user_count INT;
    random_users INT[];
BEGIN
    -- Get the first user as creator (or change to a specific UserID)
    SELECT "UserID" INTO creator_id FROM public."USER" ORDER BY "UserID" LIMIT 1;
    
    IF creator_id IS NULL THEN
        RAISE EXCEPTION 'No users found in the database';
    END IF;

    -- Loop through all tags
    FOR tag_record IN 
        SELECT "TagID", "Name" 
        FROM public.tag 
        ORDER BY "Name"
    LOOP
        -- Check if group already exists
        SELECT "GroupID" INTO new_group_id
        FROM study_groups
        WHERE "Type" = 'public' AND "TagID" = tag_record."TagID"
        LIMIT 1;

        -- Create group if it doesn't exist
        IF new_group_id IS NULL THEN
            INSERT INTO study_groups (
                "Name",
                "Description",
                "Type",
                "TagID",
                "CreatorID"
            ) VALUES (
                tag_record."Name" || ' Study Group',
                'Public study group for all ' || tag_record."Name" || ' courses. Join to connect with fellow learners!',
                'public',
                tag_record."TagID",
                creator_id
            )
            RETURNING "GroupID" INTO new_group_id;

            RAISE NOTICE 'Created group: % (GroupID: %)', tag_record."Name" || ' Study Group', new_group_id;
        ELSE
            RAISE NOTICE 'Group already exists: % (GroupID: %)', tag_record."Name" || ' Study Group', new_group_id;
        END IF;

        -- Get existing members for this group
        SELECT COUNT(*) INTO user_count
        FROM group_members
        WHERE "GroupID" = new_group_id;

        -- Add random users if group has fewer than users_per_group members
        IF user_count < users_per_group THEN
            -- Get random users not already in the group
            SELECT ARRAY_AGG("UserID") INTO random_users
            FROM (
                SELECT "UserID"
                FROM public."USER"
                WHERE "UserID" != creator_id
                  AND "UserID" NOT IN (
                      SELECT "UserID" 
                      FROM group_members 
                      WHERE "GroupID" = new_group_id
                  )
                ORDER BY RANDOM()
                LIMIT (users_per_group - user_count)
            ) AS random_user_selection;

            -- Insert random users as members
            IF random_users IS NOT NULL AND array_length(random_users, 1) > 0 THEN
                INSERT INTO group_members ("GroupID", "UserID", "Role")
                SELECT new_group_id, unnest(random_users), 'member'
                ON CONFLICT ("GroupID", "UserID") DO NOTHING;

                RAISE NOTICE 'Added % users to group %', array_length(random_users, 1), tag_record."Name" || ' Study Group';
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'Study groups seeding completed!';
END $$;

-- =============================================
-- Verification Query
-- =============================================
-- Run this to see the results:

SELECT 
    sg."GroupID",
    sg."Name",
    sg."Type",
    t."Name" AS "TagName",
    COUNT(gm."UserID") AS "MemberCount"
FROM study_groups sg
LEFT JOIN public.tag t ON sg."TagID" = t."TagID"
LEFT JOIN group_members gm ON sg."GroupID" = gm."GroupID"
WHERE sg."Type" = 'public'
GROUP BY sg."GroupID", sg."Name", sg."Type", t."Name"
ORDER BY sg."Name";

