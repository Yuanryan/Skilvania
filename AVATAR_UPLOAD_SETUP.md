# Avatar Upload Setup Guide

## 1. Database Setup

Run the SQL migration to add the AvatarURL column:

```sql
-- Run this in your Supabase SQL editor
ALTER TABLE public."USER" 
ADD COLUMN IF NOT EXISTS "AvatarURL" TEXT;

COMMENT ON COLUMN public."USER"."AvatarURL" IS 'URL to user profile avatar image stored in Supabase Storage';
```

Or use the provided file:
```bash
# In Supabase SQL Editor, run:
supabase/add_avatar_column.sql
```

## 2. Supabase Storage Setup

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **Create a new bucket**
4. Bucket name: `avatars`
5. Make it **Public** (so images can be accessed via URL)
6. Enable **File size limit**: 2MB
7. Click **Create bucket**

## 3. Storage Policies

**Important:** Since we're using the admin client (service role key), the API will bypass RLS policies. However, you still need to set up policies for security and to allow public access to images.

### Option A: Simple Public Bucket (Recommended for now)
If you want to keep it simple, you can make the bucket fully public:

1. In Supabase Dashboard → Storage → avatars bucket
2. Go to **Policies** tab
3. Click **New Policy** → **For full customization**
4. Create these policies:

**Policy 1: Public read access**
```sql
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

**Policy 2: Allow authenticated uploads (optional, admin client bypasses this)**
```sql
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');
```

**Policy 3: Allow authenticated deletes (optional, admin client bypasses this)**
```sql
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
```

### Option B: More Restrictive (Future improvement)
For better security, you can restrict uploads to user-specific paths, but since we're using admin client, this is optional.

## 4. Update Avatar Display

The avatar will be displayed in priority order:
1. Custom uploaded avatar (from USER.AvatarURL)
2. Google OAuth image (from session.user.image)
3. Default initial letter

## 5. Testing

1. Go to `/settings` page
2. Click "Upload Avatar"
3. Select an image (JPG, PNG, or WebP, max 2MB)
4. The avatar should update immediately
5. Check that it appears in the navbar and other profile displays

