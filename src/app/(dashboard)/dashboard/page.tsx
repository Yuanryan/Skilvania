import { Navbar } from '@/components/ui/Navbar';
import { Flame, TrendingUp, Trophy, Clock, PlayCircle } from 'lucide-react';
import Link from 'next/link';

// Mock Data
const MOCK_USER = {
  name: "ForestWalker",
  level: 4,
  xp: 1250,
  nextLevelXp: 2000,
  streak: 12
};

const ACTIVE_COURSES = [
  { id: 101, title: "Full Stack Web Developer", progress: 35, totalNodes: 20, completedNodes: 7, lastPlayed: "2 hours ago" },
  { id: 102, title: "React Native Mastery", progress: 10, totalNodes: 15, completedNodes: 1, lastPlayed: "1 day ago" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 py-10">
        
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {MOCK_USER.name}</h1>
            <p className="text-slate-400">Ready to tend to your garden of knowledge?</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex items-center gap-3 min-w-[140px]">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                <Flame size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{MOCK_USER.streak}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Day Streak</div>
              </div>
            </div>
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex items-center gap-3 min-w-[140px]">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Trophy size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">Lvl {MOCK_USER.level}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">{MOCK_USER.xp} XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Courses Grid */}
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="text-emerald-500" size={20} /> Continue Growing
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {ACTIVE_COURSES.map(course => (
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

