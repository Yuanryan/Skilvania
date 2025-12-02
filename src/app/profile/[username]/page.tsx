import { Navbar } from '@/components/ui/Navbar';
import { User, MapPin, Calendar, Trophy, Flame, GitBranch, Share2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('USER')
    .select(`
      *,
      USERROLE (
        ROLES (
          RoleName
        )
      )
    `)
    .eq('Username', username)
    .single();

  if (!user) {
    notFound();
  }

  // Fallback data for fields not yet in DB schema or logic not implemented
  const joinedDate = user.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';
  const stats = {
    coursesCompleted: 0,
    nodesUnlocked: 0,
    streak: 0
  };
  const activeTrees = [
     // Placeholder for now as we don't have user_courses table yet
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 py-10">
        
        {/* Profile Header */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-900/40 to-transparent pointer-events-none"></div>
            
            <div className="relative flex flex-col md:flex-row items-start md:items-end gap-6">
                <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-900 flex items-center justify-center shadow-2xl overflow-hidden">
                    <User size={64} className="text-emerald-500" />
                </div>
                
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white mb-2">{user.Username}</h1>
                    <div className="flex flex-wrap gap-4 text-slate-400 text-sm mb-4">
                        <span className="flex items-center gap-1"><MapPin size={14} /> Skilvania</span>
                        <span className="flex items-center gap-1"><Calendar size={14} /> Joined {joinedDate}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {user.USERROLE?.map((ur: any) => (
                            <span key={ur.ROLES.RoleID} className="px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-xs font-medium">
                                {ur.ROLES.RoleName}
                            </span>
                        )) || <span className="text-slate-500 text-sm">No roles assigned</span>}
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
                            <span className="font-bold text-white text-lg">{user.Level}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Trophy size={18} className="text-purple-500" /> XP
                            </div>
                            <span className="font-bold text-white text-lg">{user.XP}</span>
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
                        {activeTrees.map((tree: any) => (
                            <div key={tree.id} className="bg-slate-900 border border-white/5 p-6 rounded-2xl flex items-center gap-6 hover:border-white/10 transition-colors">
                                <div className={`w-16 h-16 rounded-xl bg-${tree.color}-900/20 border border-${tree.color}-500/20 flex items-center justify-center`}>
                                    <GitBranch className={`text-${tree.color}-500`} size={32} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-lg font-bold text-white mb-2">{tree.title}</h4>
                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div className={`bg-${tree.color}-500 h-full`} style={{ width: `${tree.progress}%` }}></div>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-400 text-right font-bold">{tree.progress}% Grown</div>
                                </div>
                            </div>
                        ))}
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
