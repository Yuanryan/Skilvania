"use client";

import { Navbar } from '@/components/ui/Navbar';
import { Search, Database, Code, Cpu, Globe, Loader2, AlertCircle, TrendingUp, Users, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import BuddyCard from '@/components/community/BuddyCard';

// 圖標映射 - 根據課程標題或類型選擇圖標
const iconMap: Record<string, any> = {
  'web': Globe,
  'full stack': Globe,
  'machine learning': Cpu,
  'ai': Cpu,
  'devops': Database,
  'react': Code,
  'javascript': Code,
};

// 顏色映射
const colorMap: Record<string, string> = {
  'web': 'emerald',
  'full stack': 'emerald',
  'machine learning': 'purple',
  'ai': 'purple',
  'devops': 'blue',
  'react': 'cyan',
  'javascript': 'cyan',
};

// Tailwind 類名映射（因為動態類名不會被編譯）
const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  'emerald': {
    bg: 'bg-emerald-900/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  'purple': {
    bg: 'bg-purple-900/20',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  'blue': {
    bg: 'bg-blue-900/20',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  'cyan': {
    bg: 'bg-cyan-900/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/20',
  },
  'orange': {
    bg: 'bg-orange-900/20',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
  },
  'pink': {
    bg: 'bg-pink-900/20',
    text: 'text-pink-400',
    border: 'border-pink-500/20',
  },
};

// 根據節點數量推斷難度等級
const getLevel = (nodes: number): string => {
  if (nodes <= 15) return 'Beginner';
  if (nodes <= 30) return 'Intermediate';
  return 'Advanced';
};

// 根據標題選擇圖標和顏色
const getIconAndColor = (title: string) => {
  const lowerTitle = title.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerTitle.includes(key)) {
      return { icon, color: colorMap[key] || 'emerald' };
    }
  }
  return { icon: Globe, color: 'emerald' };
};

interface Course {
  id: string;
  title: string;
  description: string;
  author: string;
  nodes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

interface MatchedUser {
  userID: number;
  username: string;
  level: number;
  xp: number;
  bio: string | null;
  interests: string[];
  sharedCourses: { courseId: number; courseTitle: string }[];
  compatibilityScore: number;
}

interface CoursesByTag {
  [tag: string]: Course[];
}

export default function CoursesPage() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [trendingCourses, setTrendingCourses] = useState<Course[]>([]);
  const [coursesByTag, setCoursesByTag] = useState<CoursesByTag>({});
  const [recommendedUsers, setRecommendedUsers] = useState<MatchedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 獲取推薦用戶
  const fetchRecommendedUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch('/api/community/match');
      if (response.ok) {
        const data = await response.json();
        setRecommendedUsers(data.matches?.slice(0, 4) || []);
      }
    } catch (err) {
      console.error('Failed to fetch recommended users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // 獲取所有課程數據
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/courses?status=published');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch courses');
        }

        const data = await response.json();
        const courses = data.courses || [];
        setAllCourses(courses);

        // 設置趨勢課程（最近更新的前5個）
        const trending = [...courses]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 3);
        setTrendingCourses(trending);

        // 按標籤分組課程
        const grouped: CoursesByTag = {};
        for (const course of courses) {
          if (course.tags && course.tags.length > 0) {
            for (const tag of course.tags) {
              if (!grouped[tag]) {
                grouped[tag] = [];
              }
              if (grouped[tag].length < 6) {
                grouped[tag].push(course);
              }
            }
          }
        }
        setCoursesByTag(grouped);

      } catch (err) {
        console.error('Error fetching courses:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
    fetchRecommendedUsers();
  }, []);

  // 搜索過濾
  const filteredCourses = searchQuery.trim() 
    ? allCourses.filter(course => 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // 處理搜索輸入
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSearching(query.trim().length > 0);
  };

  const CourseCard = ({ course }: { course: Course }) => {
    const { icon: CourseIcon, color } = getIconAndColor(course.title);
    const level = getLevel(course.nodes);
    const colorClass = colorClasses[color] || colorClasses['emerald'];
    
    return (
      <Link 
        href={`/courses/${course.id}`} 
        className="group bg-slate-900/50 backdrop-blur border border-white/5 hover:border-emerald-500/30 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl h-full flex flex-col"
      >

        
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-1">
          {course.title}
        </h3>
        <p className="text-slate-400 text-sm mb-3 line-clamp-2">{course.description}</p>
        <p className="text-xs text-slate-500 mb-4">by {course.author}</p>
        
        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {course.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-slate-500 font-medium uppercase tracking-wider mt-auto">
          <span>{course.nodes} Nodes</span>
          <span className={colorClass.text}>{level}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 py-10">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Explore <span className="text-emerald-400">Learning Paths</span>
          </h1>

        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4 text-white">
              <Loader2 size={48} className="animate-spin text-emerald-500" />
              <p className="text-lg">Loading explore page...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4 text-white bg-slate-900/50 p-8 rounded-2xl border border-red-500/20">
              <AlertCircle size={48} className="text-red-500" />
              <p className="text-lg font-bold">Failed to load</p>
              <p className="text-slate-400">{error}</p>
            </div>
          </div>
) : (
          <div className="flex gap-8">
            {/* Main Content - Left Column */}
            <div className="flex-1 min-w-0 space-y-16">
              {/* Trending Courses Section */}
              {!isSearching && trendingCourses.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-900/20 rounded-lg border border-orange-500/20">
                        <TrendingUp className="text-orange-400" size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Trending Now</h2>
                        <p className="text-slate-400 text-sm">Popular courses updated recently</p>
                      </div>
                    </div>
                    <Link 
                      href="/courses"
                      className="text-emerald-400 hover:text-emerald-300 text-sm font-medium flex items-center gap-1"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trendingCourses.map(course => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </section>
              )}

              {/* Search Bar Section */}
              <section>
                <div className="relative">
                  <Search className="absolute left-4 top-4 text-slate-500" size={24} />
                  <input 
                    type="text" 
                    placeholder="Search for courses, skills, or topics..." 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-14 pr-6 text-white text-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </section>

              {/* Search Results */}
              {isSearching && (
                <section>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Search Results
                    </h2>
                    <p className="text-slate-400">
                      {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found for "{searchQuery}"
                    </p>
                  </div>
                  {filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredCourses.map(course => (
                        <CourseCard key={course.id} course={course} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-700">
                      <p className="text-slate-400 text-lg">No courses found matching your search.</p>
                    </div>
                  )}
                </section>
              )}

              {/* Courses by Tags */}
              {!isSearching && Object.keys(coursesByTag).length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-purple-900/20 rounded-lg border border-purple-500/20">
                      <Sparkles className="text-purple-400" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Browse by Category</h2>
                      <p className="text-slate-400 text-sm">Explore courses organized by topic</p>
                    </div>
                  </div>
                  
                  <div className="space-y-12">
                    {Object.entries(coursesByTag)
                      .sort(([, coursesA], [, coursesB]) => coursesB.length - coursesA.length)
                      .slice(0, 5)
                      .map(([tag, courses]) => (
                        <div key={tag}>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white capitalize">
                              {tag}
                              <span className="ml-2 text-sm font-normal text-slate-400">
                                ({courses.length} {courses.length === 1 ? 'course' : 'courses'})
                              </span>
                            </h3>
                            <button
                              onClick={() => setSearchQuery(tag)}
                              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                            >
                              View All
                            </button>
                          </div>
                          <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            <div className="flex gap-6 min-w-max">
                              {courses.map(course => (
                                <div key={course.id} className="flex-shrink-0 w-80">
                                  <CourseCard course={course} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* Empty State */}
              {!isSearching && trendingCourses.length === 0 && Object.keys(coursesByTag).length === 0 && (
                <div className="text-center py-20">
                  <div className="text-white">
                    <p className="text-xl font-bold mb-2">No courses available yet</p>
                    <p className="text-slate-400">Check back later for new learning paths!</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - Connect with Learners */}
            {!isSearching && recommendedUsers.length > 0 && (
              <aside className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
                <div className="sticky top-6">
                  <div className="bg-slate-900/50 backdrop-blur border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-900/20 rounded-lg border border-blue-500/20">
                          <Users className="text-blue-400" size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white">Connect</h2>
                          <p className="text-slate-400 text-xs">Study buddies</p>
                        </div>
                      </div>
                      <button
                        onClick={fetchRecommendedUsers}
                        disabled={usersLoading}
                        className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                      >
                        <RefreshCw size={16} className={usersLoading ? 'animate-spin' : ''} />
                      </button>
                    </div>
                    
                    <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                      {recommendedUsers.map(user => (
                        <BuddyCard
                          key={user.userID}
                          userID={user.userID}
                          username={user.username}
                          level={user.level}
                          xp={user.xp}
                          bio={user.bio}
                          interests={user.interests}
                          sharedCourses={user.sharedCourses}
                          compatibilityScore={user.compatibilityScore}
                          onConnectionChange={fetchRecommendedUsers}
                        />
                      ))}
                    </div>

                    <Link
                      href="/community"
                      className="mt-4 block text-center text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                    >
                      View All Recommendations →
                    </Link>
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  );
}



