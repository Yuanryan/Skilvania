import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDatabase } from '@/lib/mongodb/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/analytics - 獲取分析數據（所有登入用戶都可以訪問）
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const courseId = searchParams.get('courseId');

    const db = await getDatabase();

    // 檢查是否為 admin（改用 Supabase roles/userrole）
    const userId = await getUserIdFromSession(session.user.id);
    const isAdminUser = await checkIsAdmin(userId);
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const collection = db.collection('user_activities');

    // 時間過濾器
    const timeFilter: any = {};
    if (startDate) {
      // 設置為當天的 00:00:00
      timeFilter.$gte = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      // 設置為當天的 23:59:59.999，確保包含整天的數據
      timeFilter.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    switch (type) {
      case 'time-distribution':
        return await getTimeDistribution(collection, timeFilter);
      
      case 'course-duration':
        return await getCourseDuration(collection, timeFilter, courseId);
      
      case 'course-popularity':
        return await getCoursePopularity(collection, timeFilter);
      
      case 'node-popularity':
        return await getNodePopularity(collection, timeFilter, courseId);
      
      case 'user-activity':
        return await getUserActivity(collection, timeFilter);
      
      case 'overview':
      default:
        return await getOverview(collection, timeFilter);
    }
  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 檢查 admin 資格：使用 Supabase ROLES / USERROLE
async function checkIsAdmin(userId: number | null): Promise<boolean> {
  if (userId === null) return false;
  const supabase = createAdminClient();

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('RoleID')
    .eq('RoleName', 'admin')
    .maybeSingle();

  if (roleError || !role?.RoleID) {
    console.error('checkIsAdmin: failed to get admin role', roleError);
    return false;
  }

  const { data: userRole, error: urError } = await supabase
    .from('userrole')
    .select('UserID')
    .eq('UserID', userId)
    .eq('RoleID', role.RoleID)
    .maybeSingle();

  if (urError) {
    console.error('checkIsAdmin: failed to check userrole', urError);
    return false;
  }

  return !!userRole;
}

// 1. 時間區段分析
async function getTimeDistribution(collection: any, timeFilter: any) {
  const pipeline = [
    { $match: { 
      event: { $in: ['node_view', 'course_view'] },
      ...(Object.keys(timeFilter).length > 0 && { timestamp: timeFilter })
    }},
    {
      $group: {
        _id: { $hour: '$timestamp' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const hourlyStats = await collection.aggregate(pipeline).toArray();

  return NextResponse.json({
    hourly: hourlyStats.map((r: any) => ({ hour: r._id, count: r.count }))
  });
}

// 2. 課程學習時間分析
async function getCourseDuration(collection: any, timeFilter: any, courseId?: string | null) {
  const supabase = createAdminClient();
  
  // 獲取所有課程的 start 和 complete 事件
  const pipeline = [
    {
      $match: {
        event: { $in: ['course_view', 'course_complete'] },
        ...(courseId && { courseId: parseInt(courseId) }),
        ...(Object.keys(timeFilter).length > 0 && { timestamp: timeFilter })
      }
    },
    {
      $sort: { userId: 1, courseId: 1, timestamp: 1 }
    },
    {
      $group: {
        _id: { userId: '$userId', courseId: '$courseId' },
        events: { $push: { event: '$event', timestamp: '$timestamp' } }
      }
    }
  ];

  const results = await collection.aggregate(pipeline).toArray();
  
  const durations: any[] = [];
  
  for (const result of results) {
    // 確保事件按時間排序，並找到「首個 course_view」之後的「首個 course_complete」
    const sortedEvents = (result.events || []).slice().sort((a: any, b: any) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    let startTime: number | null = null;
    let completeTime: number | null = null;

    for (const e of sortedEvents) {
      const ts = new Date(e.timestamp).getTime();
      if (e.event === 'course_view' && startTime === null) {
        startTime = ts;
      } else if (e.event === 'course_complete' && startTime !== null) {
        completeTime = ts;
        break; // 找到第一個完成時間即可
      }
    }

    // 只計入合理的（完成時間晚於開始時間）
    if (startTime !== null && completeTime !== null && completeTime >= startTime) {
      const duration = completeTime - startTime;
      durations.push({
        courseId: result._id.courseId,
        userId: result._id.userId,
        duration, // 毫秒
        durationHours: duration / (1000 * 60 * 60),
        startTime: new Date(startTime).toISOString(),
        completeTime: new Date(completeTime).toISOString()
      });
    }
  }

  // 按課程分組統計
  const courseStats: Record<number, any> = {};
  for (const d of durations) {
    if (!courseStats[d.courseId]) {
      courseStats[d.courseId] = {
        courseId: d.courseId,
        completions: [],
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0
      };
    }
    courseStats[d.courseId].completions.push(d.durationHours);
  }

  // 計算統計數據
  const stats = Object.values(courseStats).map((stat: any) => {
    const durations = stat.completions;
    const avg = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
    return {
      courseId: stat.courseId,
      completionCount: durations.length,
      avgDurationHours: Math.round(avg * 100) / 100,
      minDurationHours: Math.round(Math.min(...durations) * 100) / 100,
      maxDurationHours: Math.round(Math.max(...durations) * 100) / 100
    };
  });

  // 獲取課程名稱
  const courseIds = stats.map((s: any) => s.courseId);
  if (courseIds.length > 0) {
    const { data: courses } = await supabase
      .from('course')
      .select('CourseID, Title')
      .in('CourseID', courseIds);
    
    const courseMap = new Map(courses?.map((c: any) => [c.CourseID, c.Title]) || []);
    stats.forEach((stat: any) => {
      stat.courseTitle = courseMap.get(stat.courseId) || 'Unknown';
    });
  }

  return NextResponse.json({ stats, rawDurations: durations.slice(0, 100) });
}

// 3. 課程熱度分析
async function getCoursePopularity(collection: any, timeFilter: any) {
  const supabase = createAdminClient();
  
  const pipeline = [
    {
      $match: {
        event: { $in: ['course_view', 'course_complete', 'node_view'] },
        courseId: { $exists: true },
        ...(Object.keys(timeFilter).length > 0 && { timestamp: timeFilter })
      }
    },
    {
      $group: {
        _id: '$courseId',
        starts: { $sum: { $cond: [{ $eq: ['$event', 'course_view'] }, 1, 0] } },
        completes: { $sum: { $cond: [{ $eq: ['$event', 'course_complete'] }, 1, 0] } },
        nodeViews: { $sum: { $cond: [{ $eq: ['$event', 'node_view'] }, 1, 0] } },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        courseId: '$_id',
        starts: 1,
        completes: 1,
        nodeViews: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        completionRate: {
          $cond: [
            { $gt: ['$starts', 0] },
            {
              // 限制最大 100%，避免完成數超過開始數
              $min: [
                { $multiply: [{ $divide: ['$completes', '$starts'] }, 100] },
                100
              ]
            },
            0
          ]
        }
      }
    },
    { $sort: { starts: -1 } }
  ];

  const results = await collection.aggregate(pipeline).toArray();
  
  // 獲取課程名稱
  const courseIds = results.map((r: any) => r.courseId);
  if (courseIds.length > 0) {
    const { data: courses } = await supabase
      .from('course')
      .select('CourseID, Title')
      .in('CourseID', courseIds);
    
    const courseMap = new Map(courses?.map((c: any) => [c.CourseID, c.Title]) || []);
    results.forEach((r: any) => {
      r.courseTitle = courseMap.get(r.courseId) || 'Unknown';
    });
  }

  return NextResponse.json({ courses: results });
}

// 4. 節點熱度分析
async function getNodePopularity(collection: any, timeFilter: any, courseId?: string | null) {
  const pipeline = [
    {
      $match: {
        event: { $in: ['node_view', 'node_complete'] },
        nodeId: { $exists: true },
        ...(courseId && { courseId: parseInt(courseId) }),
        ...(Object.keys(timeFilter).length > 0 && { timestamp: timeFilter })
      }
    },
    {
      $group: {
        _id: { courseId: '$courseId', nodeId: '$nodeId' },
        views: { $sum: { $cond: [{ $eq: ['$event', 'node_view'] }, 1, 0] } },
        completes: { $sum: { $cond: [{ $eq: ['$event', 'node_complete'] }, 1, 0] } },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        courseId: '$_id.courseId',
        nodeId: '$_id.nodeId',
        views: 1,
        completes: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        completionRate: {
          $cond: [
            { $gt: ['$views', 0] },
            { $multiply: [{ $divide: ['$completes', '$views'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { views: -1 } },
    { $limit: 100 }
  ];

  const results = await collection.aggregate(pipeline).toArray();
  return NextResponse.json({ nodes: results });
}

// 5. 用戶活動統計
async function getUserActivity(collection: any, timeFilter: any) {
  const pipeline = [
    {
      $match: {
        ...(Object.keys(timeFilter).length > 0 && { timestamp: timeFilter })
      }
    },
    {
      $group: {
        _id: '$event',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        event: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { count: -1 } }
  ];

  const results = await collection.aggregate(pipeline).toArray();
  
  // 每日活躍用戶數
  const dailyActive = await collection.aggregate([
    {
      $match: {
        ...(Object.keys(timeFilter).length > 0 && { timestamp: timeFilter })
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        activeUsers: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { date: 1 } }
  ]).toArray();

  // 近期高活躍用戶
  const topUsersRaw = await collection.aggregate([
    {
      $match: {
        ...(Object.keys(timeFilter).length > 0 && { timestamp: timeFilter })
      }
    },
    {
      $group: {
        _id: '$userId',
        totalActivities: { $sum: 1 },
        nodeViews: { $sum: { $cond: [{ $eq: ['$event', 'node_view'] }, 1, 0] } },
        courseCompletes: { $sum: { $cond: [{ $eq: ['$event', 'course_complete'] }, 1, 0] } },
        courseStarts: { $sum: { $cond: [{ $eq: ['$event', 'course_view'] }, 1, 0] } },
      }
    },
    { $sort: { totalActivities: -1 } },
    { $limit: 20 }
  ]).toArray();

  let topUsers = topUsersRaw.map((u: any) => ({
    userId: u._id,
    totalActivities: u.totalActivities || 0,
    nodeViews: u.nodeViews || 0,
    courseCompletes: u.courseCompletes || 0,
    courseStarts: u.courseStarts || 0,
  }));

  // 取用戶名稱
  const supabase = createAdminClient();
  const userIds = topUsers.map((u) => u.userId).filter((id) => id !== null && id !== undefined);
  if (userIds.length > 0) {
    const { data: userRecords } = await supabase
      .from('USER')
      .select('UserID, Username')
      .in('UserID', userIds);

    const nameMap = new Map((userRecords || []).map((u: any) => [u.UserID, u.Username]));
    topUsers = topUsers.map((u) => ({
      ...u,
      username: nameMap.get(u.userId) || `User ${u.userId}`,
    }));
  }

  return NextResponse.json({
    eventStats: results,
    dailyActiveUsers: dailyActive,
    topUsers,
  });
}

// 6. 總覽數據
async function getOverview(collection: any, timeFilter: any) {
  const totalActivities = await collection.countDocuments(
    Object.keys(timeFilter).length > 0 ? { timestamp: timeFilter } : {}
  );
  
  const uniqueUsers = await collection.distinct('userId',
    Object.keys(timeFilter).length > 0 ? { timestamp: timeFilter } : {}
  );

  const eventStats = await collection.aggregate([
    {
      $match: Object.keys(timeFilter).length > 0 ? { timestamp: timeFilter } : {}
    },
    {
      $group: {
        _id: '$event',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]).toArray();

  return NextResponse.json({
    totalActivities,
    uniqueUsers: uniqueUsers.length,
    eventStats: eventStats.map((e: any) => ({ event: e._id, count: e.count }))
  });
}

