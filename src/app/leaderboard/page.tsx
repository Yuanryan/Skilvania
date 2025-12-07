import { Navbar } from '@/components/ui/Navbar';
import { Trophy, Medal, User, ArrowUp, Minus, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardUser {
  rank: number;
  username: string;
  xp: number;
  level: number;
  change: 'up' | 'down' | 'same';
  avatarColor: string;
  isCurrentUser?: boolean;
}

// 公開排行榜，無需 headers，避免觸發動態渲染限制
async function fetchLeaderboard(): Promise<LeaderboardUser[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/leaderboard`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`);
    }

    const data = await response.json();
    return data.leaderboard || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const leaderboard = await fetchLeaderboard();
  
  // 獲取前三名用於顯示頒獎台
  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // 獲取頭像顏色類名映射
  const getAvatarColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      purple: 'bg-purple-900 border-purple-500 text-purple-200',
      emerald: 'bg-emerald-900 border-emerald-500 text-emerald-500',
      blue: 'bg-blue-900 border-blue-500 text-blue-200',
      amber: 'bg-amber-900 border-amber-500 text-amber-200',
      red: 'bg-red-900 border-red-500 text-red-200',
      pink: 'bg-pink-900 border-pink-500 text-pink-200',
      indigo: 'bg-indigo-900 border-indigo-500 text-indigo-200',
      cyan: 'bg-cyan-900 border-cyan-500 text-cyan-200',
    };
    return colorMap[color] || 'bg-slate-900 border-slate-500 text-slate-200';
  };

  const getAvatarColorClassSmall = (color: string) => {
    const colorMap: Record<string, string> = {
      purple: 'bg-purple-900/20 border-purple-500/20 text-purple-500',
      emerald: 'bg-emerald-900/20 border-emerald-500/20 text-emerald-500',
      blue: 'bg-blue-900/20 border-blue-500/20 text-blue-500',
      amber: 'bg-amber-900/20 border-amber-500/20 text-amber-500',
      red: 'bg-red-900/20 border-red-500/20 text-red-500',
      pink: 'bg-pink-900/20 border-pink-500/20 text-pink-500',
      indigo: 'bg-indigo-900/20 border-indigo-500/20 text-indigo-500',
      cyan: 'bg-cyan-900/20 border-cyan-500/20 text-cyan-500',
    };
    return colorMap[color] || 'bg-slate-900/20 border-slate-500/20 text-slate-500';
  };

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 py-10">
        
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">Guild Hall of Fame</h1>
            <p className="text-slate-400">Top cultivators in Skilvania this week.</p>
        </div>

        {/* Top 3 Podium (Visual) */}
        {topThree.length >= 3 && (
          <div className="flex justify-center items-end gap-4 mb-16 px-4">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-bold mb-3 relative ${getAvatarColorClass(topThree[1].avatarColor)}`}>
                {topThree[1].username.substring(0, 2).toUpperCase()}
                <div className="absolute -bottom-3 bg-slate-800 text-white text-xs px-2 py-0.5 rounded-full border border-slate-600">2</div>
              </div>
              <div className="h-24 w-24 bg-slate-800/50 rounded-t-lg border-t border-x border-white/5 flex items-end justify-center pb-4">
                <span className="text-2xl font-bold text-slate-500">#2</span>
              </div>
            </div>
            
            {/* 1st Place */}
            <div className="flex flex-col items-center relative z-10">
              <Trophy className="text-amber-400 mb-2 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" size={32} />
              <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center font-bold mb-3 relative shadow-[0_0_20px_rgba(168,85,247,0.4)] ${getAvatarColorClass(topThree[0].avatarColor)}`}>
                {topThree[0].username.substring(0, 2).toUpperCase()}
                <div className="absolute -bottom-3 bg-amber-500 text-black font-bold text-xs px-2 py-0.5 rounded-full">1</div>
              </div>
              <div className="h-32 w-28 bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-lg border-t border-x border-amber-500/30 flex items-end justify-center pb-4">
                <span className="text-4xl font-bold text-amber-500">#1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-bold mb-3 relative ${getAvatarColorClass(topThree[2].avatarColor)}`}>
                {topThree[2].username.substring(0, 2).toUpperCase()}
                <div className="absolute -bottom-3 bg-slate-800 text-white text-xs px-2 py-0.5 rounded-full border border-slate-600">3</div>
              </div>
              <div className="h-20 w-24 bg-slate-800/50 rounded-t-lg border-t border-x border-white/5 flex items-end justify-center pb-4">
                <span className="text-2xl font-bold text-slate-500">#3</span>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {leaderboard.length > 0 ? (
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
            {leaderboard.map((user) => (
              <div 
                key={user.rank} 
                className={`flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${user.isCurrentUser ? "bg-emerald-900/10 border-emerald-500/20" : ""}`}
              >
                <div className="w-8 font-bold text-slate-500 text-center">{user.rank}</div>
                
                <div className="flex-1 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold ${getAvatarColorClassSmall(user.avatarColor)}`}>
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/profile/${user.username}`} className="font-bold text-white hover:text-emerald-400 transition-colors">
                      {user.username}
                    </Link>
                    <div className="text-xs text-slate-500">Lvl {user.level}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-white">{user.xp.toLocaleString()} XP</div>
                  <div className="text-xs flex items-center justify-end gap-1">
                    {user.change === "up" && <span className="text-emerald-500 flex items-center"><ArrowUp size={10} /> Rising</span>}
                    {user.change === "down" && <span className="text-red-500 flex items-center rotate-180"><ArrowUp size={10} /> Falling</span>}
                    {user.change === "same" && <span className="text-slate-600 flex items-center"><Minus size={10} /> Stable</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-12 text-center">
            <p className="text-slate-400">目前沒有排行榜數據</p>
          </div>
        )}

      </main>
    </div>
  );
}
