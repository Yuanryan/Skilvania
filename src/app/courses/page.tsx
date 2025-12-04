"use client";

import { Navbar } from '@/components/ui/Navbar';
import { Search, Filter, Database, Code, Cpu, Globe, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 獲取課程數據
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        params.append('status', 'published');

        const response = await fetch(`/api/courses?${params.toString()}`);
        
        // 檢查響應內容類型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('非 JSON 響應:', text.substring(0, 200));
          throw new Error('伺服器返回了非 JSON 格式的響應。請檢查伺服器日誌。');
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: '獲取課程失敗' }));
          throw new Error(errorData.error || '獲取課程失敗');
        }

        const data = await response.json();
        setCourses(data.courses || []);
      } catch (err) {
        console.error('獲取課程錯誤:', err);
        setError(err instanceof Error ? err.message : '未知錯誤');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [searchQuery]);

  // 處理搜索輸入（防抖）
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 py-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
            <div>
                <h1 className="text-4xl font-bold text-white mb-4">Course Catalog</h1>
                <p className="text-slate-400 max-w-xl">Discover skill trees planted by experts. Fork them, customize them, or grow them from scratch.</p>
            </div>
            
            {/* Search Bar */}
            <div className="w-full md:w-auto flex gap-2">
                <div className="relative flex-1 md:w-80">
                    <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="搜尋技能..." 
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500"
                    />
                </div>
                <button className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl border border-slate-700 transition-colors">
                    <Filter size={20} />
                </button>
            </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4 text-white">
              <Loader2 size={48} className="animate-spin text-emerald-500" />
              <p className="text-lg">載入課程中...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4 text-white bg-slate-900/50 p-8 rounded-2xl border border-red-500/20">
              <AlertCircle size={48} className="text-red-500" />
              <p className="text-lg font-bold">載入失敗</p>
              <p className="text-slate-400">{error}</p>
            </div>
          </div>
        )}

        {/* Courses Grid */}
        {!loading && !error && (
          <>
            {courses.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center text-white">
                  <p className="text-xl font-bold mb-2">找不到課程</p>
                  <p className="text-slate-400">嘗試調整搜尋條件</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => {
                  const { icon: CourseIcon, color } = getIconAndColor(course.title);
                  const level = getLevel(course.nodes);
                  const colorClass = colorClasses[color] || colorClasses['emerald'];
                  
                  return (
                    <Link 
                      href={`/courses/${course.id}`} 
                      key={course.id} 
                      className="group bg-slate-900/50 backdrop-blur border border-white/5 hover:border-emerald-500/30 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${colorClass.bg} ${colorClass.text} border ${colorClass.border}`}>
                        <CourseIcon size={24} />
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{course.title}</h3>
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                      <p className="text-xs text-slate-500 mb-6">by {course.author}</p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-slate-500 font-medium uppercase tracking-wider">
                        <span>{course.nodes} Nodes</span>
                        <span className={colorClass.text}>{level}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}



