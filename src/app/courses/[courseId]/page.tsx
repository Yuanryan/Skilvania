import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { Play, Share2, GitBranch, Star, ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  author: string;
  students: number;
  totalNodes: number;
  updatedAt: string;
  status: string;
  tags?: string[];
}

async function fetchCourseData(courseId: string): Promise<CourseData | null> {
  try {
    const headersList = await headers();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/courses/${courseId}`, {
      headers: {
        cookie: headersList.get('cookie') || '',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch course: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.course) {
      return null;
    }

    return {
      id: data.course.id,
      title: data.course.title,
      description: data.course.description,
      author: data.course.author || 'Unknown',
      status: data.course.status,
      totalNodes: data.course.totalNodes || 0,
      tags: data.course.tags || [],
      students: data.course.students || 0,
      updatedAt: data.course.updatedAt
    };
  } catch (error) {
    console.error('Error fetching course:', error);
    return null;
  }
}

// 格式化日期
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'short' });
  } catch {
    return 'Unknown';
  }
}

export default async function CourseOverviewPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  
  const courseData = await fetchCourseData(courseId);
  
  if (!courseData) {
    notFound();
  }

  const tags = courseData.tags || [];

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
                            {courseData.status === 'published' ? 'Published Course' : courseData.status === 'draft' ? 'Draft Course' : 'Archived Course'}
                        </span>
                        <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                            <Star size={14} fill="currentColor" /> 4.8
                        </div>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        {courseData.title}
                    </h1>
                    
                    <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                        {courseData.description || 'No description available.'}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 mb-10">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <GitBranch size={16} /> {courseData.totalNodes || 0} Nodes
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <Share2 size={16} /> {courseData.students || 0} Students
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            Updated {formatDate(courseData.updatedAt)}
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
                        {tags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                    <span key={tag} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No tags available</p>
                        )}
                    </div>
                    <div className="bg-slate-950/50 rounded-xl p-6 border border-white/5">
                        <h3 className="text-slate-400 text-xs font-bold uppercase mb-4">Course Info</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-slate-500 text-xs mb-1">Author</p>
                                <p className="text-white text-sm font-medium">{courseData.author}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-xs mb-1">Status</p>
                                <p className="text-emerald-400 text-sm font-medium capitalize">{courseData.status}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}



