import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

interface MatchedUser {
  userID: number;
  username: string;
  level: number;
  xp: number;
  bio: string | null;
  interests: string[];
  sharedCourses: Array<{
    courseId: number;
    courseTitle: string;
  }>;
  compatibilityScore: number;
}

// GET /api/community/match - 獲取推薦的學習夥伴
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const supabase = createAdminClient();

    // 獲取當前用戶資訊
    const { data: currentUser, error: userError } = await supabase
      .from('USER')
      .select('Username, Level, XP')
      .eq('UserID', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 獲取當前用戶的社群檔案
    const { data: currentProfile } = await supabase
      .from('community_profiles')
      .select('Interests')
      .eq('UserID', userId)
      .single();

    const currentUserInterests = currentProfile?.Interests || [];

    // 獲取當前用戶正在學習的課程（包含課程標題）
    const { data: currentUserProgress, error: progressError } = await supabase
      .from('userprogress')
      .select('NodeID, node!inner(CourseID, course!inner(Title))')
      .eq('UserID', userId);

    if (progressError) {
      console.error('Error fetching user progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to fetch user progress' },
        { status: 500 }
      );
    }

    // 提取當前用戶正在學習的課程 ID 和標題
    const currentUserCourseIds = new Set<number>();
    const currentUserCourseMap = new Map<number, string>();
    if (currentUserProgress) {
      currentUserProgress.forEach((progress: any) => {
        if (progress.node?.CourseID) {
          currentUserCourseIds.add(progress.node.CourseID);
          if (progress.node.course?.Title) {
            currentUserCourseMap.set(progress.node.CourseID, progress.node.course.Title);
          }
        }
      });
    }

    if (currentUserCourseIds.size === 0) {
      // 如果用戶還沒有開始任何課程，返回空列表
      return NextResponse.json({
        matches: [],
        message: 'Start a course to find study buddies!'
      });
    }

    // 獲取所有用戶（排除自己，限制 200 人以提升性能）
    const { data: potentialBuddies, error: buddiesError } = await supabase
      .from('community_profiles')
      .select(`
        UserID,
        Bio,
        Interests,
        USER!inner (
          UserID,
          Username,
          Level,
          XP
        )
      `)
      .neq('UserID', userId)
      .limit(200);

    if (buddiesError) {
      console.error('Error fetching potential buddies:', buddiesError);
      return NextResponse.json(
        { error: 'Failed to fetch potential buddies' },
        { status: 500 }
      );
    }

    if (!potentialBuddies || potentialBuddies.length === 0) {
      return NextResponse.json({
        matches: [],
        message: 'No other users found at the moment'
      });
    }

    // ⚡ PERFORMANCE OPTIMIZATION: Batch fetch all user progress in ONE query
    const buddyUserIds = potentialBuddies.map(b => b.UserID);
    
    const { data: allBuddyProgress } = await supabase
      .from('userprogress')
      .select('UserID, NodeID, node!inner(CourseID, course!inner(Title))')
      .in('UserID', buddyUserIds);

    // Build a map of UserID -> Course data for fast lookup
    const userCoursesMap = new Map<number, { courseIds: Set<number>; courseMap: Map<number, string> }>();
    
    if (allBuddyProgress) {
      allBuddyProgress.forEach((progress: any) => {
        const userId = progress.UserID;
        if (!userCoursesMap.has(userId)) {
          userCoursesMap.set(userId, {
            courseIds: new Set(),
            courseMap: new Map()
          });
        }
        
        const userCourses = userCoursesMap.get(userId)!;
        if (progress.node?.CourseID) {
          userCourses.courseIds.add(progress.node.CourseID);
          if (progress.node.course?.Title) {
            userCourses.courseMap.set(progress.node.CourseID, progress.node.course.Title);
          }
        }
      });
    }

    // 為每個潛在夥伴計算匹配分數
    const matchedUsers: MatchedUser[] = [];

    for (const buddy of potentialBuddies) {
      const buddyUserId = buddy.UserID;
      const buddyUser = buddy.USER as any;

      // Get courses from pre-built map (NO DATABASE QUERY!)
      const buddyData = userCoursesMap.get(buddyUserId);
      const buddyCourseIds = buddyData?.courseIds || new Set<number>();
      const courseMap = buddyData?.courseMap || new Map<number, string>();

      // 計算共同課程
      const sharedCourses: Array<{ courseId: number; courseTitle: string }> = [];
      currentUserCourseIds.forEach(courseId => {
        if (buddyCourseIds.has(courseId)) {
          sharedCourses.push({
            courseId,
            courseTitle: courseMap.get(courseId) || currentUserCourseMap.get(courseId) || 'Unknown Course'
          });
        }
      });

      // 如果沒有共同課程，計算其他推薦理由，不直接跳過
      // if (sharedCourses.length === 0) {
      //   continue;
      // }

      // 計算兼容性分數
      let score = 0;

      // 1. 共同課程分數（每個共同課程 +30 分，最高 60 分）
      if (sharedCourses.length > 0) {
        score += Math.min(sharedCourses.length * 30, 60);
      } else {
        // 如果沒有共同課程，給予基礎分，確保有機會被推薦
        // 優先推薦活躍用戶（有參與課程的用戶）
        if (buddyCourseIds.size > 0) {
          score += 10;
        }
      }

      // 2. XP/等級相似度分數（最高 25 分）
      const levelDiff = Math.abs(currentUser.Level - buddyUser.Level);
      const xpDiff = Math.abs(currentUser.XP - buddyUser.XP);
      
      if (levelDiff === 0) {
        score += 15;
      } else if (levelDiff <= 2) {
        score += 10;
      } else if (levelDiff <= 5) {
        score += 5;
      }

      if (xpDiff <= 500) {
        score += 10;
      } else if (xpDiff <= 1000) {
        score += 5;
      }

      // 3. 共同興趣分數（最高 15 分）
      const buddyInterests = buddy.Interests || [];
      const sharedInterests = currentUserInterests.filter(interest =>
        buddyInterests.includes(interest)
      );
      score += Math.min(sharedInterests.length * 5, 15);

      matchedUsers.push({
        userID: buddyUserId,
        username: buddyUser.Username,
        level: buddyUser.Level || 1,
        xp: buddyUser.XP || 0,
        bio: buddy.Bio,
        interests: buddyInterests,
        sharedCourses,
        compatibilityScore: score
      });
    }

    // 如果沒有匹配到用戶（分數為 0），添加一些活躍用戶作為推薦
    if (matchedUsers.length === 0 && potentialBuddies.length > 0) {
      // 隨機選取最多 5 個用戶
      const shuffled = [...potentialBuddies].sort(() => 0.5 - Math.random());
      const randomUsers = shuffled.slice(0, 5);
      
      for (const buddy of randomUsers) {
        matchedUsers.push({
          userID: buddy.UserID,
          username: buddy.USER.Username,
          level: buddy.USER.Level || 1,
          xp: buddy.USER.XP || 0,
          bio: buddy.Bio,
          interests: buddy.Interests || [],
          sharedCourses: [],
          compatibilityScore: 5 // 給予最低分以區分
        });
      }
    }

    // 按兼容性分數排序（高到低）
    matchedUsers.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // 限制返回前 20 個最佳匹配
    const topMatches = matchedUsers.slice(0, 20);

    return NextResponse.json({
      matches: topMatches,
      totalMatches: matchedUsers.length
    });
  } catch (error) {
    console.error('Error in GET /api/community/match:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

