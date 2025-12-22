-- =============================================
-- Fix Private Groups Constraint
-- =============================================
-- This migration fixes the issue where only one private group could exist
-- because NULLS NOT DISTINCT treats all NULL TagIDs as equal.
-- 
-- The unique constraint should only prevent multiple public groups
-- for the same tag, not prevent multiple private groups.
-- =============================================

-- Drop the problematic constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_public_group_per_tag'
    ) THEN
        ALTER TABLE study_groups DROP CONSTRAINT unique_public_group_per_tag;
    END IF;
END $$;

-- Drop the index if it exists (in case it was created as an index)
DROP INDEX IF EXISTS unique_public_group_per_tag;

-- Add a partial unique index that only applies to public groups
-- This allows unlimited private groups (with NULL TagID) but ensures
-- only one public group per TagID
CREATE UNIQUE INDEX IF NOT EXISTS unique_public_group_per_tag 
ON study_groups ("TagID", "Type") 
WHERE "Type" = 'public';

-- Verify the fix
COMMENT ON INDEX unique_public_group_per_tag IS 
'Ensures only one public group per tag, allows unlimited private groups';

