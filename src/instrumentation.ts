/**
 * Next.js Instrumentation Hook
 * 用於處理全局錯誤，包括未處理的 Promise rejection
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 處理未捕獲的 Promise rejection
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      // 如果是 MongoDB 連接錯誤，記錄但不中斷應用
      if (reason?.name === 'MongoServerSelectionError' || 
          reason?.name === 'MongoNetworkError' ||
          reason?.message?.includes('MongoDB') ||
          reason?.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR') {
        console.error('⚠️ [MongoDB] 未處理的連接錯誤（已捕獲）:', reason.message);
        console.error('⚠️ [MongoDB] 活動記錄功能可能不可用，但應用將繼續運行');
        return; // 不中斷應用
      }
      
      // 其他未處理的 rejection 記錄錯誤
      console.error('❌ [Unhandled Rejection]:', reason);
      console.error('Promise:', promise);
    });

    // 處理未捕獲的異常
    process.on('uncaughtException', (error: Error) => {
      // 如果是 MongoDB 連接錯誤，記錄但不中斷應用
      if (error.name === 'MongoServerSelectionError' || 
          error.name === 'MongoNetworkError' ||
          error.message?.includes('MongoDB') ||
          (error as any).code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR') {
        console.error('⚠️ [MongoDB] 未捕獲的連接錯誤（已捕獲）:', error.message);
        console.error('⚠️ [MongoDB] 活動記錄功能可能不可用，但應用將繼續運行');
        return; // 不中斷應用
      }
      
      // 其他未捕獲的異常記錄錯誤
      console.error('❌ [Uncaught Exception]:', error);
    });
  }
}

