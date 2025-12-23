import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// POST /api/profile/avatar - Upload and update user avatar
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      const avatarsBucket = buckets?.find(b => b.name === 'avatars');
      if (!avatarsBucket) {
        return NextResponse.json(
          { 
            error: 'Storage bucket not found',
            details: 'The "avatars" bucket does not exist. Please create it in Supabase Dashboard → Storage → Create bucket (name: "avatars", public: true)'
          },
          { status: 500 }
        );
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = fileName; // Store directly in bucket root

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // Allow overwriting if same user uploads again
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Error uploading avatar:', {
        error: uploadError,
        code: uploadError.error,
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        filePath,
        userId
      });
      
      // Check if bucket doesn't exist
      if (uploadError.message?.includes('Bucket not found') || uploadError.error === 'Bucket not found') {
        return NextResponse.json(
          { 
            error: 'Storage bucket not configured',
            details: 'The "avatars" bucket does not exist. Please create it in Supabase Storage settings.'
          },
          { status: 500 }
        );
      }
      
      // Check if it's a permission error
      if (uploadError.message?.includes('permission') || uploadError.message?.includes('policy') || uploadError.statusCode === 403) {
        return NextResponse.json(
          { 
            error: 'Permission denied',
            details: 'Storage policies may not be configured correctly. Please check Supabase Storage policies.'
          },
          { status: 403 }
        );
      }
      
      // If file already exists, try to get the existing URL
      if (uploadError.message?.includes('already exists') || uploadError.error === 'Duplicate') {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        const avatarUrl = urlData.publicUrl;
        
        // Update user's AvatarURL in database
        const { error: updateError } = await supabase
          .from('USER')
          .update({ AvatarURL: avatarUrl })
          .eq('UserID', userId);

        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to update avatar' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          avatarUrl
        });
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to upload avatar',
          details: uploadError.message || uploadError.error || 'Unknown error',
          code: uploadError.error,
          statusCode: uploadError.statusCode
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Delete old avatar if exists
    const { data: userData } = await supabase
      .from('USER')
      .select('AvatarURL')
      .eq('UserID', userId)
      .single();

    if (userData?.AvatarURL) {
      // Extract old file path from URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/avatars/filename
      const urlParts = userData.AvatarURL.split('/avatars/');
      if (urlParts.length > 1) {
        const oldPath = urlParts[1].split('?')[0]; // Remove query params if any
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([oldPath]);
        }
      }
    }

    // Update user's AvatarURL in database
    const { error: updateError } = await supabase
      .from('USER')
      .update({ AvatarURL: avatarUrl })
      .eq('UserID', userId);

    if (updateError) {
      console.error('Error updating avatar URL:', updateError);
      // Try to delete the uploaded file if database update fails
      await supabase.storage
        .from('avatars')
        .remove([filePath]);
      
      return NextResponse.json(
        { error: 'Failed to update avatar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatarUrl
    });
  } catch (error) {
    console.error('Error in POST /api/profile/avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/avatar - Remove user avatar
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const supabase = createAdminClient();

    // Get current avatar URL
    const { data: userData } = await supabase
      .from('USER')
      .select('AvatarURL')
      .eq('UserID', userId)
      .single();

    if (userData?.AvatarURL) {
      // Extract file path from URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/avatars/filename
      const urlParts = userData.AvatarURL.split('/avatars/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0]; // Remove query params if any
        if (filePath) {
          // Delete from storage
          await supabase.storage
            .from('avatars')
            .remove([filePath]);
        }
      }
    }

    // Update database to remove avatar URL
    const { error: updateError } = await supabase
      .from('USER')
      .update({ AvatarURL: null })
      .eq('UserID', userId);

    if (updateError) {
      console.error('Error removing avatar:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove avatar' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/profile/avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

