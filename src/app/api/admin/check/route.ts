import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/admin/check - 檢查當前用戶是否有 admin 權限
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const isAdmin = await checkIsAdmin(userId);

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    // 發生錯誤時默認返回 false，不顯示 Analytics
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}

// 使用 Supabase ROLES / USERROLE 檢查 admin
async function checkIsAdmin(userId: number): Promise<boolean> {
  const supabase = createAdminClient();

  // 取得 admin RoleID
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('RoleID')
    .eq('RoleName', 'admin')
    .maybeSingle();

  if (roleError || !role?.RoleID) {
    console.error('checkIsAdmin: failed to get admin role', roleError);
    return false;
  }

  // 檢查 USERROLE 是否有對應關係
  const { data: userRole, error: urError } = await supabase
    .from('userrole')
    .select('UserID')
    .eq('UserID', userId)
    .eq('RoleID', role.RoleID)
    .maybeSingle();

  if (urError) {
    console.error('checkIsAdmin: failed to check userrole', urError);
    return false;
  }

  return !!userRole;
}

