"use client";

import { Navbar } from '@/components/ui/Navbar';
import { Plus, GitBranch, Users, Edit3, MoreVertical, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Course {
  id: string;
  title: string;
  description: string | null;
  creatorId: string;
  status: 'draft' | 'published' | 'archived';
  totalNodes: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function CreatorDashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    const title = prompt('Enter course title:');
    if (!title || title.trim().length === 0) return;

    setCreating(true);
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create course`);
      }

      const data = await response.json();
      router.push(`/creator/${data.courseId}/editor`);
    } catch (error: any) {
      console.error('Error creating course:', error);
      alert(`Failed to create course: ${error.message || 'Please try again.'}`);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };
  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 py-10">
        
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Creator Studio</h1>
                <p className="text-slate-400">Manage your skill trees and review student progress.</p>
            </div>
            <button
                onClick={handleCreateCourse}
                disabled={creating}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
            >
                {creating ? (
                    <>
                        <Loader2 size={20} className="animate-spin" /> Creating...
                    </>
                ) : (
                    <>
                        <Plus size={20} /> Create New Course
                    </>
                )}
            </button>
        </div>

        <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-slate-950/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">Course Title</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Students</div>
                <div className="col-span-2">Last Edited</div>
                <div className="col-span-1"></div>
            </div>

            {loading ? (
                <div className="p-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-slate-400 mb-4" size={32} />
                    <p className="text-slate-500">Loading courses...</p>
                </div>
            ) : courses.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                    You haven't planted any seeds yet. Create your first course to get started!
                </div>
            ) : (
                courses.map(course => (
                    <div key={course.id} className="grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <div className="col-span-5">
                            <div className="font-bold text-white text-lg">{course.title}</div>
                            <div className="text-xs text-slate-500">ID: {course.id} • {course.totalNodes} nodes</div>
                        </div>
                        <div className="col-span-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                course.status === 'published' 
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                    : course.status === 'archived'
                                    ? 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                                {(course.status || 'draft').charAt(0).toUpperCase() + (course.status || 'draft').slice(1)}
                            </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-2 text-slate-300">
                            <Users size={16} className="text-slate-500" /> 0
                        </div>
                        <div className="col-span-2 text-slate-400 text-sm">
                            {formatDate(course.updatedAt)}
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
                ))
            )}
        </div>

      </main>
    </div>
  );
}


