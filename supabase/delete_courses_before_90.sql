-- =============================================
-- Delete all courses with CourseID <= 90, except CourseID = 14
-- =============================================
-- This script will delete courses and all related data (nodes, edges, ratings, tags)
-- IMPORTANT: Run this in a transaction so you can rollback if needed
-- 
-- WARNING: This will permanently delete data. Make sure you have a backup!

BEGIN;

-- =============================================
-- Step 1: Preview what will be deleted (for verification)
-- =============================================
SELECT 
    "CourseID",
    "Title",
    "CreatorID",
    "Status",
    "TotalNodes",
    "CreatedAt"
FROM public.course
WHERE "CourseID" <= 90 AND "CourseID" != 14
ORDER BY "CourseID";

-- =============================================
-- Step 2: Delete related data first (in correct order)
-- =============================================

-- 2.1: Delete user progress (they reference nodes, which reference courses)
DELETE FROM public.userprogress
WHERE "NodeID" IN (
    SELECT "NodeID" FROM public.node
    WHERE "CourseID" IN (
        SELECT "CourseID" FROM public.course 
        WHERE "CourseID" <= 90 AND "CourseID" != 14
    )
);

-- 2.2: Delete edges first (they reference nodes)
DELETE FROM public.edge
WHERE "CourseID" IN (
    SELECT "CourseID" FROM public.course 
    WHERE "CourseID" <= 90 AND "CourseID" != 14
);

-- 2.3: Delete nodes (they reference courses)
DELETE FROM public.node
WHERE "CourseID" IN (
    SELECT "CourseID" FROM public.course 
    WHERE "CourseID" <= 90 AND "CourseID" != 14
);

-- 2.4: Delete course ratings
DELETE FROM public.courserating
WHERE "CourseID" IN (
    SELECT "CourseID" FROM public.course 
    WHERE "CourseID" <= 90 AND "CourseID" != 14
);

-- 2.5: Delete course tags
DELETE FROM public.course_tag
WHERE "CourseID" IN (
    SELECT "CourseID" FROM public.course 
    WHERE "CourseID" <= 90 AND "CourseID" != 14
);

-- 2.6: Clear LastActiveCourseID in community_profiles (optional, but recommended)
UPDATE public.community_profiles
SET "LastActiveCourseID" = NULL
WHERE "LastActiveCourseID" IN (
    SELECT "CourseID" FROM public.course 
    WHERE "CourseID" <= 90 AND "CourseID" != 14
);

-- =============================================
-- Step 3: Delete the courses themselves
-- =============================================
DELETE FROM public.course
WHERE "CourseID" <= 90 AND "CourseID" != 14;

-- =============================================
-- Step 4: Verification queries
-- =============================================

-- Check how many courses were deleted
SELECT 
    COUNT(*) as deleted_count,
    'Courses deleted (should be > 0)' as description
FROM (
    SELECT "CourseID" FROM public.course 
    WHERE "CourseID" <= 90 AND "CourseID" != 14
) as deleted;

-- Verify no courses with ID <= 90 (except 14) remain
SELECT COUNT(*) as remaining_courses
FROM public.course
WHERE "CourseID" <= 90 AND "CourseID" != 14;
-- Expected result: 0

-- Verify course 14 still exists
SELECT 
    "CourseID",
    "Title",
    "Status",
    "TotalNodes"
FROM public.course
WHERE "CourseID" = 14;
-- Expected result: 1 row with CourseID = 14

-- =============================================
-- IMPORTANT: Review the results above before committing!
-- If everything looks good, run: COMMIT;
-- If something is wrong, run: ROLLBACK;
-- =============================================

-- Uncomment the line below to commit the transaction:
-- COMMIT;

