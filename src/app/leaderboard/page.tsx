import { Navbar } from '@/components/ui/Navbar';
import { Trophy, Medal, User, ArrowUp, Minus } from 'lucide-react';
import Link from 'next/link';

const LEADERBOARD_DATA = [
  { rank: 1, username: "CodeWizard", xp: 25000, level: 15, change: "up", avatarColor: "purple" },
  { rank: 2, username: "ForestWalker", xp: 14500, level: 12, change: "same", avatarColor: "emerald" }, // Current User
  { rank: 3, username: "PixelArtist", xp: 12000, level: 10, change: "down", avatarColor: "blue" },
  { rank: 4, username: "DataMiner", xp: 11500, level: 10, change: "up", avatarColor: "amber" },
  { rank: 5, username: "NetRunner", xp: 9000, level: 8, change: "same", avatarColor: "red" },
];

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 py-10">
        
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">Guild Hall of Fame</h1>
            <p className="text-slate-400">Top cultivators in Skilvania this week.</p>
        </div>

        {/* Top 3 Podium (Visual) */}
        <div className="flex justify-center items-end gap-4 mb-16 px-4">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-900 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 font-bold mb-3 relative">
                    FW
                    <div className="absolute -bottom-3 bg-slate-800 text-white text-xs px-2 py-0.5 rounded-full border border-slate-600">2</div>
                </div>
                <div className="h-24 w-24 bg-slate-800/50 rounded-t-lg border-t border-x border-white/5 flex items-end justify-center pb-4">
                    <span className="text-2xl font-bold text-slate-500">#2</span>
                </div>
            </div>
            
            {/* 1st Place */}
            <div className="flex flex-col items-center relative z-10">
                <Trophy className="text-amber-400 mb-2 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" size={32} />
                <div className="w-20 h-20 rounded-full bg-purple-900 border-2 border-amber-400 flex items-center justify-center text-purple-200 font-bold mb-3 relative shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                    CW
                    <div className="absolute -bottom-3 bg-amber-500 text-black font-bold text-xs px-2 py-0.5 rounded-full">1</div>
                </div>
                <div className="h-32 w-28 bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-lg border-t border-x border-amber-500/30 flex items-end justify-center pb-4">
                    <span className="text-4xl font-bold text-amber-500">#1</span>
                </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-blue-900 border-2 border-blue-500 flex items-center justify-center text-blue-200 font-bold mb-3 relative">
                    PA
                    <div className="absolute -bottom-3 bg-slate-800 text-white text-xs px-2 py-0.5 rounded-full border border-slate-600">3</div>
                </div>
                <div className="h-20 w-24 bg-slate-800/50 rounded-t-lg border-t border-x border-white/5 flex items-end justify-center pb-4">
                    <span className="text-2xl font-bold text-slate-500">#3</span>
                </div>
            </div>
        </div>

        {/* List */}
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
            {LEADERBOARD_DATA.map((user) => (
                <div 
                    key={user.rank} 
                    className={`flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${user.username === "ForestWalker" ? "bg-emerald-900/10 border-emerald-500/20" : ""}`}
                >
                    <div className="w-8 font-bold text-slate-500 text-center">{user.rank}</div>
                    
                    <div className="flex-1 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full bg-${user.avatarColor}-900/20 border border-${user.avatarColor}-500/20 flex items-center justify-center text-${user.avatarColor}-500 font-bold`}>
                            {user.username[0]}
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

      </main>
    </div>
  );
}

