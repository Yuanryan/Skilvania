import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@/lib/auth/config';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/leaderboard - 獲取排行榜數據
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const session = await auth();
    
    // 獲取當前用戶 ID（如果已登入）
    let currentUserId: number | null = null;
    if (session?.user?.id) {
      currentUserId = await getUserIdFromSession(session.user.id);
    }

    // 獲取所有用戶的 XP 和 Level，按 XP 降序排列
    const { data: users, error } = await supabase
      .from('USER')
      .select('UserID, Username, Level, XP')
      .order('XP', { ascending: false })
      .limit(100); // 限制返回前 100 名

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // 轉換為排行榜格式
    const leaderboard = (users || []).map((user, index) => {
      const rank = index + 1;
      
      // 判斷排名變化（暫時設為穩定，因為沒有歷史數據）
      let change: 'up' | 'down' | 'same' = 'same';
      
      // 簡單的頭像顏色分配
      const colors = ['purple', 'emerald', 'blue', 'amber', 'red', 'pink', 'indigo', 'cyan'];
      const avatarColor = colors[index % colors.length];

      return {
        rank,
        username: user.Username,
        xp: user.XP || 0,
        level: user.Level || 1,
        change,
        avatarColor,
        isCurrentUser: currentUserId !== null && user.UserID === currentUserId
      };
    });

    return NextResponse.json({
      leaderboard: leaderboard.slice(0, 50) // 返回前 50 名
    });
  } catch (error) {
    console.error('Error in GET /api/leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

