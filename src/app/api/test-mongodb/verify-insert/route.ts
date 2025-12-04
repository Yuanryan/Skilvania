import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { getDatabase } from '@/lib/mongodb/client';

/**
 * 驗證插入操作是否真的成功
 * 這個 API 會：
 * 1. 插入一條測試記錄
 * 2. 立即查詢驗證記錄是否存在
 * 3. 返回詳細的驗證結果
 */
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

    // 測試 3: 連接數據庫
    let db;
    try {
      db = await getDatabase();
      tests.push({
        name: '連接數據庫',
        passed: true,
        message: `成功連接到數據庫: ${db.databaseName}`,
      });
    } catch (error: any) {
      success = false;
      tests.push({
        name: '連接數據庫',
        passed: false,
        message: '連接失敗',
        error: error.message,
      });
      return NextResponse.json({ success, tests });
    }

    // 測試 4: 插入測試記錄
    const collection = db.collection('user_activities');
    const testActivity = {
      userId,
      event: 'other',
      timestamp: new Date(),
    };

    let insertResult;
    try {
      insertResult = await collection.insertOne(testActivity);
      tests.push({
        name: '插入記錄',
        passed: !!insertResult.insertedId,
        message: insertResult.insertedId 
          ? `插入成功，insertedId: ${insertResult.insertedId}` 
          : '插入失敗：未返回 insertedId',
        insertedId: insertResult.insertedId?.toString(),
      });
    } catch (error: any) {
      success = false;
      tests.push({
        name: '插入記錄',
        passed: false,
        message: '插入時發生錯誤',
        error: error.message,
      });
      return NextResponse.json({ success, tests });
    }

    if (!insertResult.insertedId) {
      success = false;
      return NextResponse.json({ success, tests });
    }

    // 測試 5: 立即查詢驗證記錄是否存在
    try {
      const foundRecord = await collection.findOne({ 
        _id: insertResult.insertedId 
      });
      
      tests.push({
        name: '查詢驗證',
        passed: !!foundRecord,
        message: foundRecord 
          ? '✅ 成功查詢到剛插入的記錄' 
          : '❌ 無法查詢到剛插入的記錄',
        recordFound: !!foundRecord,
      });

      if (!foundRecord) {
        success = false;
      }

      // 測試 6: 使用 metadata 查詢
      const foundByMetadata = await collection.findOne({
        userId,
        event: 'other',
      }, {
        sort: { timestamp: -1 }
      });

      tests.push({
        name: '元數據查詢驗證',
        passed: !!foundByMetadata,
        message: foundByMetadata 
          ? '✅ 成功通過元數據查詢到記錄' 
          : '❌ 無法通過元數據查詢到記錄',
        recordFound: !!foundByMetadata,
      });

      if (!foundByMetadata) {
        success = false;
      }

      // 測試 7: 統計記錄數
      const count = await collection.countDocuments({
        userId,
        event: 'other',
      });

      tests.push({
        name: '記錄統計',
        passed: count > 0,
        message: `找到 ${count} 條測試記錄`,
        count,
      });

      return NextResponse.json({
        success,
        tests,
        message: success 
          ? '✅ 所有驗證通過！插入操作確實成功' 
          : '⚠️ 部分驗證失敗，插入可能未成功',
        details: {
          userId,
          insertedId: insertResult.insertedId?.toString(),
          recordFound: !!foundRecord,
          recordData: foundRecord ? {
            userId: foundRecord.userId,
            activityType: foundRecord.activityType,
            timestamp: foundRecord.timestamp,
            metadata: foundRecord.metadata,
          } : null,
        },
      });
    } catch (error: any) {
      success = false;
      tests.push({
        name: '查詢驗證',
        passed: false,
        message: '查詢時發生錯誤',
        error: error.message,
      });
      return NextResponse.json({ success, tests });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      tests,
      error: error.message,
      message: '驗證過程中發生錯誤',
    }, { status: 500 });
  }
}

