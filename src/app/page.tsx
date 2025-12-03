import Link from 'next/link';
import { Sparkles, ArrowRight, GitBranch, Trophy, Users } from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-32 overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/20 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900/50 via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-sm font-medium mb-6 animate-fade-in">
            <Sparkles size={14} />
            <span>Reimagine Learning</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-tight">
            Grow Your Skills like a <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Living Tree</span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Forget linear lists. Skilvania visualizes your knowledge as an organic, evolving forest. Unlock nodes, branch out, and cultivate your expertise in a gamified RPG world.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/courses" 
              className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-emerald-900/50 flex items-center gap-2"
            >
              Start Your Journey <ArrowRight size={20} />
            </Link>
            <Link 
              href="/creator" 
              className="px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg transition-all border border-slate-700 hover:border-slate-600"
            >
              Create a Course
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-900/50 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          <FeatureCard 
            icon={GitBranch} 
            title="Non-Linear Growth" 
            desc="Choose your own path. Unlock prerequisites and branch into specialized skills that matter to you."
          />
          <FeatureCard 
            icon={Trophy} 
            title="RPG Progression" 
            desc="Earn XP, level up, and visualize your mastery. Learning feels like an adventure, not a chore."
          />
          <FeatureCard 
            icon={Users} 
            title="Community Garden" 
            desc="Share your skill trees, compare forests with friends, and contribute to a global ecosystem of knowledge."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-2xl bg-slate-900 border border-white/5 hover:border-emerald-500/30 transition-colors group">
      <div className="w-14 h-14 rounded-xl bg-emerald-950/50 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
        <Icon size={28} />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
