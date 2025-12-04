import { MongoClient, Db } from 'mongodb';

// MongoDB 是可選的，如果未配置則在開發環境中不拋出錯誤
const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // 在開發模式下，使用全局變數以避免多個連接
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // 在生產模式下，每次都創建新連接
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
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
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || 'skilvania');
}

