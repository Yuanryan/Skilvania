import { Navbar } from '@/components/ui/Navbar';
import { Sparkles, Heart, Code } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 py-20 text-center">
        
        <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-900/30 text-emerald-400 mb-8">
                <Sparkles size={32} />
            </div>
            
            <h1 className="text-5xl font-bold text-white mb-8 leading-tight">The Story of <br/><span className="text-emerald-500">Skilvania</span></h1>
            
            <div className="prose prose-invert prose-lg mx-auto text-slate-300 leading-relaxed space-y-6">
                <p>
                    Learning shouldn't feel like a spreadsheet. It should feel like an adventure.
                </p>
                <p>
                    We built Skilvania because we were tired of linear course lists and boring checkboxes. We believe knowledge is organic—it branches, it connects, and it grows over time.
                </p>
                <p>
                    In Skilvania, every skill you master is a seed planted. Every project you complete is a fruit harvested. Your profile isn't just a resume; it's a thriving garden of your capabilities.
                </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                    <div className="text-emerald-500 mb-4 flex justify-center"><Heart size={24} /></div>
                    <h3 className="text-white font-bold mb-2">Built with Love</h3>
                    <p className="text-sm text-slate-400">Crafted for learners, by learners.</p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                    <div className="text-amber-500 mb-4 flex justify-center"><Sparkles size={24} /></div>
                    <h3 className="text-white font-bold mb-2">Gamified Growth</h3>
                    <p className="text-sm text-slate-400">RPG mechanics that actually motivate.</p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5">
                    <div className="text-blue-500 mb-4 flex justify-center"><Code size={24} /></div>
                    <h3 className="text-white font-bold mb-2">Open Source</h3>
                    <p className="text-sm text-slate-400">Community driven development.</p>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}

