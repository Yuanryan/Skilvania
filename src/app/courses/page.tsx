import { Navbar } from '@/components/ui/Navbar';
import { Search, Filter, Database, Code, Cpu, Globe } from 'lucide-react';
import Link from 'next/link';

const ALL_COURSES = [
  { id: 101, title: "Full Stack Web Developer", description: "From HTML roots to Database fruits. Complete path.", author: "Skilvania Team", nodes: 24, level: "Beginner", icon: Globe, color: "emerald" },
  { id: 103, title: "Machine Learning Forest", description: "Understand AI, Python, and Neural Networks.", author: "Dr. AI", nodes: 45, level: "Advanced", icon: Cpu, color: "purple" },
  { id: 104, title: "DevOps Pipeline", description: "CI/CD, Docker, and Cloud infrastructure.", author: "OpsMaster", nodes: 18, level: "Intermediate", icon: Database, color: "blue" },
  { id: 105, title: "React Ecosystem", description: "Redux, Next.js, and performance optimization.", author: "Facebook Open Source", nodes: 32, level: "Intermediate", icon: Code, color: "cyan" },
];

export default function CoursesPage() {
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
                        placeholder="Search for skills..." 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500"
                    />
                </div>
                <button className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl border border-slate-700 transition-colors">
                    <Filter size={20} />
                </button>
            </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ALL_COURSES.map(course => (
                <Link href={`/courses/${course.id}`} key={course.id} className="group bg-slate-900/50 backdrop-blur border border-white/5 hover:border-emerald-500/30 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-${course.color}-900/20 text-${course.color}-400 border border-${course.color}-500/20`}>
                        <course.icon size={24} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{course.title}</h3>
                    <p className="text-slate-400 text-sm mb-6 line-clamp-2">{course.description}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-slate-500 font-medium uppercase tracking-wider">
                        <span>{course.nodes} Nodes</span>
                        <span className={`text-${course.color}-400`}>{course.level}</span>
                    </div>
                </Link>
            ))}
        </div>
      </main>
    </div>
  );
}


