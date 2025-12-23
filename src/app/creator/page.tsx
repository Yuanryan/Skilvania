"use client";

import { Navbar } from '@/components/ui/Navbar';
import { Plus, GitBranch, Users, Edit3, MoreVertical, Loader2, Trash2, Eye, EyeOff, FileText } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<Array<{ TagID: number; Name: string }>>([]);
  const menuRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  // 關閉下拉選單當點擊外部
  // handleClickOutside 已移除，根據用戶要求
  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (openMenuId) {
  //       const target = event.target as Node;
  //       const buttonElement = menuRefs.current[openMenuId];
  //       const menuElement = document.getElementById(`menu-${openMenuId}`);
  //       
  //       if (buttonElement && !buttonElement.contains(target) && 
  //           menuElement && !menuElement.contains(target)) {
  //         setOpenMenuId(null);
  //         setMenuPosition(null);
  //       }
  //     }
  //   };
  //
  //   if (openMenuId) {
  //     document.addEventListener('mousedown', handleClickOutside);
  //   }
  //   return () => document.removeEventListener('mousedown', handleClickOutside);
  // }, [openMenuId]);

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

  // 獲取所有標籤
  useEffect(() => {
    if (showCreateModal) {
      fetch('/api/tags')
        .then(res => res.json())
        .then(data => {
          if (data.tags) {
            setAvailableTags(data.tags);
          }
        })
        .catch(err => console.error('Error fetching tags:', err));
    }
  }, [showCreateModal]);

  const handleAddTag = (tagName: string) => {
    const trimmedName = tagName.trim();
    if (!trimmedName || selectedTags.includes(trimmedName)) return;
    
    // 只添加到本地列表，不立即保存到数据库
    setSelectedTags(prev => [...prev, trimmedName]);
    setTagInput('');
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tagName));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagInput(value);
    
    // 如果输入包含空格，自动创建tag
    if (value.includes(' ')) {
      const parts = value.split(' ').filter(p => p.trim());
      if (parts.length > 0) {
        // 最后一个部分保留在输入框中，其他部分创建为tag
        const tagsToAdd = parts.slice(0, -1);
        tagsToAdd.forEach(tag => handleAddTag(tag));
        setTagInput(parts[parts.length - 1]);
      }
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newCourseTitle.trim(),
          tags: selectedTags
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create course`);
      }

      const data = await response.json();
      setShowCreateModal(false);
      setNewCourseTitle('');
      setSelectedTags([]);
      setTagInput('');
      router.push(`/creator/${data.courseId}/editor`);
    } catch (error: any) {
      console.error('Error creating course:', error);
      alert(`Failed to create course: ${error.message || 'Please try again.'}`);
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setNewCourseTitle('');
    setSelectedTags([]);
    setTagInput('');
  };

  const closeCreateModal = () => {
    if (!creating) {
      setShowCreateModal(false);
      setNewCourseTitle('');
      setSelectedTags([]);
      setTagInput('');
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

  const handleStatusChange = async (courseId: string, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update course status');
      }

      // 更新本地狀態
      setCourses(courses.map(course => 
        course.id === courseId ? { ...course, status: newStatus } : course
      ));
      setOpenMenuId(null);
      setMenuPosition(null);
    } catch (error: any) {
      console.error('Error updating course status:', error);
      alert(`Failed to update course status: ${error.message || 'Please try again.'}`);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete course');
      }

      // 從列表中移除
      setCourses(courses.filter(course => course.id !== courseId));
      setOpenMenuId(null);
      setMenuPosition(null);
    } catch (error: any) {
      console.error('Error deleting course:', error);
      alert(`Failed to delete course: ${error.message || 'Please try again.'}`);
    }
  };

  const toggleMenu = (courseId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuId === courseId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      setOpenMenuId(courseId);
      setMenuPosition({
        x: rect.right - 192, // 192px is menu width (w-48)
        y: rect.bottom + 4
      });
    }
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
                onClick={openCreateModal}
                disabled={creating}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
            >
                <Plus size={20} /> Create New Course
            </button>
        </div>

        <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-visible">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-slate-950/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">Course Title</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Students</div>
                <div className="col-span-2">Last Edited</div>
                <div className="col-span-1"></div>
            </div>

            <div className="overflow-hidden rounded-b-2xl">
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
                        <div key={course.id} className="grid grid-cols-12 gap-4 p-4 items-center border-b border-white/5 hover:bg-white/5 transition-colors group relative">
                        <div 
                            className="col-span-5 cursor-pointer"
                            onClick={() => router.push(`/creator/${course.id}/preview`)}
                        >
                            <div className="font-bold text-white text-lg hover:text-emerald-400 transition-colors">{course.title}</div>
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
                            <div className="flex items-center gap-2 relative">
                                <Link 
                                    href={`/creator/${course.id}/editor`}
                                    className="p-2 bg-slate-800 hover:bg-white text-slate-300 hover:text-slate-900 rounded-lg transition-colors"
                                    title="Edit Tree"
                                >
                                    <GitBranch size={18} />
                                </Link>
                                <div className="relative">
                                    <button 
                                        ref={el => { menuRefs.current[course.id] = el; }}
                                        onClick={(e) => toggleMenu(course.id, e)}
                                        className="p-2 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ))
                )}
            </div>
        </div>

      </main>
      
      {/* Dropdown Menu Portal */}
      {openMenuId && menuPosition && typeof window !== 'undefined' && (() => {
        const course = courses.find(c => c.id === openMenuId);
        if (!course) return null;
        
        return createPortal(
          <div
            id={`menu-${openMenuId}`}
            className="fixed w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-[9999] overflow-hidden"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`
            }}
          >
            {course.status !== 'published' && (
              <button
                onClick={() => {
                  handleStatusChange(course.id, 'published');
                  setOpenMenuId(null);
                  setMenuPosition(null);
                }}
                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-slate-700 transition-colors flex items-center gap-3"
              >
                <Eye size={16} className="text-emerald-400" />
                <span>Publish</span>
              </button>
            )}
            {course.status !== 'draft' && (
              <button
                onClick={() => {
                  handleStatusChange(course.id, 'draft');
                  setOpenMenuId(null);
                  setMenuPosition(null);
                }}
                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-slate-700 transition-colors flex items-center gap-3"
              >
                <EyeOff size={16} className="text-amber-400" />
                <span>Set to Draft</span>
              </button>
            )}
            <button
              onClick={() => {
                handleDeleteCourse(course.id);
                setOpenMenuId(null);
                setMenuPosition(null);
              }}
              className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-700 transition-colors flex items-center gap-3"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>,
          document.body
        );
      })()}
      
      {/* Create Course Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          onClick={closeCreateModal}
        >
          <div 
            className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-2">Create New Course</h2>
              <p className="text-slate-400 text-sm mb-6">Give your skill tree a name to get started.</p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="course-title" className="block text-sm font-medium text-slate-300 mb-2">
                    Course Title
                  </label>
                  <input
                    id="course-title"
                    type="text"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCourseTitle.trim() && !creating && e.target === e.currentTarget) {
                        e.preventDefault();
                        handleCreateCourse();
                      }
                      if (e.key === 'Escape') {
                        closeCreateModal();
                      }
                    }}
                    placeholder="e.g., Full Stack Web Development"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    autoFocus
                    disabled={creating}
                  />
                </div>

                <div>
                  <label htmlFor="course-tags" className="block text-sm font-medium text-slate-300 mb-2">
                    Tags (Skills)
                  </label>
                  <div className="space-y-2">
                    <input
                      id="course-tags"
                      type="text"
                      value={tagInput}
                      onChange={handleTagInputChange}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="Enter tag name (e.g., JavaScript React)"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      disabled={creating}
                    />
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm border border-blue-500/30"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              disabled={creating}
                              className="hover:text-blue-100 transition-colors disabled:opacity-50"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {availableTags.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-400 mb-1">Recommended Tags:</p>
                        <div className="flex flex-wrap gap-2">
                          {availableTags
                            .filter(tag => !selectedTags.includes(tag.Name))
                            .slice(0, 10)
                            .map((tag) => (
                              <button
                                key={tag.TagID}
                                type="button"
                                onClick={() => handleAddTag(tag.Name)}
                                disabled={creating}
                                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 transition-colors disabled:opacity-50"
                              >
                                {tag.Name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={closeCreateModal}
                    disabled={creating}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCourse}
                    disabled={creating || !newCourseTitle.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Create
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



