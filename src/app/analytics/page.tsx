"use client";

import { Navbar } from '@/components/ui/Navbar';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, Clock, TrendingUp, Users, 
  Loader2, AlertCircle 
} from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [seedingGroups, setSeedingGroups] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTab, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: selectedTab,
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate })
      });

      const response = await fetch(`/api/analytics?${params}`, { cache: 'no-store' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedGroups = async () => {
    if (!confirm('This will create public study groups for all course tags and randomly add users to them. Continue?')) return;

    try {
      setSeedingGroups(true);
      setSeedResult(null);
      
      const response = await fetch('/api/admin/seed-groups', {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to seed groups');
      }

      const result = await response.json();
      const usersMsg = result.usersAdded > 0 ? ` Added ${result.usersAdded} users to groups.` : '';
      setSeedResult(`✓ Success! Created ${result.created} new groups. ${result.existing} already existed.${usersMsg} Total: ${result.total} tags processed.`);
    } catch (err) {
      console.error('Error seeding groups:', err);
      setSeedResult(`✗ Error: ${err instanceof Error ? err.message : 'Failed to seed groups'}`);
    } finally {
      setSeedingGroups(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'time-distribution', label: 'Time Distribution', icon: Clock },
    { id: 'course-duration', label: 'Course Duration', icon: Clock },
    { id: 'course-popularity', label: 'Course Popularity', icon: TrendingUp },
    { id: 'user-activity', label: 'User Activity', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 text-sm font-medium">Error</p>
              <p className="text-red-300/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Date Range Selector */}
        <div className="mb-6 flex gap-4 items-end">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={48} />
          </div>
        ) : (
          <div className="space-y-6">
            {selectedTab === 'overview' && <OverviewView data={data} />}
            {selectedTab === 'time-distribution' && <TimeDistributionView data={data} />}
            {selectedTab === 'course-duration' && <CourseDurationView data={data} />}
            {selectedTab === 'course-popularity' && <CoursePopularityView data={data} />}
            {selectedTab === 'user-activity' && (
              <UserActivityView 
                data={data} 
                handleSeedGroups={handleSeedGroups}
                seedingGroups={seedingGroups}
                seedResult={seedResult}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Overview View
function OverviewView({ data }: { data: any }) {
  if (!data) return <div className="text-slate-400">No data available</div>;
  
  const translateEvent = (event: string) => {
    const map: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      course_view: 'Course Viewed',
      course_start: 'Course Viewed', // 舊事件名稱，映射為 Course Viewed
      course_complete: 'Course Completed',
      course_create: 'Course Created',
      course_edit: 'Course Edited',
      node_view: 'Node Viewed',
      node_complete: 'Node Completed',
      node_create: 'Node Created',
      node_edit: 'Node Edited',
      page_view: 'Page Viewed',
      search: 'Search',
      profile_update: 'Profile Updated',
      submission_create: 'Submission Created',
      submission_review: 'Submission Reviewed',
      other: 'Other',
    };
    return map[event] || event;
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
        <div className="text-3xl font-bold text-white mb-2">{data.totalActivities?.toLocaleString() || 0}</div>
        <div className="text-slate-400">Total Activities</div>
      </div>
      <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
        <div className="text-3xl font-bold text-white mb-2">{data.uniqueUsers?.toLocaleString() || 0}</div>
        <div className="text-slate-400">Active Users</div>
      </div>
      <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
        <div className="text-3xl font-bold text-white mb-2">{data.eventStats?.length || 0}</div>
        <div className="text-slate-400">Event Types</div>
      </div>

      <div className="col-span-3 bg-slate-900/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Event Statistics</h3>
        <div className="space-y-2">
          {data.eventStats?.map((stat: any) => (
            <div key={stat.event} className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-300">{translateEvent(stat.event)}</span>
              <span className="text-white font-bold">{stat.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Time Distribution View
function TimeDistributionView({ data }: { data: any }) {
  if (!data?.hourly) return <div className="text-slate-400">No data available</div>;
  
  const maxCount = Math.max(...data.hourly.map((h: any) => h.count), 1);
  const description = 'Tracks events: Node Views (node_view) and Course Views (course_view). Time displayed in GMT+8.';
  
  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-white">Hourly Activity Distribution (GMT+8)</h3>
        <p className="text-xs text-slate-400 text-right max-w-md">{description}</p>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
        {Array.from({ length: 24 }, (_, i) => {
          const hourData = data.hourly.find((h: any) => h.hour === i);
          const count = hourData?.count || 0;
          const displayHour = (i + 8) % 24; // 轉為 GMT+8
          return (
            <div key={i} className="flex flex-col items-center">
              <div className="w-full bg-slate-800 rounded-t flex flex-col justify-end" style={{ height: '200px' }}>
                <div
                  className="bg-emerald-500 rounded-t transition-all"
                  style={{ 
                    height: `${(count / maxCount) * 100}%`,
                    minHeight: count > 0 ? '4px' : '0'
                  }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-2">{displayHour}:00</div>
              <div className="text-xs text-white font-bold">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Course Duration View
function CourseDurationView({ data }: { data: any }) {
  if (!data?.stats || data.stats.length === 0) {
    return <div className="text-slate-400 bg-slate-900/50 border border-white/10 rounded-xl p-6">No data available</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Course Completion Time Statistics</h3>
        <div className="space-y-4">
          {data.stats.map((stat: any) => (
            <div key={stat.courseId} className="border-b border-white/5 pb-4 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <Link href={`/courses/${stat.courseId}`} className="text-white font-bold hover:text-emerald-400 transition-colors">
                    {stat.courseTitle || `Course ${stat.courseId}`}
                  </Link>
                  <p className="text-sm text-slate-400">Completions: {stat.completionCount}</p>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">{stat.avgDurationHours} hours</div>
                  <div className="text-xs text-slate-400">Average Duration</div>
                </div>
              </div>
              <div className="flex gap-4 text-sm text-slate-400">
                <span>Shortest: {stat.minDurationHours}h</span>
                <span>Longest: {stat.maxDurationHours}h</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Course Popularity View
function CoursePopularityView({ data }: { data: any }) {
  if (!data?.courses || data.courses.length === 0) {
    return <div className="text-slate-400 bg-slate-900/50 border border-white/10 rounded-xl p-6">No data available</div>;
  }
  
  return (
    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Course Popularity Ranking</h3>
      <div className="space-y-3">
        {data.courses.map((course: any, index: number) => (
          <Link
            key={course.courseId}
            href={`/courses/${course.courseId}`}
            className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:border-emerald-400/40 border border-transparent transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-emerald-400 w-8">#{index + 1}</div>
              <div>
                <h4 className="text-white font-bold">{course.courseTitle || `Course ${course.courseId}`}</h4>
                <div className="flex gap-4 text-sm text-slate-400 mt-1">
                  <span>Started: {course.starts}</span>
                  <span>Completed: {course.completes}</span>
                  <span>Node Views: {course.nodeViews}</span>
                  <span>Users: {course.uniqueUsers}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-emerald-400 font-bold">{course.completionRate.toFixed(1)}%</div>
              <div className="text-xs text-slate-400">Completion Rate</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// User Activity View
function UserActivityView({ 
  data, 
  handleSeedGroups, 
  seedingGroups, 
  seedResult 
}: { 
  data: any;
  handleSeedGroups: () => Promise<void>;
  seedingGroups: boolean;
  seedResult: string | null;
}) {
  if (!data) return <div className="text-slate-400">No data available</div>;
  
  const translateEvent = (event: string) => {
    const map: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      course_view: 'Course Viewed',
      course_start: 'Course Viewed', // 舊事件名稱，映射為 Course Viewed
      course_complete: 'Course Completed',
      course_create: 'Course Created',
      course_edit: 'Course Edited',
      node_view: 'Node Viewed',
      node_complete: 'Node Completed',
      node_create: 'Node Created',
      node_edit: 'Node Edited',
      page_view: 'Page Viewed',
      search: 'Search',
      profile_update: 'Profile Updated',
      submission_create: 'Submission Created',
      submission_review: 'Submission Reviewed',
      other: 'Other',
    };
    return map[event] || event;
  };
  
  // Build last 30 days for chart, fill missing with 0
  const rawDaily = data.dailyActiveUsers || [];
  const dailyMap = new Map<string, number>();
  rawDaily.forEach((d: any) => {
    const key = new Date(d.date).toISOString().slice(0, 10);
    dailyMap.set(key, d.activeUsers || 0);
  });
  const last30Days: Array<{ date: string; activeUsers: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last30Days.push({ date: key, activeUsers: dailyMap.get(key) || 0 });
  }
  const maxActive = last30Days.length > 0 ? Math.max(...last30Days.map((d) => d.activeUsers || 0), 1) : 1;

  const topUsers = (data.topUsers || []).slice(0, 5);
  const podium = topUsers.slice(0, 3);
  const rest = topUsers.slice(3);
  const rankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-300';
    if (rank === 2) return 'text-slate-200';
    if (rank === 3) return 'text-amber-500';
    return 'text-slate-300';
  };
  const podiumHeight = (rank: number) => {
    if (rank === 1) return 140;
    if (rank === 2) return 110;
    if (rank === 3) return 95;
    return 80;
  };
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Daily Active Users as bar chart */}
      <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 md:col-span-2">
        <h3 className="text-xl font-bold text-white mb-4">Daily Active Users (Last 30 Days)</h3>
        {last30Days.length === 0 ? (
          <div className="text-slate-400">No data available</div>
        ) : (
          <div
            className="grid items-end gap-1 w-full"
            style={{ gridTemplateColumns: 'repeat(30, minmax(0, 1fr))' }}
          >
            {last30Days.map((day, idx: number) => {
              const count = day.activeUsers || 0;
              const heightPct = (count / maxActive) * 100;
              const label = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div key={day.date || idx} className="flex flex-col items-center">
                  <div className="w-full bg-slate-800 rounded-t flex flex-col justify-end" style={{ height: '140px' }}>
                    <div
                      className="bg-emerald-500 rounded-t transition-all"
                      style={{
                        height: `${heightPct}%`,
                        minHeight: count > 0 ? '3px' : '0'
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1 text-center leading-tight">{label}</div>
                  <div className="text-[10px] text-white font-bold">{count}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Active Users (podium style, top 5) */}
      <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 md:col-span-2">
        <h3 className="text-xl font-bold text-white mb-4">Top Active Users</h3>
        {topUsers.length === 0 ? (
          <div className="text-slate-400">No data available</div>
        ) : (
          <div className="space-y-4">
            {/* Podium for top 3 */}
            <div className="flex items-end justify-center gap-4">
              {([1, 0, 2] as const).map((pos) => {
                const user = podium[pos];
                if (!user) return null;
                const rank = pos + 1;
                const height = podiumHeight(rank);
                return (
                  <div key={user.userId || rank} className="flex flex-col items-center min-w-[120px]">
                    <div className={`${rankColor(rank)} font-bold text-lg`}>#{rank}</div>
                    <div className="text-sm text-white font-bold text-center mt-1">
                      {user.username || `User ${user.userId}`}
                    </div>
                    <div className="text-[11px] text-slate-400 text-center">
                      Activities: {user.totalActivities}
                    </div>
                    <div
                      className="mt-2 w-full bg-slate-800 border border-white/10 rounded-t-md flex items-end justify-center"
                      style={{ height: `${height}px` }}
                    >
                      <div className="text-xs text-white font-bold mb-2">{user.userId}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Remaining ranks (4,5) */}
            {rest.length > 0 && (
              <div className="grid md:grid-cols-2 gap-3">
                {rest.map((user: any, idx: number) => {
                  const rank = idx + 4;
                  return (
                    <div
                      key={user.userId || idx}
                      className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`${rankColor(rank)} font-bold text-lg w-8 text-left`}>
                          #{rank}
                        </span>
                        <div>
                          <div className="text-white font-bold">{user.username || `User ${user.userId}`}</div>
                          <div className="text-xs text-slate-400">
                            Activities: {user.totalActivities} ｜ Node Views: {user.nodeViews} ｜ Courses Completed: {user.courseCompletes} ｜ Courses Viewed: {user.courseStarts}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">ID: {user.userId}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Admin Tools Section */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Admin Tools</h2>
          
          <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Study Groups Management</h3>
            <p className="text-sm text-slate-400 mb-4">
              Create public study groups for all course tags. Each tag will get its own public group that users can freely join. Random users will be automatically added to each group (5 per group by default).
            </p>
            
            <button
              onClick={handleSeedGroups}
              disabled={seedingGroups}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {seedingGroups ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Groups...</span>
                </>
              ) : (
                <span>Seed Study Groups from Tags</span>
              )}
            </button>
            
            {seedResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                seedResult.startsWith('✓') 
                  ? 'bg-emerald-900/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-900/20 border border-red-500/30 text-red-400'
              }`}>
                {seedResult}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


