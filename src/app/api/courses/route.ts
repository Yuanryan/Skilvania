import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockAPI, shouldUseMock } from '@/lib/mock/creatorData';
import { withTimeout, isNetworkError } from '@/lib/utils/timeout';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/courses - 獲取創建者的所有課程
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      // 可能是 Mock 模式或使用者不存在
      // 檢查是否是 Mock 模式（表不存在）
      const adminClient = createAdminClient();
      const { error: testError } = await adminClient.from('auth_user_bridge').select('user_id').limit(1);
      if (testError && shouldUseMock(testError)) {
        console.log('📦 Using mock data (database unavailable)');
        const mockUserId = 1;
        const { courses } = mockAPI.getCourses(mockUserId);
        return NextResponse.json({ courses, _mock: true });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 使用 admin client 繞過 RLS（我們已經在 API 層面檢查了權限）
    const supabase = createAdminClient();

    // 獲取該使用者創建的所有課程
    const { data: courses, error } = await supabase
      .from('course')
      .select('*')
      .eq('CreatorID', userId)
      .order('UpdatedAt', { ascending: false });

    // 如果資料庫表不存在或連接超時，使用 mock 資料
    if (error && (shouldUseMock(error) || isNetworkError(error))) {
      console.log('📦 Using mock data (database unavailable)');
      const { courses: mockCourses } = mockAPI.getCourses(userId);
      return NextResponse.json({ courses: mockCourses, _mock: true });
    }

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    // 轉換資料庫欄位格式為前端期望的格式
    const formattedCourses = (courses || []).map((course: any) => ({
      id: course.CourseID.toString(),
      title: course.Title,
      description: course.Description,
      creatorId: course.CreatorID.toString(),
      status: course.Status || 'draft', // 確保有默認值
      totalNodes: course.TotalNodes || 0,
      createdAt: course.CreatedAt,
      updatedAt: course.UpdatedAt
    }));

    return NextResponse.json({ courses: formattedCourses });
  } catch (error) {
    console.error('Error in GET /api/courses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/courses - 創建新課程
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      // 可能是 Mock 模式或使用者不存在
      // 檢查是否是 Mock 模式（表不存在）
      const adminClient = createAdminClient();
      const { error: testError } = await adminClient.from('auth_user_bridge').select('user_id').limit(1);
      if (testError && shouldUseMock(testError)) {
        console.log('📦 Using mock data (database unavailable)');
        const mockUserId = 1;
        const { course } = mockAPI.createCourse(mockUserId, title.trim(), description?.trim());
        return NextResponse.json({ 
          courseId: course.CourseID,
          course: {
            id: course.CourseID.toString(),
            title: course.Title,
            description: course.Description,
            creatorId: course.CreatorID.toString(),
            status: course.Status,
            totalNodes: course.TotalNodes
          },
          _mock: true
        }, { status: 201 });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 使用 admin client 繞過 RLS（我們已經在 API 層面檢查了權限）
    const supabase = createAdminClient();

    // 創建新課程
    const { data: course, error } = await supabase
      .from('course')
      .insert({
        Title: title.trim(),
        Description: description?.trim() || null,
        CreatorID: userId,
        Status: 'draft',
        TotalNodes: 0
      })
      .select()
      .single();

    // 如果資料庫表不存在或連接超時，使用 mock 資料
    if (error && (shouldUseMock(error) || isNetworkError(error))) {
      console.log('📦 Using mock data (database unavailable)');
      const { course: mockCourse } = mockAPI.createCourse(userId, title.trim(), description?.trim());
      return NextResponse.json({ 
        courseId: mockCourse.CourseID,
        course: {
          id: mockCourse.CourseID.toString(),
          title: mockCourse.Title,
          description: mockCourse.Description,
          creatorId: mockCourse.CreatorID.toString(),
          status: mockCourse.Status,
          totalNodes: mockCourse.TotalNodes
        },
        _mock: true
      }, { status: 201 });
    }

    if (error) {
      console.error('Error creating course:', error);
      return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
    }

    return NextResponse.json({ 
      courseId: course.CourseID,
      course: {
        id: course.CourseID.toString(),
        title: course.Title,
        description: course.Description,
        creatorId: course.CreatorID.toString(),
        status: course.Status,
        totalNodes: course.TotalNodes
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/courses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

