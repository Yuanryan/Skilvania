import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb/client';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/admin/check - 檢查當前用戶是否有 admin 權限
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    const email = session.user.email || null;

    if (userId === null && !email) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const db = await getDatabase();
    const isAdmin = await checkIsAdmin(db, userId, email);

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    // 發生錯誤時默認返回 false，不顯示 Analytics
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}

// 檢查 admin 資格：
// 1) 檢查 user_permission 集合 (顯式列表)
// 2) 檢查 users 集合的 Roles 欄位是否包含 'admin'
// 優先以 userId，比對不到再用 email
async function checkIsAdmin(db: any, userId: number | null, email?: string | null) {
  const permissions = db.collection('user_permission');
  const users = db.collection('users');

  const filter: any = {
    $or: [
      ...(userId ? [{ userId }, { UserID: userId }] : []),
      ...(email ? [{ email }, { Email: email }] : []),
    ],
  };
  // 若沒有任何查詢條件，直接拒絕
  if (filter.$or.length === 0) return false;

  // 1) 顯式 user_permission 集合
  const admin = await permissions.findOne(filter);
  if (admin) return true;

  // 2) users 集合 Roles 欄位包含 'admin'
  const userDoc = await users.findOne(filter, { projection: { Roles: 1, roles: 1 } });
  const roles = Array.isArray(userDoc?.Roles) ? userDoc.Roles : Array.isArray(userDoc?.roles) ? userDoc.roles : [];
  if (roles.includes('admin')) return true;

  return false;
}

