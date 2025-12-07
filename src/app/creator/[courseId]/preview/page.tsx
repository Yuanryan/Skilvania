"use client";

import { Navbar } from '@/components/ui/Navbar';
import { Play, Share2, GitBranch, Star, ArrowLeft, Edit2, Save, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  creatorId: string;
  status: 'draft' | 'published' | 'archived';
  totalNodes: number;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
}

export default function CoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<Array<{ TagID: number; Name: string }>>([]);

  useEffect(() => {
    if (courseId) {
      loadCourse();
      loadTags();
    }
  }, [courseId]);

  const loadTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      if (data.tags) {
        setAvailableTags(data.tags);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) {
        throw new Error('Failed to load course');
      }
      const data = await response.json();
      setCourse(data.course);
      setEditedTitle(data.course.title);
      setEditedDescription(data.course.description || '');
      setSelectedTags(data.course.tags || []);
    } catch (error) {
      console.error('Error loading course:', error);
      alert('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!course) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedTitle.trim(),
          description: editedDescription.trim() || null,
          tags: selectedTags
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update course');
      }

      const data = await response.json();
      setCourse(data.course);
      setSelectedTags(data.course.tags || []);
      setEditing(false);
    } catch (error: any) {
      console.error('Error saving course:', error);
      alert(`Failed to save: ${error.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (course) {
      setEditedTitle(course.title);
      setEditedDescription(course.description || '');
      setSelectedTags(course.tags || []);
    }
    setEditing(false);
  };

  const handleAddTag = (tagName: string) => {
    const trimmedName = tagName.trim();
    if (!trimmedName || selectedTags.includes(trimmedName)) return;
    setSelectedTags(prev => [...prev, trimmedName]);
    setTagInput('');
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tagName));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 按空格键创建tag
    if (e.key === ' ' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput);
    }
    // Enter键仍然可以创建tag（备用方式）
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

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-forest flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-emerald-500" size={48} />
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-deep-forest flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-white text-xl">Course not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
            
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-8">
              <Link href="/creator" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft size={16} /> Back to Dashboard
              </Link>
              
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 border border-slate-700"
                >
                  <Edit2 size={16} /> Edit
                </button>
              )}
              
              {editing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 border border-slate-700 disabled:opacity-50"
                  >
                    <X size={16} /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} /> Save
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-10">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                          course.status === 'published'
                            ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/30'
                            : 'bg-amber-900/30 text-amber-400 border-amber-800/30'
                        }`}>
                            {course.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                        <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                            <Star size={14} fill="currentColor" /> 0.0
                        </div>
                    </div>
                    
                    {editing ? (
                      <>
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="w-full text-4xl md:text-5xl font-bold text-white mb-6 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500"
                          placeholder="Course Title"
                        />
                        <textarea
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          className="w-full text-lg text-slate-300 mb-6 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 resize-none"
                          rows={4}
                          placeholder="Course Description"
                        />
                        
                        {/* Tags Editor */}
                        <div className="mb-8">
                          <label htmlFor="edit-tags" className="block text-sm font-medium text-slate-300 mb-2">
                            Tags (Skills)
                          </label>
                          <div className="space-y-2">
                            <input
                              id="edit-tags"
                              type="text"
                              value={tagInput}
                              onChange={handleTagInputChange}
                              onKeyDown={handleTagInputKeyDown}
                              placeholder="輸入標籤名稱，按空格鍵或 Enter 創建標籤 (例如: JavaScript React)"
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                              disabled={saving}
                            />
                            {selectedTags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {selectedTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 bg-emerald-600/20 text-emerald-300 px-3 py-1 rounded-full text-sm border border-emerald-500/30"
                                  >
                                    {tag}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTag(tag)}
                                      disabled={saving}
                                      className="hover:text-emerald-100 transition-colors disabled:opacity-50"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                            {availableTags.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-slate-400 mb-1">建議標籤（點擊添加）:</p>
                                <div className="flex flex-wrap gap-2">
                                  {availableTags
                                    .filter(tag => !selectedTags.includes(tag.Name))
                                    .slice(0, 10)
                                    .map((tag) => (
                                      <button
                                        key={tag.TagID}
                                        type="button"
                                        onClick={() => handleAddTag(tag.Name)}
                                        disabled={saving}
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
                      </>
                    ) : (
                      <>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                            {course.title}
                        </h1>
                        
                        <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                            {course.description || 'No description yet. Click Edit to add one.'}
                        </p>
                      </>
                    )}
                    
                    <div className="flex flex-wrap gap-4 mb-10">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <GitBranch size={16} /> {course.totalNodes} Nodes
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <Share2 size={16} /> 0 Students
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link 
                            href={`/courses/${courseId}/tree`} 
                            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-900/50 transition-all hover:scale-105 flex items-center gap-2"
                        >
                            <Play size={20} fill="currentColor" /> Start Learning
                        </Link>
                        <Link
                            href={`/courses/${courseId}/tree`}
                            className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700"
                        >
                            Preview Tree
                        </Link>
                    </div>
                </div>

                {/* Right Column / Stats */}
                <div className="hidden md:block w-72 space-y-4">
                    <div className="bg-slate-950/50 rounded-xl p-6 border border-white/5">
                        <h3 className="text-slate-400 text-xs font-bold uppercase mb-4">Course Info</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-slate-500">Status:</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                                  course.status === 'published'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}>
                                  {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">Nodes:</span>
                                <span className="ml-2 text-white">{course.totalNodes}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Students:</span>
                                <span className="ml-2 text-white">0</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Skills You'll Grow */}
                    <div className="bg-slate-950/50 rounded-xl p-6 border border-white/5">
                        <h3 className="text-slate-400 text-xs font-bold uppercase mb-4">Skills You'll Grow</h3>
                        {selectedTags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {selectedTags.map(tag => (
                                    <span key={tag} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No tags yet</p>
                        )}
                    </div>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}

