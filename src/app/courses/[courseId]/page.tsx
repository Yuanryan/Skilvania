import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { Play, Share2, GitBranch, Star, ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { CourseReviews } from '@/components/course/CourseReviews';

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
    const supabase = createAdminClient();
    const courseIdInt = parseInt(courseId);

    if (isNaN(courseIdInt)) {
      return null;
    }

    // 獲取課程資訊
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('*')
      .eq('CourseID', courseIdInt)
      .single();

    if (courseError || !course) {
      return null;
    }

    // 獲取創建者資訊
    let author = 'Unknown';
    try {
      const { data: creator } = await supabase
        .from('USER')
        .select('Username')
        .eq('UserID', course.CreatorID)
        .single();
      
      if (creator) {
        author = creator.Username;
      }
    } catch (err) {
      console.error('Error fetching creator:', err);
    }

    // 獲取標籤
    const { data: courseTags } = await supabase
      .from('course_tag')
      .select('TagID')
      .eq('CourseID', courseIdInt);

    let tags: string[] = [];
    if (courseTags && courseTags.length > 0) {
      const tagIds = courseTags.map(ct => ct.TagID);
      const { data: tagData } = await supabase
        .from('tag')
        .select('Name')
        .in('TagID', tagIds);
      
      if (tagData) {
        tags = tagData.map(t => t.Name);
      }
    }

    // 計算學生數量
    let studentsCount = 0;
    try {
      const { data: nodes } = await supabase
        .from('node')
        .select('NodeID')
        .eq('CourseID', courseIdInt);

      if (nodes && nodes.length > 0) {
        const nodeIds = nodes.map(n => n.NodeID);
        const { data: progressData } = await supabase
          .from('userprogress')
          .select('UserID')
          .in('NodeID', nodeIds);
        
        if (progressData && progressData.length > 0) {
          studentsCount = new Set(progressData.map(p => p.UserID)).size;
        }
      }
    } catch (err) {
      console.error('Error counting students:', err);
    }

    return {
      id: course.CourseID.toString(),
      title: course.Title,
      description: course.Description,
      author: author,
      status: course.Status,
      totalNodes: course.TotalNodes || 0,
      tags: tags,
      students: studentsCount,
      updatedAt: course.UpdatedAt
    };
  } catch (error) {
    console.error('Error fetching course:', error);
    return null;
  }
}

async function fetchAverageRating(courseId: string): Promise<number> {
  try {
    const supabase = createAdminClient();
    const courseIdInt = parseInt(courseId);

    if (isNaN(courseIdInt)) {
      return 0;
    }

    // 獲取所有評分
    const { data: ratings, error } = await supabase
      .from('courserating')
      .select('RatingScore')
      .eq('CourseID', courseIdInt);

    if (error || !ratings || ratings.length === 0) {
      return 0;
    }

    const validRatings = ratings.filter(r => r.RatingScore !== null);
    if (validRatings.length === 0) {
      return 0;
    }

    const sum = validRatings.reduce((acc, r) => acc + (r.RatingScore || 0), 0);
    const average = sum / validRatings.length;
    
    return Math.round(average * 10) / 10; // 保留一位小數
  } catch (error) {
    console.error('Error fetching average rating:', error);
    return 0;
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
  const averageRating = await fetchAverageRating(courseId);

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
                        {averageRating > 0 ? (
                            <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                                <Star size={14} fill="currentColor" /> {averageRating.toFixed(1)}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                                <Star size={14} /> 尚無評分
                            </div>
                        )}
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

            {/* 評論區塊 */}
            <CourseReviews courseId={courseId} />

        </div>
      </main>
    </div>
  );
}



