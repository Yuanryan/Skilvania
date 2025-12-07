import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/profile/[username] - 獲取用戶資料
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const supabase = createAdminClient();

    // 首先嘗試精確匹配（大小寫敏感）
    let { data: user, error } = await supabase
      .from('USER')
      .select(`
        *
      `)
      .eq('Username', username)
      .single();

    // 如果找不到，嘗試大小寫不敏感的查詢
    if (error || !user) {
      console.log(`Exact match failed for username: ${username}, trying case-insensitive search`);
      
      // 使用 ilike 進行大小寫不敏感查詢
      const { data: users, error: searchError } = await supabase
        .from('USER')
        .select(`
          *,
          USERROLE (
            ROLES (
              RoleName
            )
          )
        `)
        .ilike('Username', username);

      if (searchError) {
        console.error('Error searching user:', searchError);
        return NextResponse.json({ 
          error: 'User not found',
          details: searchError.message,
          code: searchError.code
        }, { status: 404 });
      }

      if (!users || users.length === 0) {
        // 列出所有用戶名以便調試（僅在開發環境）
        if (process.env.NODE_ENV === 'development') {
          const { data: allUsers } = await supabase
            .from('USER')
            .select('Username')
            .limit(10);
          
          console.log('Available usernames (sample):', allUsers?.map(u => u.Username));
        }
        
        return NextResponse.json({ 
          error: 'User not found',
          searchedUsername: username
        }, { status: 404 });
      }

      // 使用找到的第一個用戶（應該只有一個，因為 Username 是 UNIQUE）
      user = users[0];
      error = null;
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 計算用戶統計數據
    let nodesUnlocked = 0;
    let coursesCompleted = 0;
    
    try {
      // 獲取用戶完成的節點數量
      const { data: progressData } = await supabase
        .from('userprogress')
        .select('NodeID')
        .eq('UserID', user.UserID);
      
      if (progressData) {
        nodesUnlocked = progressData.length;
      }

      // 計算完成的課程數量（完成所有節點的課程）
      // 這需要更複雜的查詢，暫時返回 0
      coursesCompleted = 0;
    } catch (err) {
      console.error('Error calculating user stats:', err);
    }

    return NextResponse.json({
      user: {
        userID: user.UserID,
        username: user.Username,
        email: user.Email,
        level: user.Level || 1,
        xp: user.XP || 0,
        createdAt: user.CreatedAt,
        updatedAt: user.UpdatedAt,
        roles: user.USERROLE?.map((ur: any) => ({
          roleID: ur.ROLES.RoleID,
          roleName: ur.ROLES.RoleName
        })) || [],
        stats: {
          coursesCompleted,
          nodesUnlocked,
          streak: 0 // TODO: 實現 streak 計算
        }
      }
    });
  } catch (error) {
    console.error('Error in GET /api/profile/[username]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

