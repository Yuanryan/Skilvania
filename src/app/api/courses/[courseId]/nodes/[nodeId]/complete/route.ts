import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { safeNodeComplete, withRetry } from '@/lib/supabase/transactions';

// POST /api/courses/[courseId]/nodes/[nodeId]/complete - 標記節點為完成並更新 XP
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    const { courseId, nodeId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const nodeIdInt = parseInt(nodeId);
    const courseIdInt = parseInt(courseId);

    if (isNaN(nodeIdInt) || isNaN(courseIdInt)) {
      return NextResponse.json({ error: 'Invalid node or course ID' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 獲取節點信息以獲取 XP 獎勵
    const { data: node, error: nodeError } = await supabase
      .from('node')
      .select('XP, CourseID')
      .eq('NodeID', nodeIdInt)
      .single();

    if (nodeError || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // 驗證節點屬於該課程
    if (node.CourseID !== courseIdInt) {
      return NextResponse.json({ error: 'Node does not belong to this course' }, { status: 400 });
    }

    const xpReward = node.XP || 100;

    // 使用安全的事务操作完成节点（带重试机制）
    const result = await withRetry(
      () => safeNodeComplete(supabase, userId, nodeIdInt, xpReward),
      { maxRetries: 3, retryDelay: 50 }
    );

    if (!result.success) {
      console.error('Error completing node:', result.error);
      return NextResponse.json({ 
        error: 'Failed to complete node',
        details: result.error?.message 
      }, { status: 500 });
    }

    if (result.alreadyCompleted) {
      return NextResponse.json({
        success: true,
        message: 'Node already completed',
        xpGained: 0,
        alreadyCompleted: true
      });
    }

    // 获取更新后的用户信息
    const { data: user } = await supabase
      .from('USER')
      .select('XP, Level')
      .eq('UserID', userId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Node completed successfully',
      xpGained: result.xpGained || 0,
      newXP: user?.XP,
      newLevel: user?.Level,
      alreadyCompleted: false
    });
  } catch (error) {
    console.error('Error in POST /api/courses/[courseId]/nodes/[nodeId]/complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

