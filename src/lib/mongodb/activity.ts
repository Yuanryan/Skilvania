import { getDatabase } from './client';
import { UserActivity, EventType, ActivityQuery } from '@/types';

const COLLECTION_NAME = 'user_activities';

/**
 * 記錄用戶活動（最小必要格式）
 */
export async function logActivity(
  userId: number,
  event: EventType,
  data: {
    courseId?: number;
    nodeId?: number;
    xpGained?: number;
  } = {}
): Promise<void> {
  try {
    // 如果 MongoDB 未配置，記錄警告並返回
    if (!process.env.MONGODB_URI) {
      const env = process.env.NODE_ENV || 'unknown';
      console.warn(`⚠️ [logActivity] MongoDB 未配置 (環境: ${env})，跳過活動記錄`);
      if (env === 'production') {
        console.warn('⚠️ [logActivity] 請在 Vercel Dashboard → Settings → Environment Variables 中配置 MONGODB_URI');
      } else {
        console.warn('⚠️ [logActivity] 請檢查 .env.local 中是否有 MONGODB_URI');
      }
      return;
    }
    
    console.log('📝 [logActivity] 開始記錄活動:', { 
      userId, 
      event,
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    let db;
    try {
      db = await getDatabase();
    } catch (dbError: any) {
      // 如果是 MongoDB 連接錯誤，記錄但不中斷
      if (dbError.isMongoError || dbError.message?.includes('MongoDB') || dbError.handled) {
        console.warn('⚠️ [logActivity] MongoDB 連接失敗，跳過活動記錄:', dbError.message);
        return;
      }
      throw dbError; // 其他錯誤重新拋出
    }
    
    const collection = db.collection(COLLECTION_NAME);

    // 構建最小必要活動記錄
    const activity: Omit<UserActivity, '_id'> = {
      userId,
      event,
      timestamp: new Date(),
      ...(data.courseId && { courseId: data.courseId }),
      ...(data.nodeId && { nodeId: data.nodeId }),
      ...(data.xpGained !== undefined && { xpGained: data.xpGained }),
    };

    const result = await collection.insertOne(activity as UserActivity);
    
    // 驗證插入是否成功
    if (!result.insertedId) {
      throw new Error('插入失敗：未返回 insertedId');
    }
    
    // 再次驗證：查詢剛插入的記錄
    const insertedRecord = await collection.findOne({ _id: result.insertedId });
    if (!insertedRecord) {
      throw new Error('插入失敗：無法查詢到剛插入的記錄');
    }
    
    console.log('✅ 活動記錄成功並驗證:', { 
      insertedId: result.insertedId, 
      event,
      verified: true 
    });
  } catch (error) {
    console.error('❌ 記錄活動失敗:', error);
    console.error('❌ 錯誤詳情:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      event,
    });
    // 不拋出錯誤，避免影響主要功能
  }
}

/**
 * 批量記錄用戶活動（用於性能優化）
 */
export async function logActivities(
  activities: Array<{
    userId: number;
    event: EventType;
    courseId?: number;
    nodeId?: number;
    xpGained?: number;
  }>
): Promise<void> {
  try {
    // 如果 MongoDB 未配置，靜默返回
    if (!process.env.MONGODB_URI) {
      return;
    }
    
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const docs = activities.map((activity) => ({
      userId: activity.userId,
      event: activity.event,
      timestamp: new Date(),
      ...(activity.courseId && { courseId: activity.courseId }),
      ...(activity.nodeId && { nodeId: activity.nodeId }),
      ...(activity.xpGained !== undefined && { xpGained: activity.xpGained }),
    }));

    if (docs.length > 0) {
      await collection.insertMany(docs);
    }
  } catch (error) {
    console.error('Error logging activities:', error);
    // 不拋出錯誤，避免影響主要功能
  }
}

/**
 * 查詢用戶活動記錄
 */
export async function getActivities(
  query: ActivityQuery
): Promise<UserActivity[]> {
  try {
    // 如果 MongoDB 未配置，返回空數組
    if (!process.env.MONGODB_URI) {
      return [];
    }
    
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const filter: any = {};

    if (query.userId) {
      filter.userId = query.userId;
    }

    if (query.event) {
      if (Array.isArray(query.event)) {
        filter.event = { $in: query.event };
      } else {
        filter.event = query.event;
      }
    }

    if (query.courseId) {
      filter.courseId = query.courseId;
    }

    if (query.nodeId) {
      filter.nodeId = query.nodeId;
    }

    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) {
        filter.timestamp.$gte = query.startDate;
      }
      if (query.endDate) {
        filter.timestamp.$lte = query.endDate;
      }
    }

    const sortOrder = query.sort === 'asc' ? 1 : -1;
    const cursor = collection
      .find(filter)
      .sort({ timestamp: sortOrder })
      .limit(query.limit || 100)
      .skip(query.skip || 0);

    const results = await cursor.toArray();
    return results as unknown as UserActivity[];
  } catch (error) {
    console.error('Error getting activities:', error);
    throw error;
  }
}

/**
 * 獲取用戶活動統計
 */
export async function getActivityStats(
  userId: number,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalActivities: number;
  activitiesByEvent: Record<EventType, number>;
  lastActivityDate?: Date;
}> {
  try {
    // 如果 MongoDB 未配置，返回空統計
    if (!process.env.MONGODB_URI) {
      return {
        totalActivities: 0,
        activitiesByEvent: {} as Record<EventType, number>,
      };
    }
    
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const filter: any = { userId };
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }

    // 按事件類型統計
    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    const activitiesByEvent = {} as Record<EventType, number>;
    results.forEach((result) => {
      activitiesByEvent[result._id as EventType] = result.count;
    });

    const totalActivities = await collection.countDocuments(filter);
    const lastActivity = await collection
      .findOne(filter, { sort: { timestamp: -1 } });

    return {
      totalActivities,
      activitiesByEvent,
      lastActivityDate: lastActivity?.timestamp,
    };
  } catch (error) {
    console.error('Error getting activity stats:', error);
    throw error;
  }
}

/**
 * 刪除舊的活動記錄（用於數據清理）
 */
export async function deleteOldActivities(
  olderThanDays: number = 365
): Promise<number> {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await collection.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  } catch (error) {
    console.error('Error deleting old activities:', error);
    throw error;
  }
}
