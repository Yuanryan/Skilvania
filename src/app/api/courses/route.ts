import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'published'; // 默認只顯示已發布的課程

    // 構建查詢 - 獲取課程和創作者信息
    let query = supabase
      .from('course')
      .select(`
        CourseID,
        Title,
        Description,
        CreatorID,
        Status,
        TotalNodes,
        CreatedAt,
        UpdatedAt,
        USER:CreatorID (
          UserID,
          Username
        )
      `)
      .eq('Status', status)
      .order('CreatedAt', { ascending: false });

    // 如果有搜索關鍵詞，添加搜索條件
    if (search) {
      query = query.or(`Title.ilike.%${search}%,Description.ilike.%${search}%`);
    }

    const { data: coursesData, error: coursesError } = await query;

    if (coursesError) {
      console.error('獲取課程錯誤:', coursesError);
      return NextResponse.json(
        { error: '獲取課程失敗' },
        { status: 500 }
      );
    }

    // 如果沒有課程數據，返回空數組
    if (!coursesData || coursesData.length === 0) {
      return NextResponse.json({
        courses: [],
        total: 0,
      });
    }

    // 轉換數據格式
    const courses = coursesData.map((course: any) => {
      // Supabase 返回的嵌套數據結構
      const creator = Array.isArray(course.USER) ? course.USER[0] : course.USER;
      return {
        id: course.CourseID.toString(),
        title: course.Title,
        description: course.Description || '',
        author: creator?.Username || 'Unknown',
        nodes: course.TotalNodes || 0,
        status: course.Status,
        createdAt: course.CreatedAt,
        updatedAt: course.UpdatedAt,
      };
    });

    return NextResponse.json({
      courses,
      total: courses.length,
    });
  } catch (error) {
    console.error('API 錯誤:', error);
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    );
  }
}

