import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/dashboard - 獲取用戶儀表板數據
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const supabase = createAdminClient();

    // 獲取用戶資訊
    const { data: user, error: userError } = await supabase
      .from('USER')
      .select('Username, Level, XP')
      .eq('UserID', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 獲取用戶進度（完成的節點）
    const { data: progressData, error: progressError } = await supabase
      .from('userprogress')
      .select('NodeID, CompletedAt')
      .eq('UserID', userId)
      .order('CompletedAt', { ascending: false });

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      // 即使有錯誤也繼續執行，只是沒有進度數據
    }

    const activeCourses: any[] = [];

    if (progressData && progressData.length > 0) {
      // 獲取所有相關節點的 CourseID
      const nodeIds = progressData.map(p => p.NodeID);
      const { data: nodes, error: nodesError } = await supabase
        .from('node')
        .select('NodeID, CourseID')
        .in('NodeID', nodeIds);

      if (nodesError) {
        console.error('Error fetching nodes:', nodesError);
      }

      // 建立 NodeID 到 CourseID 的映射
      const nodeToCourseMap = new Map<number, number>();
      nodes?.forEach(node => {
        nodeToCourseMap.set(node.NodeID, node.CourseID);
      });

      // 建立 CourseID 到進度記錄的映射
      const courseProgressMap = new Map<number, any[]>();
      progressData.forEach(progress => {
        const courseId = nodeToCourseMap.get(progress.NodeID);
        if (courseId) {
          if (!courseProgressMap.has(courseId)) {
            courseProgressMap.set(courseId, []);
          }
          courseProgressMap.get(courseId)!.push(progress);
        }
      });

      // 獲取每個課程的詳細資訊和進度
      for (const [courseId, courseProgress] of courseProgressMap.entries()) {
        const { data: course } = await supabase
          .from('course')
          .select('CourseID, Title')
          .eq('CourseID', courseId)
          .single();

        if (!course) continue;

        // 獲取課程的所有節點
        const { data: allNodes } = await supabase
          .from('node')
          .select('NodeID')
          .eq('CourseID', courseId);

        const totalNodes = allNodes?.length || 0;
        const completedNodes = courseProgress.length;

        const progress = totalNodes > 0 
          ? Math.round((completedNodes / totalNodes) * 100)
          : 0;

        // 獲取最後學習時間
        const sortedProgress = courseProgress.sort((a, b) => {
          const aTime = a.CompletedAt ? new Date(a.CompletedAt).getTime() : 0;
          const bTime = b.CompletedAt ? new Date(b.CompletedAt).getTime() : 0;
          return bTime - aTime;
        });
        const lastProgress = sortedProgress[0];
        const lastPlayed = lastProgress?.CompletedAt 
          ? getTimeAgo(new Date(lastProgress.CompletedAt))
          : 'Never';

        activeCourses.push({
          id: course.CourseID,
          title: course.Title,
          progress,
          totalNodes,
          completedNodes,
          lastPlayed,
          lastCompletedAt: lastProgress?.CompletedAt || null
        });
      }

      // 按最後學習時間排序
      activeCourses.sort((a, b) => {
        const aTime = a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : 0;
        const bTime = b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : 0;
        return bTime - aTime;
      });
    }

    // 計算 streak（連續學習天數）
    // TODO: 實現更準確的 streak 計算
    const streak = 0;

    // 計算下一級所需的 XP
    const nextLevelXp = (user.Level + 1) * 500; // 簡單的計算公式

    return NextResponse.json({
      user: {
        name: user.Username,
        level: user.Level || 1,
        xp: user.XP || 0,
        nextLevelXp,
        streak
      },
      activeCourses: activeCourses.slice(0, 10) // 最多返回 10 個課程
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 輔助函數：計算時間差
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return '1 day ago';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

