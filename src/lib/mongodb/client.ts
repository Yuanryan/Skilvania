import { MongoClient, Db, MongoClientOptions } from 'mongodb';

// MongoDB 是可選的，如果未配置則在開發環境中不拋出錯誤
const uri = process.env.MONGODB_URI;

// MongoDB 連接選項（包含 SSL 配置）
const options: MongoClientOptions = {
  // SSL/TLS 配置
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  // 連接超時設置
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
  // 重試設置
  retryWrites: true,
  retryReads: true,
  // 最大連接池大小
  maxPoolSize: 10,
  // 最小連接池大小
  minPoolSize: 1,
};

// 包裝連接函數以添加錯誤處理
function createClientPromise(): Promise<MongoClient> | null {
  if (!uri) return null;

  const client = new MongoClient(uri, options);
  
  // 創建一個包裝的 Promise，確保錯誤被正確處理
  const promise = new Promise<MongoClient>((resolve, reject) => {
    client.connect()
      .then((connectedClient) => {
        resolve(connectedClient);
      })
      .catch((error) => {
        console.error('❌ [MongoDB] 連接失敗:', error.message);
        console.error('❌ [MongoDB] 錯誤詳情:', {
          name: error.name,
          code: error.code,
          cause: error.cause?.message,
        });
        
        // 如果是 SSL 錯誤，提供建議
        if (error.message?.includes('SSL') || 
            error.message?.includes('TLS') || 
            error.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR') {
          console.error('💡 [MongoDB] SSL/TLS 錯誤建議:');
          console.error('   1. 檢查 MongoDB Atlas 連接字符串是否正確');
          console.error('   2. 確認網絡訪問列表包含您的 IP 地址（或設置為 0.0.0.0/0 允許所有 IP）');
          console.error('   3. 檢查防火牆設置');
          console.error('   4. 嘗試在 MongoDB Atlas 中重新生成連接字符串');
          console.error('   5. 確認 MongoDB Atlas 集群狀態正常');
        }
        
        // 關閉客戶端以避免資源洩漏
        client.close().catch(() => {
          // 忽略關閉錯誤
        });
        
        // 標記錯誤為已處理，但不中斷應用
        const handledError = new Error(`MongoDB connection failed: ${error.message}`);
        (handledError as any).handled = true;
        (handledError as any).isMongoError = true;
        reject(handledError);
      });
  });

  return promise;
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // 在開發模式下，使用全局變數以避免多個連接
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      clientPromise = createClientPromise();
      if (clientPromise) {
        globalWithMongo._mongoClientPromise = clientPromise;
      }
    } else {
      clientPromise = globalWithMongo._mongoClientPromise;
    }
  } else {
    // 在生產模式下，每次都創建新連接
    clientPromise = createClientPromise();
  }
} else if (process.env.NODE_ENV === 'production') {
  // 生產環境：如果未配置 MongoDB，記錄警告但不拋出錯誤
  // 這樣可以讓應用正常運行，只是活動記錄功能不可用
  console.warn('⚠️ [MongoDB] 生產環境未配置 MONGODB_URI，活動記錄功能將不可用');
  console.warn('⚠️ [MongoDB] 請在 Vercel Dashboard → Settings → Environment Variables 中配置');
}

export default clientPromise;

// 獲取數據庫實例的輔助函數
export async function getDatabase(): Promise<Db> {
  if (!clientPromise) {
    throw new Error('MongoDB is not configured. Please set MONGODB_URI in .env.local');
  }
  
  try {
    const client = await clientPromise;
    
    // 檢查連接是否成功
    if (!client) {
      throw new Error('MongoDB connection failed. Please check your connection string and network settings.');
    }
    
    // 測試連接
    await client.db('admin').admin().ping();
    
    return client.db(process.env.MONGODB_DB_NAME || 'skilvania');
  } catch (error: any) {
    // 如果錯誤已經被處理過，直接重新拋出
    if (error.handled) {
      throw error;
    }
    
    console.error('❌ [MongoDB] getDatabase 錯誤:', error.message);
    
    // 如果是連接錯誤，提供更詳細的信息
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      throw new Error(`MongoDB connection error: ${error.message}. Please check your connection string and network settings.`);
    }
    
    throw error;
  }
}

