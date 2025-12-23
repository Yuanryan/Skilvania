-- Add AvatarURL column to USER table for custom profile images
ALTER TABLE public."USER" 
ADD COLUMN IF NOT EXISTS "AvatarURL" TEXT;

COMMENT ON COLUMN public."USER"."AvatarURL" IS 'URL to user profile avatar image stored in Supabase Storage';

