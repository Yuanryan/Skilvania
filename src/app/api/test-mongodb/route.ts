import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/client';

export async function GET() {
  const tests: any[] = [];
  let success = true;

  try {
    // 測試 1: 檢查環境變量
    const hasMongoUri = !!process.env.MONGODB_URI;
    tests.push({
      name: '環境變量檢查',
      passed: hasMongoUri,
      message: hasMongoUri 
        ? `MONGODB_URI 已配置: ${process.env.MONGODB_URI?.substring(0, 20)}...` 
        : 'MONGODB_URI 未配置',
    });

    if (!hasMongoUri) {
      return NextResponse.json({ success: false, tests });
    }

    // 測試 2: 連接 MongoDB
    let db;
    try {
      db = await getDatabase();
      tests.push({
        name: 'MongoDB 連接',
        passed: true,
        message: `成功連接到數據庫: ${db.databaseName}`,
      });
    } catch (error: any) {
      success = false;
      tests.push({
        name: 'MongoDB 連接',
        passed: false,
        message: '連接失敗',
        error: error.message,
      });
      return NextResponse.json({ success, tests });
    }

    // 測試 3: 檢查集合
    const collections = await db.listCollections().toArray();
    const hasCollection = collections.some(c => c.name === 'user_activities');
    tests.push({
      name: '集合檢查',
      passed: true,
      message: hasCollection 
        ? 'user_activities 集合已存在' 
        : 'user_activities 集合不存在（將在首次插入時創建）',
    });

    // 測試 4: 統計現有記錄
    const collection = db.collection('user_activities');
    const count = await collection.countDocuments();
    tests.push({
      name: '現有記錄數',
      passed: true,
      message: `集合中有 ${count} 條記錄`,
    });

    return NextResponse.json({
      success: true,
      tests,
      details: {
        databaseName: db.databaseName,
        collections: collections.map(c => c.name),
        recordCount: count,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      tests,
      error: error.message,
    }, { status: 500 });
  }
}

