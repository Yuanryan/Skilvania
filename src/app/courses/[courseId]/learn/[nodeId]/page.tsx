"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { ArrowLeft, BookOpen, CheckCircle, PlayCircle, FileText, Award, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { logNodeView, logNodeComplete, logUserActivity } from '@/lib/utils/activityLogger';
import { parseContent } from '@/types/content';
import BlockRenderer from '@/lib/content/blockRenderer';

interface NodeData {
  title: string;
  content: string;
  xp: number;
  type: 'theory' | 'code' | 'project' | 'guide' | 'tutorial' | 'checklist' | 'resource';
  description: string | null;
}

export default function LessonContentPage() {
  const params = useParams();
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<NodeData | null>(null);
  
  // 載入節點內容
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const courseId = params.courseId as string;
        const nodeId = params.nodeId as string;
        
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

    if (params.courseId && params.nodeId) {
      loadContent();
    }
  }, [params.courseId, params.nodeId]);
  
  // 自動記錄節點查看活動
  useEffect(() => {
    const nodeId = parseInt(params.nodeId as string);
    const courseId = parseInt(params.courseId as string);
    if (nodeId && courseId && lesson) {
      logNodeView(nodeId, courseId).catch(() => {}); // 靜默失敗，不影響頁面載入
    }
  }, [params.nodeId, params.courseId, lesson]);

  const handleComplete = async () => {
    if (!lesson) return;
    
    const nodeId = parseInt(params.nodeId as string);
    const courseId = parseInt(params.courseId as string);
    
    if (!nodeId || !courseId) return;

    try {
      // 調用 API 更新用戶進度和 XP
      const response = await fetch(`/api/courses/${courseId}/nodes/${nodeId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to complete node:', errorData.error || 'Unknown error');
        // 即使 API 失敗，也顯示完成狀態（用戶體驗）
        setIsCompleted(true);
      } else {
        const data = await response.json();
        setIsCompleted(true);
        
        // 記錄節點完成活動到 MongoDB（用於分析）
        logNodeComplete(nodeId, courseId, lesson.xp).catch(() => {});
        
        // 檢查是否完成所有節點（課程完成）
        try {
          const treeResponse = await fetch(`/api/courses/${courseId}/tree`);
          if (treeResponse.ok) {
            const treeData = await treeResponse.json();
            const totalNodes = treeData.nodes?.length || 0;
            const completedNodes = treeData.completedNodes?.length || 0;
            
            // 如果完成最後一個節點，記錄課程完成
            if (totalNodes > 0 && completedNodes + 1 >= totalNodes) {
              logUserActivity('course_complete', {
                courseId,
              }).catch(() => {});
            }
          }
        } catch (error) {
          // 靜默失敗，不影響完成流程
        }
      }
    } catch (error) {
      console.error('Error completing node:', error);
      // 即使出錯，也顯示完成狀態
      setIsCompleted(true);
    }
    
    setTimeout(() => {
      router.push(`/courses/${params.courseId}/tree`);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-forest flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto text-emerald-500 mb-4" size={48} />
            <p className="text-slate-400">載入課程內容中...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-deep-forest flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center bg-slate-900/50 border border-red-500/20 rounded-xl p-8">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-xl font-bold text-white mb-2">載入失敗</h2>
            <p className="text-slate-400 mb-4">{error || '無法載入課程內容'}</p>
            <Link
              href={`/courses/${params.courseId}/tree`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <ArrowLeft size={16} /> 返回課程樹
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
        
        {/* Navigation Header */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <Link 
            href={`/courses/${params.courseId}/tree`} 
            className="p-2 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-1">
              {lesson.type === 'theory' ? 'Theory' : 
               lesson.type === 'code' ? 'Code Challenge' : 
               lesson.type === 'project' ? 'Project' :
               lesson.type === 'guide' ? 'Guide' :
               lesson.type === 'tutorial' ? 'Tutorial' :
               lesson.type === 'checklist' ? 'Checklist' :
               lesson.type === 'resource' ? 'Resource' : 'Theory'}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{lesson.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6 sm:space-y-8">
            
            {/* Content Area - 支援 Block 格式和 Markdown */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6 md:p-8">
              {lesson.content ? (
                <BlockRenderer blocks={parseContent(lesson.content)} />
              ) : (
                <div className="text-slate-400 italic">
                  <p>此課程節點還沒有內容。請稍後再來查看。</p>
                </div>
              )}
            </div>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-slate-900 border border-white/10 rounded-xl p-4 sm:p-6 sticky top-20 sm:top-24">
              <div className="flex items-center justify-between mb-6">
                <span className="text-slate-400 text-sm font-medium">XP Reward</span>
                <span className="text-amber-400 font-bold">{lesson?.xp || 100} XP</span>
              </div>
              
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
                    <CheckCircle size={20} /> Completed
                  </>
                ) : (
                  "Complete Lesson"
                )}
              </button>

              <div className="mt-6 pt-6 border-t border-white/5">
                <h4 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                  <FileText size={16} /> Resources
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-emerald-400 text-sm hover:underline">MDN Web Docs: DOM</a>
                  </li>
                  <li>
                    <a href="#" className="text-emerald-400 text-sm hover:underline">JavaScript.info</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}



