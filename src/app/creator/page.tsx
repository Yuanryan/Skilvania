import { Navbar } from '@/components/ui/Navbar';
import { Plus, GitBranch, Users, Edit3, MoreVertical } from 'lucide-react';
import Link from 'next/link';

const CREATED_COURSES = [
  { id: 101, title: "Full Stack Web Developer", status: "Published", students: 1234, rating: 4.8, lastEdited: "2 days ago" },
  { id: 105, title: "Advanced TypeScript Patterns", status: "Draft", students: 0, rating: 0, lastEdited: "Just now" },
];

export default function CreatorDashboardPage() {
  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 py-10">
        
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Creator Studio</h1>
                <p className="text-slate-400">Manage your skill trees and review student progress.</p>
            </div>
            <Link 
                href="/creator/new" 
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
            >
                <Plus size={20} /> Create New Course
            </Link>
        </div>

        <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-slate-950/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">Course Title</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Students</div>
                <div className="col-span-2">Last Edited</div>
                <div className="col-span-1"></div>
            </div>

            {CREATED_COURSES.map(course => (
                <div key={course.id} className="grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <div className="col-span-5">
                        <div className="font-bold text-white text-lg">{course.title}</div>
                        <div className="text-xs text-slate-500">ID: {course.id}</div>
                    </div>
                    <div className="col-span-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${
                            course.status === 'Published' 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                            {course.status}
                        </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-slate-300">
                        <Users size={16} className="text-slate-500" /> {course.students}
                    </div>
                    <div className="col-span-2 text-slate-400 text-sm">
                        {course.lastEdited}
                    </div>
                    <div className="col-span-1 flex justify-end">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link 
                                href={`/creator/${course.id}/editor`}
                                className="p-2 bg-slate-800 hover:bg-white text-slate-300 hover:text-slate-900 rounded-lg transition-colors"
                                title="Edit Tree"
                            >
                                <GitBranch size={18} />
                            </Link>
                            <button className="p-2 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors">
                                <MoreVertical size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            
            {CREATED_COURSES.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                    You haven't planted any seeds yet.
                </div>
            )}
        </div>

      </main>
    </div>
  );
}



