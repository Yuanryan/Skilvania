import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { logActivity } from '@/lib/mongodb/activity';

// GET /api/courses - 獲取課程列表
// 兩種模式：
// 1. 創建者模式：無 status 參數 + 已認證 → 返回創建者的所有課程
// 2. 瀏覽模式：status=published → 返回公開的已發布課程（不需要認證）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const session = await auth();
    const supabase = createAdminClient();

    // 瀏覽模式：獲取已發布的公開課程
    if (status === 'published') {
      let query = supabase
        .from('course')
        .select('CourseID, Title, Description, CreatorID, Status, TotalNodes, CreatedAt, UpdatedAt')
        .eq('Status', 'published')
        .order('UpdatedAt', { ascending: false });

      // 如果提供了搜索參數，進行標題搜索
      if (search && search.trim()) {
        query = query.ilike('Title', `%${search.trim()}%`);
      }

      const { data: courses, error } = await query;

      if (error) {
        console.error('Error fetching published courses:', error);
        // 如果是表不存在的錯誤，返回空數組而不是錯誤
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('Course table does not exist, returning empty array');
          return NextResponse.json({ courses: [] });
        }
        return NextResponse.json(
          { error: '獲取課程失敗', details: error.message },
          { status: 500 }
        );
      }

      // 獲取所有創建者 ID
      const creatorIds = [...new Set((courses || []).map((c: any) => c.CreatorID))];
      
      // 批量查詢創建者信息
      let creatorsMap: Record<number, string> = {};
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('USER')
          .select('UserID, Username')
          .in('UserID', creatorIds);
        
        if (creators) {
          creatorsMap = creators.reduce((acc: Record<number, string>, creator: any) => {
            acc[creator.UserID] = creator.Username;
            return acc;
          }, {});
        }
      }

      // 轉換格式並添加作者信息
      const formattedCourses = (courses || []).map((course: any) => ({
        id: course.CourseID.toString(),
        title: course.Title,
        description: course.Description || '',
        author: creatorsMap[course.CreatorID] || 'Unknown',
        nodes: course.TotalNodes || 0,
        status: course.Status,
        createdAt: course.CreatedAt,
        updatedAt: course.UpdatedAt,
      }));

      return NextResponse.json({ courses: formattedCourses });
    }

    // 創建者模式：獲取當前登錄創建者的所有課程（需要認證）
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 獲取該使用者創建的所有課程
    const { data: courses, error } = await supabase
      .from('course')
      .select('*')
      .eq('CreatorID', userId)
      .order('UpdatedAt', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json({ error: 'Failed to fetch courses', details: error.message }, { status: 500 });
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

// POST /api/courses - 創建新課程（需要認證）
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, tags } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // 驗證 tags 格式
    if (tags && !Array.isArray(tags)) {
      return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
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

    if (error) {
      console.error('Error creating course:', error);
      return NextResponse.json({ error: 'Failed to create course', details: error.message }, { status: 500 });
    }

    // 處理標籤關聯（使用原子性操作）
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const { atomicTagUpdate } = await import('@/lib/supabase/transactions');
      const { success, error: tagError } = await atomicTagUpdate(
        supabase,
        course.CourseID,
        tags
      );

      if (!success && tagError) {
        console.error('Error creating course tags:', tagError);
        // 不中斷流程，標籤創建失敗不影響課程創建
      }
    }

    // 自動記錄課程創建活動
    logActivity(userId, 'course_create', {
      courseId: course.CourseID,
    }).catch((err) => {
      console.error('❌ Failed to log course_create activity:', err);
    });

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

