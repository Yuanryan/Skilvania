import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/profile/avatar/check - Check avatar upload setup
export async function GET(request: NextRequest) {
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
    const checks: Record<string, { status: 'ok' | 'error'; message: string }> = {};

    // Check 1: Database column exists
    try {
      const { data: userData, error: userError } = await supabase
        .from('USER')
        .select('AvatarURL')
        .eq('UserID', userId)
        .single();

      if (userError && userError.code === '42703') {
        // Column doesn't exist
        checks.databaseColumn = {
          status: 'error',
          message: 'AvatarURL column does not exist. Run: ALTER TABLE "USER" ADD COLUMN "AvatarURL" TEXT;'
        };
      } else {
        checks.databaseColumn = {
          status: 'ok',
          message: 'AvatarURL column exists'
        };
      }
    } catch (err) {
      checks.databaseColumn = {
        status: 'error',
        message: `Error checking database: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }

    // Check 2: Storage bucket exists
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        checks.storageBucket = {
          status: 'error',
          message: `Error accessing storage: ${bucketsError.message}`
        };
      } else {
        const avatarsBucket = buckets?.find(b => b.name === 'avatars');
        if (!avatarsBucket) {
          checks.storageBucket = {
            status: 'error',
            message: 'avatars bucket does not exist. Create it in Supabase Dashboard → Storage'
          };
        } else {
          checks.storageBucket = {
            status: 'ok',
            message: `avatars bucket exists (public: ${avatarsBucket.public})`
          };
        }
      }
    } catch (err) {
      checks.storageBucket = {
        status: 'error',
        message: `Error checking storage: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }

    // Check 3: Service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      checks.serviceRoleKey = {
        status: 'error',
        message: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not set'
      };
    } else {
      checks.serviceRoleKey = {
        status: 'ok',
        message: 'Service role key is configured'
      };
    }

    const allOk = Object.values(checks).every(check => check.status === 'ok');

    return NextResponse.json({
      status: allOk ? 'ok' : 'error',
      checks
    });
  } catch (error) {
    console.error('Error in GET /api/profile/avatar/check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

