import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

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

    // 檢查是否已經完成過這個節點
    const { data: existingProgress } = await supabase
      .from('userprogress')
      .select('ProgressID, Status')
      .eq('UserID', userId)
      .eq('NodeID', nodeIdInt)
      .single();

    let progressId: number;
    const isNewProgress = !existingProgress;

    if (isNewProgress) {
      // 創建新的進度記錄
      const { data: newProgress, error: insertError } = await supabase
        .from('userprogress')
        .insert({
          UserID: userId,
          NodeID: nodeIdInt,
          Status: 'completed',
          CompletedAt: new Date().toISOString(),
        })
        .select('ProgressID')
        .single();

      if (insertError || !newProgress) {
        console.error('Error creating progress:', insertError);
        return NextResponse.json({ error: 'Failed to create progress' }, { status: 500 });
      }

      progressId = newProgress.ProgressID;
    } else {
      // 更新現有進度記錄（如果還沒完成）
      if (existingProgress.Status !== 'completed') {
        const { error: updateError } = await supabase
          .from('userprogress')
          .update({
            Status: 'completed',
            CompletedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString(),
          })
          .eq('ProgressID', existingProgress.ProgressID);

        if (updateError) {
          console.error('Error updating progress:', updateError);
          return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
        }
      } else {
        // 已經完成過，不重複獎勵 XP
        return NextResponse.json({
          success: true,
          message: 'Node already completed',
          xpGained: 0,
          alreadyCompleted: true
        });
      }

      progressId = existingProgress.ProgressID;
    }

    // 更新用戶 XP（只有在首次完成時才獎勵）
    if (isNewProgress || existingProgress.Status !== 'completed') {
      // 獲取當前用戶的 XP
      const { data: user, error: userError } = await supabase
        .from('USER')
        .select('XP, Level')
        .eq('UserID', userId)
        .single();

      if (userError || !user) {
        console.error('Error fetching user:', userError);
        // 即使獲取用戶失敗，進度已經更新，所以繼續執行
      } else {
        const newXP = (user.XP || 0) + xpReward;
        
        // 計算新等級（簡單公式：每 500 XP 升一級）
        const newLevel = Math.floor(newXP / 500) + 1;

        const { error: xpError } = await supabase
          .from('USER')
          .update({
            XP: newXP,
            Level: newLevel,
            UpdatedAt: new Date().toISOString(),
          })
          .eq('UserID', userId);

        if (xpError) {
          console.error('Error updating XP:', xpError);
          // 即使 XP 更新失敗，進度已經更新，所以返回成功但記錄錯誤
        }

        return NextResponse.json({
          success: true,
          message: 'Node completed successfully',
          xpGained: xpReward,
          newXP,
          newLevel,
          alreadyCompleted: false
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Node completed successfully',
      xpGained: xpReward,
      alreadyCompleted: false
    });
  } catch (error) {
    console.error('Error in POST /api/courses/[courseId]/nodes/[nodeId]/complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

