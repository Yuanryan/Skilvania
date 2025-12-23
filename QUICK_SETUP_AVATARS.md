# Quick Setup: Avatar Upload Feature

## Error: "Storage bucket not found"

You need to create the `avatars` Storage bucket in Supabase. Follow these steps:

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"** or **"Create bucket"**
5. Fill in the form:
   - **Name**: `avatars` (must be exactly this)
   - **Public bucket**: ✅ **Enable this** (toggle ON)
   - **File size limit**: `2` MB
   - **Allowed MIME types**: Leave empty (or add: `image/jpeg,image/png,image/webp`)
6. Click **"Create bucket"**

## Step 2: Set Up Storage Policies

After creating the bucket, you need to set up policies. You can do this in two ways:

### Option A: Using SQL Editor (Recommended)

1. Go to **SQL Editor** in Supabase Dashboard
2. Create a new query
3. Copy and paste the contents of `supabase/setup_avatars_bucket.sql`
4. Click **Run**

### Option B: Using Dashboard UI

1. Go to **Storage** → **avatars** bucket
2. Click on **"Policies"** tab
3. Click **"New Policy"** → **"For full customization"**
4. Create these 4 policies:

**Policy 1: Public Read**
- Policy name: `Public can view avatars`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `bucket_id = 'avatars'`

**Policy 2: Authenticated Upload**
- Policy name: `Authenticated users can upload avatars`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- WITH CHECK expression: `bucket_id = 'avatars'`

**Policy 3: Authenticated Delete**
- Policy name: `Authenticated users can delete avatars`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'avatars'`

**Policy 4: Authenticated Update**
- Policy name: `Authenticated users can update avatars`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- USING expression: `bucket_id = 'avatars'`
- WITH CHECK expression: `bucket_id = 'avatars'`

## Step 3: Verify Setup

After completing the above steps, try uploading an avatar again. The error should be resolved.

If you still get errors, you can check the setup by visiting:
- `/api/profile/avatar/check` (while logged in)

This will show you what's missing.

## Troubleshooting

### "Bucket not found" error persists
- Make sure the bucket name is exactly `avatars` (lowercase, no spaces)
- Refresh the page and try again
- Check that the bucket is set to **Public**

### "Permission denied" error
- Make sure you've created all 4 policies
- Check that policies are enabled (not disabled)
- Try running the SQL script in `supabase/setup_avatars_bucket.sql`

### "Column does not exist" error
- Run the SQL in `supabase/add_avatar_column.sql` to add the AvatarURL column

