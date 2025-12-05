import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/courses/[courseId] - 獲取單個課程詳情（包含節點和連接）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const session = await auth();
    
    // 使用 admin client 繞過 RLS
    const supabase = createAdminClient();

    // 獲取課程資訊
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('*')
      .eq('CourseID', parseInt(courseId))
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // 獲取節點
    const { data: nodes, error: nodesError } = await supabase
      .from('node')
      .select('*')
      .eq('CourseID', parseInt(courseId))
      .order('CreatedAt', { ascending: true });

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
      return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 });
    }

    // 獲取連接
    const { data: edges, error: edgesError } = await supabase
      .from('edge')
      .select('*')
      .eq('CourseID', parseInt(courseId));

    if (edgesError) {
      console.error('Error fetching edges:', edgesError);
      return NextResponse.json({ error: 'Failed to fetch edges' }, { status: 500 });
    }

    // 獲取創建者資訊
    let author = 'Unknown';
    try {
      const { data: creator } = await supabase
        .from('USER')
        .select('Username')
        .eq('UserID', course.CreatorID)
        .single();
      
      if (creator) {
        author = creator.Username;
      }
    } catch (err) {
      console.error('Error fetching creator:', err);
      // 繼續執行，使用默認值
    }

    // 計算學生數量（有多少不同的用戶學習過這個課程）
    let studentsCount = 0;
    try {
      if (nodes && nodes.length > 0) {
        const nodeIds = nodes.map(n => n.NodeID);
        // 獲取所有學習過這個課程節點的用戶
        const { data: progressData } = await supabase
          .from('userprogress')
          .select('UserID')
          .in('NodeID', nodeIds);
        
        if (progressData && progressData.length > 0) {
          // 去重，計算不同的用戶數量
          studentsCount = new Set(progressData.map(p => p.UserID)).size;
        }
      }
    } catch (err) {
      console.error('Error counting students:', err);
      // 繼續執行，使用默認值 0
    }

    // 轉換為前端需要的格式
    const formattedNodes = (nodes || []).map(node => ({
      id: node.NodeID.toString(),
      title: node.Title,
      xp: node.XP,
      type: node.Type,
      x: node.X,
      y: node.Y,
      iconName: node.IconName || 'Code',
      description: node.Description || undefined
    }));

    const formattedEdges = (edges || []).map(edge => ({
      id: `e-${edge.EdgeID}`,
      from: edge.FromNodeID.toString(),
      to: edge.ToNodeID.toString()
    }));

    return NextResponse.json({
      course: {
        id: course.CourseID.toString(),
        title: course.Title,
        description: course.Description,
        creatorId: course.CreatorID.toString(),
        author: author,
        status: course.Status,
        totalNodes: course.TotalNodes,
        students: studentsCount,
        updatedAt: course.UpdatedAt
      },
      nodes: formattedNodes,
      edges: formattedEdges
    });
  } catch (error) {
    console.error('Error in GET /api/courses/[courseId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/courses/[courseId] - 更新課程資訊
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, status } = body;

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 使用 admin client 繞過 RLS
    const supabase = createAdminClient();

    // 檢查是否為課程創建者
    const { data: course } = await supabase
      .from('course')
      .select('CreatorID')
      .eq('CourseID', parseInt(courseId))
      .single();

    if (!course || course.CreatorID !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 構建更新對象
    const updates: any = {};
    if (title !== undefined) updates.Title = title.trim();
    if (description !== undefined) updates.Description = description?.trim() || null;
    if (status !== undefined && ['draft', 'published', 'archived'].includes(status)) {
      updates.Status = status;
    }
    updates.UpdatedAt = new Date().toISOString();

    // 更新課程
    const { data: updatedCourse, error } = await supabase
      .from('course')
      .update(updates)
      .eq('CourseID', parseInt(courseId))
      .select()
      .single();

    if (error) {
      console.error('Error updating course:', error);
      return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
    }

    return NextResponse.json({
      course: {
        id: updatedCourse.CourseID.toString(),
        title: updatedCourse.Title,
        description: updatedCourse.Description,
        creatorId: updatedCourse.CreatorID.toString(),
        status: updatedCourse.Status,
        totalNodes: updatedCourse.TotalNodes
      }
    });
  } catch (error) {
    console.error('Error in PUT /api/courses/[courseId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/courses/[courseId] - 刪除課程
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 使用 admin client 繞過 RLS
    const supabase = createAdminClient();

    // 檢查是否為課程創建者
    const { data: course } = await supabase
      .from('course')
      .select('CreatorID')
      .eq('CourseID', parseInt(courseId))
      .single();

    if (!course || course.CreatorID !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 刪除課程（級聯刪除節點和連接）
    const { error } = await supabase
      .from('course')
      .delete()
      .eq('CourseID', parseInt(courseId));

    if (error) {
      console.error('Error deleting course:', error);
      return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/courses/[courseId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

