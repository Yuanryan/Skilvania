import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { safeUpsert, withRetry } from '@/lib/supabase/transactions';

// GET /api/courses/[courseId]/ratings - 獲取課程的所有評分和平均評分
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const courseIdInt = parseInt(courseId);

    if (isNaN(courseIdInt)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 獲取所有評分
    const { data: ratings, error: ratingsError } = await supabase
      .from('courserating')
      .select('RatingID, UserID, RatingScore, Comment, ReviewedAt')
      .eq('CourseID', courseIdInt)
      .order('ReviewedAt', { ascending: false });

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
    }

    // 獲取用戶名
    const userIds = ratings?.map(r => r.UserID) || [];
    const usernameMap: Record<number, string> = {};
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('USER')
        .select('UserID, Username')
        .in('UserID', userIds);
      
      if (users) {
        users.forEach(user => {
          usernameMap[user.UserID] = user.Username;
        });
      }
    }

    // 計算平均評分
    let averageRating = 0;
    if (ratings && ratings.length > 0) {
      const validRatings = ratings.filter(r => r.RatingScore !== null);
      if (validRatings.length > 0) {
        const sum = validRatings.reduce((acc, r) => acc + (r.RatingScore || 0), 0);
        averageRating = sum / validRatings.length;
      }
    }

    // 格式化評分數據
    const formattedRatings = ratings?.map(rating => ({
      id: rating.RatingID,
      userId: rating.UserID,
      username: usernameMap[rating.UserID] || 'Unknown',
      rating: rating.RatingScore,
      comment: rating.Comment,
      reviewedAt: rating.ReviewedAt
    })) || [];

    return NextResponse.json({
      ratings: formattedRatings,
      averageRating: Math.round(averageRating * 10) / 10, // 保留一位小數
      totalRatings: formattedRatings.length
    });
  } catch (error) {
    console.error('Error in GET ratings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/courses/[courseId]/ratings - 創建或更新評分
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { ratingScore, comment } = body;

    // 驗證評分
    if (ratingScore === undefined || ratingScore === null) {
      return NextResponse.json({ error: 'Rating score is required' }, { status: 400 });
    }

    const ratingInt = parseInt(ratingScore);
    if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const courseIdInt = parseInt(courseId);
    if (isNaN(courseIdInt)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 檢查課程是否存在
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('CourseID')
      .eq('CourseID', courseIdInt)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // 使用安全的 upsert 操作（防止并发创建重复评分）
    const { data: rating, error: ratingError } = await withRetry(
      () => safeUpsert<{
        RatingID: number;
        CourseID: number;
        UserID: number;
        RatingScore: number;
        Comment: string | null;
        ReviewedAt: string;
      }>(
        supabase,
        'courserating',
        {
          CourseID: courseIdInt,
          UserID: userId,
          RatingScore: ratingInt,
          Comment: comment?.trim() || null,
          ReviewedAt: new Date().toISOString()
        },
        ['CourseID', 'UserID'], // 唯一键
        ['RatingScore', 'Comment', 'ReviewedAt'] // 可更新字段
      ),
      { maxRetries: 3, retryDelay: 50 }
    );

    if (ratingError) {
      console.error('Error creating/updating rating:', ratingError);
      return NextResponse.json({ 
        error: 'Failed to save rating',
        details: ratingError.message 
      }, { status: 500 });
    }

    if (!rating) {
      return NextResponse.json({ 
        error: 'Failed to save rating' 
      }, { status: 500 });
    }

    // 检查是否是新建还是更新（通过检查 ReviewedAt 是否刚刚设置）
    const now = new Date().getTime();
    const reviewedAt = new Date(rating.ReviewedAt).getTime();
    const isNew = Math.abs(now - reviewedAt) < 2000; // 2秒内的认为是新建

    return NextResponse.json({ 
      message: isNew ? 'Rating created successfully' : 'Rating updated successfully',
      rating 
    }, { status: isNew ? 201 : 200 });
  } catch (error) {
    console.error('Error in POST ratings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

