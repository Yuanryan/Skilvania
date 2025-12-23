-- Setup avatars Storage Bucket
-- This script helps set up the avatars bucket for profile image uploads
-- Note: The bucket itself must be created in Supabase Dashboard first
-- Then run this script to set up the policies

-- Step 1: Create the bucket (must be done in Supabase Dashboard)
-- Go to: Storage → Create bucket
-- Name: avatars
-- Public: true
-- File size limit: 2MB

-- Step 2: After creating the bucket, run the policies below

-- Policy 1: Allow public read access (so images can be displayed)
CREATE POLICY IF NOT EXISTS "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy 2: Allow authenticated users to upload (optional - admin client bypasses this)
CREATE POLICY IF NOT EXISTS "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Policy 3: Allow authenticated users to delete (optional - admin client bypasses this)
CREATE POLICY IF NOT EXISTS "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Policy 4: Allow authenticated users to update (optional - admin client bypasses this)
CREATE POLICY IF NOT EXISTS "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

COMMENT ON POLICY "Public can view avatars" ON storage.objects IS 'Allows public read access to avatar images';
COMMENT ON POLICY "Authenticated users can upload avatars" ON storage.objects IS 'Allows authenticated users to upload avatar images';
COMMENT ON POLICY "Authenticated users can delete avatars" ON storage.objects IS 'Allows authenticated users to delete their avatar images';
COMMENT ON POLICY "Authenticated users can update avatars" ON storage.objects IS 'Allows authenticated users to update their avatar images';

