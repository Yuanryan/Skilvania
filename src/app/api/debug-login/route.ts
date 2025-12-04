import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { logActivity } from '@/lib/mongodb/activity';

/**
 * 調試登入活動記錄
 * GET: 不需要登入，直接測試 logActivity 函數
 * POST: 需要登入，使用當前用戶測試
 */
export async function GET() {
  // GET 方法：不需要登入，直接測試 logActivity
  try {
    console.log('🔍 [Debug GET] 開始調試 logActivity 函數...');
    
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

    // 使用測試用戶 ID 測試 logActivity
    const testUserId = 999999;
    
    console.log('🔍 [Debug GET] 模擬 logActivity 調用...');
    console.log('🔍 [Debug GET] 參數:', {
      userId: testUserId,
      activityType: 'login',
      metadata: { method: 'debug', source: 'debug_api_get' },
    });
    
    try {
      console.log('🔍 [Debug GET] 調用 logActivity 前...');
      
      const logPromise = logActivity(testUserId, 'login');

      console.log('🔍 [Debug GET] logActivity 已調用（等待完成）...');
      
      await logPromise;

      console.log('🔍 [Debug GET] logActivity Promise 已完成');

      // 驗證記錄
      const { getDatabase } = await import('@/lib/mongodb/client');
      const db = await getDatabase();
      const collection = db.collection('user_activities');
      
      const record = await collection.findOne({
        userId: testUserId,
        event: 'login',
      }, {
        sort: { timestamp: -1 }
      });

      if (record) {
        return NextResponse.json({
          success: true,
          message: '✅ 調試成功！logActivity 函數正常工作',
          details: {
            userId: testUserId,
            recordId: record._id?.toString(),
            timestamp: record.timestamp,
            metadata: record.metadata,
          },
          conclusion: 'logActivity 函數本身工作正常。如果實際登入時沒有記錄，問題可能在：1) 登入流程沒有執行到 logActivity 2) 環境變量在登入時未加載',
        });
      } else {
        return NextResponse.json({
          success: false,
          message: '⚠️ logActivity 執行成功，但無法查詢到記錄',
          details: {
            userId: testUserId,
          },
        });
      }
    } catch (error: any) {
      console.error('❌ [Debug GET] logActivity 執行失敗:', error);
      return NextResponse.json({
        success: false,
        message: 'logActivity 執行失敗',
        error: {
          message: error.message,
          stack: error.stack,
        },
        details: {
          userId: testUserId,
        },
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ [Debug GET] API 錯誤:', error);
    return NextResponse.json({
      success: false,
      message: '調試過程中發生錯誤',
      error: error.message,
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

    console.log('🔍 [Debug] 開始調試登入活動記錄...');
    console.log('🔍 [Debug] Session:', {
      sessionId: session.user.id,
      email: session.user.email,
    });
    console.log('🔍 [Debug] UserID:', userId);

    // 模擬登入流程中的 logActivity 調用
    console.log('🔍 [Debug] 模擬 logActivity 調用...');
    
    try {
      await logActivity(userId, 'login');

      console.log('🔍 [Debug] logActivity 執行完成');

      // 驗證記錄
      const { getDatabase } = await import('@/lib/mongodb/client');
      const db = await getDatabase();
      const collection = db.collection('user_activities');
      
      const record = await collection.findOne({
        userId,
        event: 'login',
      }, {
        sort: { timestamp: -1 }
      });

      if (record) {
        return NextResponse.json({
          success: true,
          message: '✅ 調試成功！logActivity 正常工作',
          details: {
            userId,
            recordId: record._id?.toString(),
            timestamp: record.timestamp,
            metadata: record.metadata,
          },
          conclusion: 'logActivity 函數本身工作正常，問題可能在登入流程的其他部分',
        });
      } else {
        return NextResponse.json({
          success: false,
          message: '⚠️ logActivity 執行成功，但無法查詢到記錄',
          details: {
            userId,
          },
        });
      }
    } catch (error: any) {
      console.error('❌ [Debug] logActivity 執行失敗:', error);
      return NextResponse.json({
        success: false,
        message: 'logActivity 執行失敗',
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
    console.error('❌ [Debug] API 錯誤:', error);
    return NextResponse.json({
      success: false,
      message: '調試過程中發生錯誤',
      error: error.message,
    }, { status: 500 });
  }
}

