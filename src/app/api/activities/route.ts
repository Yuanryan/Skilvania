import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { logActivity, getActivities, getActivityStats } from '@/lib/mongodb/activity';
import { ActivityType } from '@/types';

/**
 * POST /api/activities
 * 記錄用戶活動
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { activityType, metadata, sessionId } = body;

    if (!activityType) {
      return NextResponse.json(
        { error: 'activityType is required' },
        { status: 400 }
      );
    }

    await logActivity(
      userId,
      activityType as ActivityType,
      metadata,
      sessionId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/activities
 * 查詢用戶活動記錄
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activityType = searchParams.get('activityType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');
    const sort = (searchParams.get('sort') || 'desc') as 'asc' | 'desc';
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
      // 返回統計信息
      const statsData = await getActivityStats(
        userId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );
      return NextResponse.json(statsData);
    }

    // 返回活動列表
    const activities = await getActivities({
      userId,
      activityType: activityType
        ? (activityType.includes(',')
            ? activityType.split(',') as ActivityType[]
            : (activityType as ActivityType))
        : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      skip,
      sort,
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error in GET /api/activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

