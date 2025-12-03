import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockAPI, shouldUseMock } from '@/lib/mock/creatorData';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// PUT /api/courses/[courseId]/nodes/batch - 批量更新節點位置
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
    const { nodes } = body;

    if (!Array.isArray(nodes)) {
      return NextResponse.json({ error: 'Nodes array is required' }, { status: 400 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      // 檢查是否是 Mock 模式
      const adminClient = createAdminClient();
      const { error: testError } = await adminClient.from('auth_user_bridge').select('user_id').limit(1);
      if (testError && shouldUseMock(testError)) {
        console.log('📦 Using mock data (database tables not found)');
        mockAPI.batchUpdateNodes(parseInt(courseId), nodes);
        return NextResponse.json({ success: true, updated: nodes.length, _mock: true });
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

    // 批量更新節點位置
    const updatePromises = nodes.map((node: { nodeId: string; x: number; y: number }) => {
      if (typeof node.x !== 'number' || typeof node.y !== 'number' || 
          node.x < 0 || node.x > 800 || node.y < 0 || node.y > 800) {
        return Promise.reject(new Error(`Invalid coordinates for node ${node.nodeId}`));
      }

      return supabase
        .from('node')
        .update({
          X: node.x,
          Y: node.y,
          UpdatedAt: new Date().toISOString()
        })
        .eq('NodeID', parseInt(node.nodeId))
        .eq('CourseID', parseInt(courseId));
    });

    const results = await Promise.allSettled(updatePromises);
    
    // 檢查是否有資料庫錯誤（表不存在）
    const dbErrors = results.filter(r => 
      r.status === 'rejected' || 
      (r.status === 'fulfilled' && r.value.error && shouldUseMock(r.value.error))
    );

    if (dbErrors.length > 0 && dbErrors.some(r => 
      r.status === 'fulfilled' && r.value.error && shouldUseMock(r.value.error)
    )) {
      console.log('📦 Using mock data (database tables not found)');
      mockAPI.batchUpdateNodes(parseInt(courseId), nodes);
      return NextResponse.json({ success: true, updated: nodes.length, _mock: true });
    }

    const errors = results.filter(r => r.status === 'rejected');
    if (errors.length > 0) {
      console.error('Some nodes failed to update:', errors);
      return NextResponse.json({ 
        error: 'Some nodes failed to update',
        details: errors
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: nodes.length });
  } catch (error) {
    console.error('Error in PUT /api/courses/[courseId]/nodes/batch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

