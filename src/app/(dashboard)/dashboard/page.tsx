"use client";

import { Navbar } from '@/components/ui/Navbar';
import { Flame, TrendingUp, Trophy, Clock, PlayCircle, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface UserData {
  name: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  streak: number;
}

interface ActiveCourse {
  id: number;
  title: string;
  progress: number;
  totalNodes: number;
  completedNodes: number;
  lastPlayed: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [activeCourses, setActiveCourses] = useState<ActiveCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/dashboard');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch dashboard data (${response.status})`);
        }

        const data = await response.json();
        
        // 檢查是否有錯誤訊息
        if (data.error) {
          setError(data.error);
          // 即使有錯誤，也嘗試顯示用戶基本資訊
          if (data.user) {
            setUser(data.user);
          }
          setActiveCourses(data.activeCourses || []);
        } else {
          setUser(data.user);
          setActiveCourses(data.activeCourses || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-forest flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-white">
            <Loader2 size={48} className="animate-spin text-emerald-500" />
            <p className="text-lg">載入儀表板中...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-deep-forest flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-white bg-slate-900/50 p-8 rounded-2xl border border-red-500/20">
            <AlertCircle size={48} className="text-red-500" />
            <p className="text-lg font-bold">載入失敗</p>
            <p className="text-slate-400">{error || '無法載入儀表板數據'}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 py-10">
        
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user.name}</h1>
            <p className="text-slate-400">Ready to tend to your garden of knowledge?</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex items-center gap-3 min-w-[140px]">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                <Flame size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{user.streak}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Day Streak</div>
              </div>
            </div>
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex items-center gap-3 min-w-[140px]">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Trophy size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">Lvl {user.level}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">{user.xp} XP</div>
              </div>
            </div>
          </div>
        </div>

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

        {/* Active Courses Grid */}
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="text-emerald-500" size={20} /> Continue Growing
        </h2>
        
        {activeCourses.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {activeCourses.map(course => (
              <Link href={`/courses/${course.id}/tree`} key={course.id} className="group relative bg-slate-900 border border-white/5 rounded-2xl p-6 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-900/20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{course.title}</h3>
                    <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                      <Clock size={14} /> Played {course.lastPlayed}
                    </p>
                  </div>
                  <div className="bg-emerald-900/30 text-emerald-400 p-2 rounded-full group-hover:scale-110 transition-transform">
                    <PlayCircle size={24} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-slate-600 text-right pt-1">
                    {course.completedNodes} / {course.totalNodes} Nodes Unlocked
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-12 text-center mb-12">
            <p className="text-slate-400 mb-4">還沒有開始任何課程</p>
            <Link href="/courses" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors">
              瀏覽課程目錄
            </Link>
          </div>
        )}

        {/* Empty State / Call to Action */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 border border-white/5 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Explore New Seeds</h3>
            <p className="text-slate-400 mb-6">Discover new skill trees planted by the community.</p>
            <Link href="/courses" className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-colors border border-white/10">
                Browse Catalog
            </Link>
        </div>

      </main>
    </div>
  );
}

