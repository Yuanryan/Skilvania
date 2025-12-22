"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Loader2, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { logNodeView, logNodeComplete, logUserActivity } from '@/lib/utils/activityLogger';
import { parseContent } from '@/types/content';
import BlockRenderer from '@/lib/content/blockRenderer';

interface NodeData {
  title: string;
  content: string;
  xp: number;
  type: 'theory' | 'code' | 'project';
  description: string | null;
}

interface LessonDrawerProps {
  courseId: string;
  nodeId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialCompleted?: boolean;
  // Dynamic resizing props
  width: number;
  onWidthChange: (width: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export function LessonDrawer({ 
  courseId, 
  nodeId, 
  isOpen, 
  onClose, 
  onComplete, 
  initialCompleted = false,
  width,
  onWidthChange,
  onResizeStart,
  onResizeEnd
}: LessonDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<NodeData | null>(null);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const isResizingRef = useRef(false);

  // Load content
  useEffect(() => {
    if (!isOpen) return;

    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/courses/${courseId}/nodes/${nodeId}/content`);
        if (!response.ok) {
          throw new Error('Failed to load lesson content');
        }
        
        const data = await response.json();
        setLesson({
          title: data.title || 'Untitled Lesson',
          content: data.content || '',
          xp: data.xp || 100,
          type: data.type || 'theory',
          description: data.description || null
        });
      } catch (err) {
        console.error('Error loading lesson:', err);
        setError(err instanceof Error ? err.message : 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [courseId, nodeId, isOpen]);

  // Sync initialCompleted if it changes from props (e.g. if updated elsewhere)
  useEffect(() => {
    setIsCompleted(initialCompleted);
  }, [initialCompleted]);

  // Log view
  useEffect(() => {
    if (isOpen && lesson) {
      const nId = parseInt(nodeId);
      const cId = parseInt(courseId);
      if (nId && cId) {
        logNodeView(nId, cId).catch(() => {});
      }
    }
  }, [nodeId, courseId, lesson, isOpen]);

  // Handle Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      // Limit width between 30% and 90%
      if (newWidth > 30 && newWidth < 90) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        if (onResizeEnd) onResizeEnd();
      }
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, onWidthChange, onResizeEnd]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    if (onResizeStart) onResizeStart();
  };

  const handleComplete = async () => {
    if (!lesson) return;
    
    const nId = parseInt(nodeId);
    const cId = parseInt(courseId);
    
    if (!nId || !cId) return;

    try {
      const response = await fetch(`/api/courses/${cId}/nodes/${nId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to complete node:', errorData.error || 'Unknown error');
      }
      
      setIsCompleted(true);
      logNodeComplete(nId, cId, lesson.xp).catch(() => {});
      
      // Check for course completion
       try {
          const treeResponse = await fetch(`/api/courses/${cId}/tree`);
          if (treeResponse.ok) {
            const treeData = await treeResponse.json();
            const totalNodes = treeData.nodes?.length || 0;
            const completedNodes = treeData.completedNodes?.length || 0;
            
            if (totalNodes > 0 && completedNodes + 1 >= totalNodes) {
              logUserActivity('course_complete', {
                courseId: cId,
              }).catch(() => {});
            }
          }
        } catch (error) {
          // Silent fail
        }

      // Notify parent to update tree state
      onComplete();
      
    } catch (error) {
      console.error('Error completing node:', error);
      setIsCompleted(true); // Optimistic UI
      onComplete();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute right-0 top-0 bottom-0 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col animate-slide-in z-50"
      style={{ width: `${width}%` }}
    >
       {/* Resize Handle */}
       <div 
         className="absolute left-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-emerald-500/50 cursor-ew-resize transition-all z-50 flex items-center justify-center group -ml-[2px]"
         onMouseDown={handleResizeStart}
       >
          <div className="h-8 w-1 bg-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
       </div>

       {/* Header */}
       <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-4">
             <button 
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
             >
                <ArrowRight size={20} />
             </button>
             <div>
                <div className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-1">
                   {lesson?.type === 'theory' ? 'Theory' : lesson?.type === 'code' ? 'Code Challenge' : 'Project'}
                </div>
                <h2 className="text-xl font-bold text-white max-w-[200px] sm:max-w-md truncate">
                  {loading ? 'Loading...' : lesson?.title}
                </h2>
             </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-amber-400 font-bold bg-amber-400/10 px-3 py-1 rounded-full text-sm">
               {lesson?.xp || 0} XP
            </div>
            <button 
                onClick={onClose} 
                className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
            >
                <X size={20} />
            </button>
          </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <Loader2 className="animate-spin text-emerald-500" size={48} />
                <p>Loading lesson content...</p>
             </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <AlertCircle className="text-red-500" size={48} />
                <p>{error}</p>
                <button onClick={onClose} className="text-emerald-500 hover:underline">Return to Tree</button>
             </div>
          ) : (
             <div className="max-w-3xl mx-auto space-y-8">
                <div className="prose prose-invert prose-lg max-w-none">
                    {lesson?.content ? (
                        <BlockRenderer blocks={parseContent(lesson.content)} />
                    ) : (
                        <div className="text-slate-400 italic py-10 text-center border border-dashed border-slate-700 rounded-xl">
                            No content available for this lesson yet.
                        </div>
                    )}
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col gap-6">
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                        <h4 className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                           <FileText size={16} /> Recommended Resources
                        </h4>
                         <ul className="space-y-2">
                            <li><a href="#" className="text-emerald-400 text-sm hover:underline">MDN Web Docs</a></li>
                            <li><a href="#" className="text-emerald-400 text-sm hover:underline">Official Documentation</a></li>
                         </ul>
                    </div>
                </div>
             </div>
          )}
       </div>

       {/* Footer Action */}
       {!loading && !error && (
           <div className="p-6 border-t border-white/10 bg-slate-900/50 backdrop-blur-sm">
              <div className="max-w-3xl mx-auto">
                <button 
                    onClick={handleComplete}
                    disabled={isCompleted}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        isCompleted 
                            ? 'bg-emerald-900/30 text-emerald-500 border border-emerald-500/30 cursor-default' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-900/20'
                    }`}
                >
                    {isCompleted ? (
                        <>
                            <CheckCircle size={20} /> Lesson Completed
                        </>
                    ) : (
                        "Complete Lesson & Continue"
                    )}
                </button>
              </div>
           </div>
       )}
    </div>
  );
}
