import { getDatabase } from './client';
import { UserActivity, ActivityType, ActivityQuery } from '@/types';

const COLLECTION_NAME = 'user_activities';

/**
 * 記錄用戶活動
 */
export async function logActivity(
  userId: number,
  activityType: ActivityType,
  metadata?: Record<string, any>,
  sessionId?: string
): Promise<void> {
  try {
    const db = await getDatabase();
    const collection = db.collection<UserActivity>(COLLECTION_NAME);

    const activity: Omit<UserActivity, '_id'> = {
      userId,
      activityType,
      timestamp: new Date(),
      metadata: metadata || {},
      sessionId,
      createdAt: new Date(),
    };

    await collection.insertOne(activity as UserActivity);
  } catch (error) {
    console.error('Error logging activity:', error);
    // 不拋出錯誤，避免影響主要功能
  }
}

/**
 * 批量記錄用戶活動（用於性能優化）
 */
export async function logActivities(
  activities: Array<{
    userId: number;
    activityType: ActivityType;
    metadata?: Record<string, any>;
    sessionId?: string;
  }>
): Promise<void> {
  try {
    const db = await getDatabase();
    const collection = db.collection<UserActivity>(COLLECTION_NAME);

    const docs = activities.map((activity) => ({
      userId: activity.userId,
      activityType: activity.activityType,
      timestamp: new Date(),
      metadata: activity.metadata || {},
      sessionId: activity.sessionId,
      createdAt: new Date(),
    }));

    if (docs.length > 0) {
      await collection.insertMany(docs as UserActivity[]);
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
    const db = await getDatabase();
    const collection = db.collection<UserActivity>(COLLECTION_NAME);

    const filter: any = {};

    if (query.userId) {
      filter.userId = query.userId;
    }

    if (query.activityType) {
      if (Array.isArray(query.activityType)) {
        filter.activityType = { $in: query.activityType };
      } else {
        filter.activityType = query.activityType;
      }
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

    return await cursor.toArray();
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
  activitiesByType: Record<ActivityType, number>;
  lastActivityDate?: Date;
}> {
  try {
    const db = await getDatabase();
    const collection = db.collection<UserActivity>(COLLECTION_NAME);

    const filter: any = { userId };
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = startDate;
      if (endDate) filter.timestamp.$lte = endDate;
    }

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    const activitiesByType = {} as Record<ActivityType, number>;

    results.forEach((result) => {
      activitiesByType[result._id as ActivityType] = result.count;
    });

    const totalActivities = await collection.countDocuments(filter);
    const lastActivity = await collection
      .findOne(filter, { sort: { timestamp: -1 } });

    return {
      totalActivities,
      activitiesByType,
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
    const collection = db.collection<UserActivity>(COLLECTION_NAME);

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

