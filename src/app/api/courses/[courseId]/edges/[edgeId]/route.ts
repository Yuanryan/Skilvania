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
    // 處理臨時 ID（temp-xxx）的情況
    if (edgeId.startsWith('temp-')) {
      console.error('Cannot delete temporary edge:', edgeId);
      return NextResponse.json({ error: 'Cannot delete temporary edge' }, { status: 400 });
    }
    
    const numericEdgeId = edgeId.startsWith('e-') ? parseInt(edgeId.substring(2)) : parseInt(edgeId);
    
    if (isNaN(numericEdgeId)) {
      console.error('Invalid edgeId format:', edgeId);
      return NextResponse.json({ error: 'Invalid edge ID format' }, { status: 400 });
    }
    
    // 先檢查 edge 是否存在（可選，用於更好的錯誤訊息）
    const { data: existingEdge, error: checkError } = await supabase
      .from('edge')
      .select('EdgeID, CourseID')
      .eq('EdgeID', numericEdgeId)
      .eq('CourseID', parseInt(courseId))
      .maybeSingle();
    
    // 如果檢查時發生錯誤且不是 Mock 模式，記錄錯誤但繼續嘗試刪除
    if (checkError && !shouldUseMock(checkError)) {
      console.warn('Warning checking edge (will still attempt delete):', checkError);
    }
    
    // 如果 edge 不存在且不是 Mock 模式，返回 404
    if (!existingEdge && !checkError) {
      return NextResponse.json({ error: 'Edge not found' }, { status: 404 });
    }
    
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

