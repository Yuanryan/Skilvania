import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

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

    // 檢查是否已經有評分
    const { data: existingRating } = await supabase
      .from('courserating')
      .select('RatingID')
      .eq('CourseID', courseIdInt)
      .eq('UserID', userId)
      .single();

    if (existingRating) {
      // 更新現有評分
      const { data: updatedRating, error: updateError } = await supabase
        .from('courserating')
        .update({
          RatingScore: ratingInt,
          Comment: comment?.trim() || null,
          ReviewedAt: new Date().toISOString()
        })
        .eq('RatingID', existingRating.RatingID)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating rating:', updateError);
        return NextResponse.json({ error: 'Failed to update rating' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Rating updated successfully',
        rating: updatedRating 
      });
    } else {
      // 創建新評分
      const { data: newRating, error: insertError } = await supabase
        .from('courserating')
        .insert({
          CourseID: courseIdInt,
          UserID: userId,
          RatingScore: ratingInt,
          Comment: comment?.trim() || null,
          ReviewedAt: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating rating:', insertError);
        return NextResponse.json({ error: 'Failed to create rating' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Rating created successfully',
        rating: newRating 
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error in POST ratings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

