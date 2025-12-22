import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/profile - 獲取當前用戶的社群個人檔案
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

    // 獲取用戶社群檔案
    const { data: profile, error: profileError } = await supabase
      .from('community_profiles')
      .select('*')
      .eq('UserID', userId)
      .single();

    // 如果檔案不存在，返回默認值
    if (profileError && profileError.code === 'PGRST116') {
      return NextResponse.json({
        profile: {
          userID: userId,
          bio: null,
          interests: [],
          lookingForBuddy: true,
          lastActiveCourseID: null,
          createdAt: null,
          updatedAt: null,
        }
      });
    }

    if (profileError) {
      console.error('Error fetching community profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      profile: {
        userID: profile.UserID,
        bio: profile.Bio,
        interests: profile.Interests || [],
        lookingForBuddy: profile.LookingForBuddy,
        lastActiveCourseID: profile.LastActiveCourseID,
        createdAt: profile.CreatedAt,
        updatedAt: profile.UpdatedAt,
      }
    });
  } catch (error) {
    console.error('Error in GET /api/community/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/community/profile - 更新用戶的社群個人檔案
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

    const body = await request.json();
    const { bio, interests, lookingForBuddy, lastActiveCourseID } = body;

    // 驗證輸入
    if (bio !== undefined && typeof bio !== 'string') {
      return NextResponse.json(
        { error: 'Invalid bio format' },
        { status: 400 }
      );
    }

    if (interests !== undefined && !Array.isArray(interests)) {
      return NextResponse.json(
        { error: 'Invalid interests format' },
        { status: 400 }
      );
    }

    if (lookingForBuddy !== undefined && typeof lookingForBuddy !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid lookingForBuddy format' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 檢查檔案是否已存在
    const { data: existingProfile } = await supabase
      .from('community_profiles')
      .select('ProfileID')
      .eq('UserID', userId)
      .single();

    const updateData: any = {
      UserID: userId,
    };

    if (bio !== undefined) updateData.Bio = bio;
    if (interests !== undefined) updateData.Interests = interests;
    if (lookingForBuddy !== undefined) updateData.LookingForBuddy = lookingForBuddy;
    if (lastActiveCourseID !== undefined) updateData.LastActiveCourseID = lastActiveCourseID;

    let result;

    if (existingProfile) {
      // 更新現有檔案
      const { data, error } = await supabase
        .from('community_profiles')
        .update(updateData)
        .eq('UserID', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating community profile:', error);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // 創建新檔案
      const { data, error } = await supabase
        .from('community_profiles')
        .insert(updateData)
        .select()
        .single();

      if (error) {
        console.error('Error creating community profile:', error);
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        );
      }

      result = data;
    }

    return NextResponse.json({
      success: true,
      profile: {
        userID: result.UserID,
        bio: result.Bio,
        interests: result.Interests || [],
        lookingForBuddy: result.LookingForBuddy,
        lastActiveCourseID: result.LastActiveCourseID,
        createdAt: result.CreatedAt,
        updatedAt: result.UpdatedAt,
      }
    });
  } catch (error) {
    console.error('Error in POST /api/community/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

