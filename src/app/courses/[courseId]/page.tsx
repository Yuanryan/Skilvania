import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { Play, Share2, GitBranch, Star, ArrowLeft } from 'lucide-react';

// Mock data (simulating a fetch)
const COURSE_DATA = {
  id: 101,
  title: "Full Stack Web Developer",
  description: "Embark on a journey from the roots of HTML through the trunk of JavaScript, branching out into React and Node.js, finally bearing the fruit of full-stack applications.",
  author: "Skilvania Team",
  students: 1234,
  rating: 4.8,
  updatedAt: "Nov 2023",
  totalNodes: 24,
  estimatedTime: "40 Hours",
  tags: ["Web Development", "JavaScript", "React", "Node.js"]
};

export default async function CourseOverviewPage({ params }: { params: Promise<{ courseId: string }> }) {
  // In a real app, we would await params then fetch data
  const { courseId } = await params;

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
            
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

            <Link href="/courses" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
                <ArrowLeft size={16} /> Back to Catalog
            </Link>

            <div className="flex flex-col md:flex-row gap-10">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-400 text-xs font-bold uppercase border border-emerald-800/30">
                            Official Course
                        </span>
                        <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                            <Star size={14} fill="currentColor" /> {COURSE_DATA.rating}
                        </div>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        {COURSE_DATA.title}
                    </h1>
                    
                    <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                        {COURSE_DATA.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 mb-10">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <GitBranch size={16} /> {COURSE_DATA.totalNodes} Nodes
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <Share2 size={16} /> {COURSE_DATA.students} Students
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link 
                            href={`/courses/${courseId}/tree`} 
                            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-900/50 transition-all hover:scale-105 flex items-center gap-2"
                        >
                            <Play size={20} fill="currentColor" /> Start Learning
                        </Link>
                        <button className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700">
                            Preview Tree
                        </button>
                    </div>
                </div>

                {/* Right Column / Stats */}
                <div className="hidden md:block w-72 space-y-4">
                    <div className="bg-slate-950/50 rounded-xl p-6 border border-white/5">
                        <h3 className="text-slate-400 text-xs font-bold uppercase mb-4">Skills You'll Grow</h3>
                        <div className="flex flex-wrap gap-2">
                            {COURSE_DATA.tags.map(tag => (
                                <span key={tag} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}



