import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { logActivity } from '@/lib/mongodb/activity';

export async function POST() {
  const tests: any[] = [];
  let success = true;

  try {
    // 測試 1: 檢查用戶認證
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: '未登入，請先登入後再測試',
        tests: [{
          name: '用戶認證',
          passed: false,
          message: '未找到用戶 session',
        }],
      });
    }

    tests.push({
      name: '用戶認證',
      passed: true,
      message: `已登入，session.user.id: ${session.user.id}`,
    });

    // 測試 2: 獲取 UserID
    const userId = await getUserIdFromSession(session.user.id);
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '無法獲取 UserID',
        tests: [
          ...tests,
          {
            name: '獲取 UserID',
            passed: false,
            message: '從 session 轉換 UserID 失敗',
          },
        ],
      });
    }

    tests.push({
      name: '獲取 UserID',
      passed: true,
      message: `UserID: ${userId}`,
    });

    // 測試 3: 插入測試記錄
    try {
      await logActivity(userId, 'other');

      tests.push({
        name: '插入測試記錄',
        passed: true,
        message: '成功插入測試記錄到 MongoDB',
      });
    } catch (error: any) {
      success = false;
      tests.push({
        name: '插入測試記錄',
        passed: false,
        message: '插入失敗',
        error: error.message,
      });
    }

    // 測試 4: 驗證插入
    const { getDatabase } = await import('@/lib/mongodb/client');
    const db = await getDatabase();
    const collection = db.collection('user_activities');
    const testRecord = await collection.findOne({
      userId,
      event: 'other',
    }, {
      sort: { timestamp: -1 }
    });

    tests.push({
      name: '驗證插入',
      passed: !!testRecord,
      message: testRecord 
        ? `找到測試記錄，ID: ${testRecord._id}` 
        : '未找到剛插入的測試記錄',
    });

    return NextResponse.json({
      success,
      tests,
      message: success ? '所有測試通過！MongoDB 正常工作' : '部分測試失敗',
      details: {
        userId,
        recordId: testRecord?._id?.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      tests,
      error: error.message,
      message: '測試過程中發生錯誤',
    }, { status: 500 });
  }
}

