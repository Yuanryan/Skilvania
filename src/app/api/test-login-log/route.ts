import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { logActivity } from '@/lib/mongodb/activity';

/**
 * 測試登入活動記錄
 * 這個 API 會模擬登入活動記錄，用於診斷問題
 * GET: 不需要登入，直接測試 MongoDB 連接和插入
 * POST: 需要登入，使用當前用戶測試
 */
export async function GET() {
  // GET 方法：不需要登入，直接測試 MongoDB 連接
  try {
    console.log('🧪 [GET] 開始測試 MongoDB 連接和插入...');
    
    // 檢查 MongoDB 配置
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({
        success: false,
        message: 'MongoDB 未配置',
        details: {
          note: '請在 .env.local 中添加 MONGODB_URI',
        },
      });
    }

    // 測試連接和插入
    const { getDatabase } = await import('@/lib/mongodb/client');
    const db = await getDatabase();
    const collection = db.collection('user_activities');
    
    // 插入測試記錄（使用測試用戶 ID）- 最小必要格式
    const testActivity = {
      userId: 999999, // 測試用戶 ID
      event: 'login',
      timestamp: new Date(),
    };

    const result = await collection.insertOne(testActivity);
    
    // 驗證插入
    const foundRecord = await collection.findOne({ _id: result.insertedId });
    
    if (foundRecord) {
      return NextResponse.json({
        success: true,
        message: '✅ MongoDB 連接和插入測試成功！',
        details: {
          insertedId: result.insertedId?.toString(),
          recordFound: true,
          database: db.databaseName,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '⚠️ 插入成功但無法查詢到記錄',
        details: {
          insertedId: result.insertedId?.toString(),
          recordFound: false,
        },
      });
    }
  } catch (error: any) {
    console.error('❌ [GET] 測試失敗:', error);
    return NextResponse.json({
      success: false,
      message: '測試失敗',
      error: {
        message: error.message,
        stack: error.stack,
      },
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: '未登入，請先登入後再測試',
      }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '無法獲取 UserID',
      }, { status: 404 });
    }

    console.log('🧪 開始測試登入活動記錄...');
    console.log('🧪 UserID:', userId);
    console.log('🧪 Session ID:', session.user.id);

    // 測試記錄登入活動
    try {
      await logActivity(userId, 'login');

      // 驗證記錄是否真的插入
      const { getDatabase } = await import('@/lib/mongodb/client');
      const db = await getDatabase();
      const collection = db.collection('user_activities');
      
      const testRecord = await collection.findOne({
        userId,
        event: 'login',
      }, {
        sort: { timestamp: -1 }
      });

      if (testRecord) {
        return NextResponse.json({
          success: true,
          message: '✅ 登入活動記錄測試成功！',
          details: {
            userId,
            recordId: testRecord._id?.toString(),
            timestamp: testRecord.timestamp,
            event: testRecord.event,
          },
        });
      } else {
        return NextResponse.json({
          success: false,
          message: '⚠️ logActivity 執行成功，但無法查詢到記錄',
          details: {
            userId,
            note: '可能是 MongoDB 寫入延遲或查詢問題',
          },
        });
      }
    } catch (error: any) {
      console.error('❌ 測試登入活動記錄失敗:', error);
      return NextResponse.json({
        success: false,
        message: '記錄登入活動時發生錯誤',
        error: {
          message: error.message,
          stack: error.stack,
        },
        details: {
          userId,
        },
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ 測試 API 錯誤:', error);
    return NextResponse.json({
      success: false,
      message: '測試過程中發生錯誤',
      error: error.message,
    }, { status: 500 });
  }
}

