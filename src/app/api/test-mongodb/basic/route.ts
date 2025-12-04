import { NextResponse } from 'next/server';

// 基本連接測試 - 不需要登入
export async function GET() {
  const tests: any[] = [];

  try {
    // 測試 1: 檢查環境變量
    const hasMongoUri = !!process.env.MONGODB_URI;
    const mongoDbName = process.env.MONGODB_DB_NAME || 'skilvania';
    
    tests.push({
      name: '環境變量 MONGODB_URI',
      passed: hasMongoUri,
      message: hasMongoUri 
        ? `✅ 已配置 (開頭: ${process.env.MONGODB_URI?.substring(0, 30)}...)` 
        : '❌ 未配置 - 請在 .env.local 中添加 MONGODB_URI',
    });

    tests.push({
      name: '環境變量 MONGODB_DB_NAME',
      passed: true,
      message: `使用數據庫名稱: ${mongoDbName}`,
    });

    if (!hasMongoUri) {
      return NextResponse.json({ 
        success: false, 
        tests,
        instructions: [
          '1. 在項目根目錄創建或編輯 .env.local 文件',
          '2. 添加: MONGODB_URI=mongodb+srv://...',
          '3. 添加: MONGODB_DB_NAME=skilvania',
          '4. 重啟開發服務器 (Ctrl+C 然後 npm run dev)',
        ],
      });
    }

    // 測試 2: 嘗試連接 MongoDB
    try {
      const { getDatabase } = await import('@/lib/mongodb/client');
      const db = await getDatabase();
      
      tests.push({
        name: 'MongoDB 連接',
        passed: true,
        message: `✅ 成功連接到數據庫: ${db.databaseName}`,
      });

      // 測試 3: 列出集合
      const collections = await db.listCollections().toArray();
      tests.push({
        name: '列出集合',
        passed: true,
        message: `找到 ${collections.length} 個集合`,
      });

      // 測試 4: 檢查 user_activities 集合
      const hasUserActivities = collections.some(c => c.name === 'user_activities');
      tests.push({
        name: 'user_activities 集合',
        passed: true,
        message: hasUserActivities 
          ? '✅ 集合已存在' 
          : 'ℹ️ 集合不存在（將在首次插入時自動創建）',
      });

      // 測試 5: 統計記錄數
      if (hasUserActivities) {
        const collection = db.collection('user_activities');
        const count = await collection.countDocuments();
        tests.push({
          name: '記錄統計',
          passed: true,
          message: `集合中有 ${count} 條活動記錄`,
        });
      }

      return NextResponse.json({
        success: true,
        tests,
        details: {
          databaseName: db.databaseName,
          collections: collections.map(c => c.name),
        },
      });
    } catch (error: any) {
      tests.push({
        name: 'MongoDB 連接',
        passed: false,
        message: '❌ 連接失敗',
        error: error.message,
      });

      return NextResponse.json({
        success: false,
        tests,
        troubleshooting: [
          '1. 確認 MONGODB_URI 格式正確',
          '2. 確認 MongoDB Atlas 網絡訪問列表包含您的 IP',
          '3. 確認數據庫用戶密碼正確',
          '4. 檢查是否有防火牆阻擋',
        ],
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      tests,
      error: error.message,
    }, { status: 500 });
  }
}

