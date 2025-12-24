import { Navbar } from '@/components/ui/Navbar';
import { User, MapPin, Calendar, Trophy, Flame, GitBranch, Share2, AlertCircle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

interface CourseData {
  id: number;
  title: string;
  progress: number;
  totalNodes: number;
  completedNodes: number;
}

interface UserData {
  userID: number;
  username: string;
  email: string;
  level: number;
  xp: number;
  createdAt: string;
  updatedAt: string;
  roles: Array<{ roleID: number; roleName: string }>;
  stats: {
    coursesCompleted: number;
    nodesUnlocked: number;
    streak: number;
  };
  courses: CourseData[];
}

async function fetchUserData(username: string): Promise<{ user: UserData | null; error: string | null }> {
  try {
    const supabase = createAdminClient();

    // 首先嘗試精確匹配（大小寫敏感）
    let { data: user, error } = await supabase
      .from('USER')
      .select('*')
      .eq('Username', username)
      .single();

    // 如果找不到，嘗試大小寫不敏感的查詢
    if (error || !user) {
      const { data: users, error: searchError } = await supabase
        .from('USER')
        .select('*')
        .ilike('Username', username);

      if (searchError) {
        console.error('Error searching user:', searchError);
        return { user: null, error: 'User not found' };
      }

      if (!users || users.length === 0) {
        return { user: null, error: null }; // 404
      }

      user = users[0];
    }

    if (!user) {
      return { user: null, error: null };
    }

    // 分別查詢用戶角色（避免嵌套查詢問題）
    let roles: Array<{ roleID: number; roleName: string }> = [];
    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from('userrole')
        .select('RoleID')
        .eq('UserID', user.UserID);

      if (!rolesError && userRoles && userRoles.length > 0) {
        const roleIds = userRoles.map(ur => ur.RoleID);
        
        const { data: rolesData, error: rolesDataError } = await supabase
          .from('roles')
          .select('RoleID, RoleName')
          .in('RoleID', roleIds);

        if (!rolesDataError && rolesData) {
          roles = rolesData.map((r: any) => ({
            roleID: r.RoleID,
            roleName: r.RoleName
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching user roles:', err);
      // Continue without roles if there's an error
    }

    // 計算用戶統計數據和獲取課程
    let nodesUnlocked = 0;
    let coursesCompleted = 0;
    const userCourses: CourseData[] = [];
    
    try {
      // 獲取用戶進度記錄
      const { data: progressData, error: progressError } = await supabase
        .from('userprogress')
        .select('NodeID, CompletedAt, Status')
        .eq('UserID', user.UserID)
        .in('Status', ['unlocked', 'completed']);
      
      if (progressError) {
        console.error('Error fetching progress:', progressError);
      }

      if (progressData && progressData.length > 0) {
        nodesUnlocked = progressData.length;

        // 獲取所有相關節點的 CourseID
        const nodeIds = progressData.map(p => p.NodeID);
        const { data: nodes, error: nodesError } = await supabase
          .from('node')
          .select('NodeID, CourseID')
          .in('NodeID', nodeIds);

        if (!nodesError && nodes) {
          // 建立 NodeID 到 CourseID 的映射
          const nodeToCourseMap = new Map<number, number>();
          nodes.forEach(node => {
            nodeToCourseMap.set(node.NodeID, node.CourseID);
          });

          // 建立 CourseID 到進度記錄的映射
          const courseProgressMap = new Map<number, any[]>();
          progressData.forEach(progress => {
            const courseId = nodeToCourseMap.get(progress.NodeID);
            if (courseId) {
              if (!courseProgressMap.has(courseId)) {
                courseProgressMap.set(courseId, []);
              }
              courseProgressMap.get(courseId)!.push(progress);
            }
          });

          // 獲取每個課程的詳細資訊和進度
          for (const [courseId, courseProgress] of courseProgressMap.entries()) {
            const { data: course, error: courseError } = await supabase
              .from('course')
              .select('CourseID, Title')
              .eq('CourseID', courseId)
              .single();

            if (courseError || !course) continue;

            // 獲取課程的所有節點
            const { data: allNodes } = await supabase
              .from('node')
              .select('NodeID')
              .eq('CourseID', courseId);

            const totalNodes = allNodes?.length || 0;
            const completedNodes = courseProgress.filter(p => p.Status === 'completed').length;

            const progress = totalNodes > 0 
              ? Math.round((completedNodes / totalNodes) * 100)
              : 0;

            // 如果進度為 100%，則計入完成的課程
            if (progress === 100) {
              coursesCompleted++;
            }

            userCourses.push({
              id: course.CourseID,
              title: course.Title,
              progress,
              totalNodes,
              completedNodes
            });
          }

          // 按進度排序（進度高的在前）
          userCourses.sort((a, b) => b.progress - a.progress);
        }
      }
    } catch (err) {
      console.error('Error calculating user stats:', err);
    }

    return {
      user: {
        userID: user.UserID,
        username: user.Username,
        email: user.Email,
        level: user.Level || 1,
        xp: user.XP || 0,
        createdAt: user.CreatedAt,
        updatedAt: user.UpdatedAt,
        roles,
        stats: {
          coursesCompleted,
          nodesUnlocked,
          streak: 0
        },
        courses: userCourses
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { 
      user: null, 
      error: error instanceof Error ? error.message : 'Failed to load user data' 
    };
  }
}

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { user: userData, error } = await fetchUserData(username);

  // 如果沒有用戶數據且沒有錯誤訊息，說明是 404
  if (!userData && !error) {
    notFound();
  }

  // 如果有錯誤但沒有用戶數據，顯示錯誤頁面
  if (!userData && error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-white bg-slate-900/50 p-8 rounded-2xl border border-red-500/20">
            <AlertCircle size={48} className="text-red-500" />
            <p className="text-lg font-bold">無法載入用戶資料</p>
            <p className="text-slate-400">{error}</p>
            <p className="text-slate-500 text-sm mt-2">用戶名: {username}</p>
          </div>
        </main>
      </div>
    );
  }

  const joinedDate = userData.createdAt 
    ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) 
    : 'Recently';
  const stats = userData.stats;
  const activeTrees = userData.courses || [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 py-10">
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-400 text-sm font-medium">警告</p>
              <p className="text-yellow-300/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}
        
        {/* Profile Header */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-900/40 to-transparent pointer-events-none"></div>
            
            <div className="relative flex flex-col md:flex-row items-start md:items-end gap-6">
                <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-900 flex items-center justify-center shadow-2xl overflow-hidden">
                    <User size={64} className="text-emerald-500" />
                </div>
                
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white mb-2">{userData.username}</h1>
                    <div className="flex flex-wrap gap-4 text-slate-400 text-sm mb-4">
                        <span className="flex items-center gap-1"><MapPin size={14} /> Skilvania</span>
                        <span className="flex items-center gap-1"><Calendar size={14} /> Joined {joinedDate}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {userData.roles && userData.roles.length > 0 ? (
                            userData.roles.map((role) => (
                                <span key={role.roleID} className="px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-xs font-medium">
                                    {role.roleName}
                                </span>
                            ))
                        ) : (
                            <span className="text-slate-500 text-sm">No roles assigned</span>
                        )}
                    </div>
                    <p className="text-slate-300 max-w-xl leading-relaxed">Ready to learn and grow.</p>
                </div>

                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors">
                        Follow
                    </button>
                    <button className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-colors">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">

            {/* Left Col: Stats */}
            <div className="space-y-6">
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-4">Overview</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Trophy size={18} className="text-amber-500" /> Level
                            </div>
                            <span className="font-bold text-white text-lg">{userData.level}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Trophy size={18} className="text-purple-500" /> XP
                            </div>
                            <span className="font-bold text-white text-lg">{userData.xp}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-slate-300">
                                <GitBranch size={18} className="text-emerald-500" /> Nodes
                            </div>
                            <span className="font-bold text-white text-lg">{stats.nodesUnlocked}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Flame size={18} className="text-orange-500" /> Streak
                            </div>
                            <span className="font-bold text-white text-lg">{stats.streak} Days</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-4">Badges</h3>
                    <div className="flex flex-wrap gap-2">
                       <span className="text-slate-500 text-sm">No badges yet</span>
                    </div>
                </div>
            </div>

            {/* Right Col: Garden (Active Trees) */}
            <div className="md:col-span-2 space-y-6">
                <h3 className="text-xl font-bold text-white mb-4">Skill Garden</h3>
                
                {activeTrees.length > 0 ? (
                    <div className="grid gap-4">
                        {activeTrees.map((tree: CourseData) => {
                            // 根據進度選擇顏色類別
                            const getColorClasses = (progress: number) => {
                                if (progress === 100) {
                                    return {
                                        bg: 'bg-emerald-900/20',
                                        border: 'border-emerald-500/20',
                                        text: 'text-emerald-500',
                                        progressBg: 'bg-emerald-500'
                                    };
                                }
                                if (progress >= 50) {
                                    return {
                                        bg: 'bg-blue-900/20',
                                        border: 'border-blue-500/20',
                                        text: 'text-blue-500',
                                        progressBg: 'bg-blue-500'
                                    };
                                }
                                if (progress >= 25) {
                                    return {
                                        bg: 'bg-purple-900/20',
                                        border: 'border-purple-500/20',
                                        text: 'text-purple-500',
                                        progressBg: 'bg-purple-500'
                                    };
                                }
                                return {
                                    bg: 'bg-slate-800/20',
                                    border: 'border-slate-500/20',
                                    text: 'text-slate-400',
                                    progressBg: 'bg-slate-500'
                                };
                            };
                            const colors = getColorClasses(tree.progress);
                            
                            return (
                                <Link
                                    key={tree.id}
                                    href={`/courses/${tree.id}`}
                                    className="bg-slate-900 border border-white/5 p-6 rounded-2xl flex items-center gap-6 hover:border-white/10 transition-colors cursor-pointer"
                                >
                                    <div className={`w-16 h-16 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                                        <GitBranch className={colors.text} size={32} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-bold text-white mb-2 truncate">{tree.title}</h4>
                                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className={`${colors.progressBg} h-full transition-all duration-300`} 
                                                style={{ width: `${tree.progress}%` }}
                                            ></div>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                                            <span>{tree.completedNodes} / {tree.totalNodes} nodes</span>
                                            <span className="font-bold">{tree.progress}% Complete</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                        <GitBranch size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No active courses started yet.</p>
                    </div>
                )}
            </div>

        </div>

      </main>
    </div>
  );
}
