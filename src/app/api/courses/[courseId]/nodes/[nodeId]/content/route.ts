import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockAPI, shouldUseMock } from '@/lib/mock/creatorData';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/courses/[courseId]/nodes/[nodeId]/content - 獲取節點內容
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    const { courseId, nodeId } = await params;
    
    // 使用 admin client（GET 不需要權限檢查，因為是公開內容）
    const supabase = createAdminClient();

    // 獲取節點內容
    const { data: node, error } = await supabase
      .from('node')
      .select('Content, Title')
      .eq('NodeID', parseInt(nodeId))
      .eq('CourseID', parseInt(courseId))
      .single();

    // 如果資料庫表不存在，使用 mock 資料
    if (error && shouldUseMock(error)) {
      console.log('📦 Using mock data (database tables not found)');
      const { content, title } = mockAPI.getNodeContent(parseInt(courseId), parseInt(nodeId));
      
      if (!content && !title) {
        return NextResponse.json({ error: 'Node not found' }, { status: 404 });
      }

      return NextResponse.json({
        content: content || '',
        title: title || 'Node',
        _mock: true
      });
    }

    if (error || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json({
      content: node.Content || '',
      title: node.Title
    });
  } catch (error) {
    console.error('Error in GET /api/courses/[courseId]/nodes/[nodeId]/content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/courses/[courseId]/nodes/[nodeId]/content - 保存節點內容
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    const { courseId, nodeId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      // 檢查是否是 Mock 模式
      const adminClient = createAdminClient();
      const { error: testError } = await adminClient.from('auth_user_bridge').select('user_id').limit(1);
      if (testError && shouldUseMock(testError)) {
        console.log('📦 Using mock data (database tables not found)');
        const { content: savedContent } = mockAPI.saveNodeContent(parseInt(courseId), parseInt(nodeId), content);
        return NextResponse.json({
          content: savedContent,
          _mock: true
        });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 使用 admin client 繞過 RLS
    const supabase = createAdminClient();

    // 檢查是否為課程創建者
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('CreatorID')
      .eq('CourseID', parseInt(courseId))
      .single();

    if (courseError && shouldUseMock(courseError)) {
      console.log('📦 Using mock data (database tables not found)');
      const { content: savedContent } = mockAPI.saveNodeContent(parseInt(courseId), parseInt(nodeId), content);
      return NextResponse.json({
        content: savedContent,
        _mock: true
      });
    }

    if (!course || course.CreatorID !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 更新節點內容
    const { data: node, error } = await supabase
      .from('node')
      .update({
        Content: content,
        UpdatedAt: new Date().toISOString()
      })
      .eq('NodeID', parseInt(nodeId))
      .eq('CourseID', parseInt(courseId))
      .select('Content')
      .single();

    if (error && shouldUseMock(error)) {
      console.log('📦 Using mock data (database tables not found)');
      const { content: savedContent } = mockAPI.saveNodeContent(parseInt(courseId), parseInt(nodeId), content);
      return NextResponse.json({
        content: savedContent,
        _mock: true
      });
    }

    if (error) {
      console.error('Error updating node content:', error);
      return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
    }

    return NextResponse.json({
      content: node.Content
    });
  } catch (error) {
    console.error('Error in PUT /api/courses/[courseId]/nodes/[nodeId]/content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

