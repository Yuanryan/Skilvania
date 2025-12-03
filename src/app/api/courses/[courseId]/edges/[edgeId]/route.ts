import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockAPI, shouldUseMock } from '@/lib/mock/creatorData';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// DELETE /api/courses/[courseId]/edges/[edgeId] - 刪除連接
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; edgeId: string }> }
) {
  try {
    const { courseId, edgeId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      // 檢查是否是 Mock 模式
      const adminClient = createAdminClient();
      const { error: testError } = await adminClient.from('auth_user_bridge').select('user_id').limit(1);
      if (testError && shouldUseMock(testError)) {
        console.log('📦 Using mock data (database tables not found)');
        const numericEdgeId = edgeId.startsWith('e-') ? parseInt(edgeId.substring(2)) : parseInt(edgeId);
        mockAPI.deleteEdge(parseInt(courseId), numericEdgeId);
        return NextResponse.json({ success: true, _mock: true });
      }
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

    // 刪除連接（edgeId 可能是 "e-123" 格式，需要提取數字）
    const numericEdgeId = edgeId.startsWith('e-') ? parseInt(edgeId.substring(2)) : parseInt(edgeId);
    
    const { error } = await supabase
      .from('edge')
      .delete()
      .eq('EdgeID', numericEdgeId)
      .eq('CourseID', parseInt(courseId));

    if (error && shouldUseMock(error)) {
      console.log('📦 Using mock data (database tables not found)');
      mockAPI.deleteEdge(parseInt(courseId), numericEdgeId);
      return NextResponse.json({ success: true, _mock: true });
    }

    if (error) {
      console.error('Error deleting edge:', error);
      return NextResponse.json({ error: 'Failed to delete edge' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/courses/[courseId]/edges/[edgeId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

