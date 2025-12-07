"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { OrganicTree } from '@/components/visualization/OrganicTree';
import { Node, Edge } from '@/types';
import { BookOpen, CheckCircle, Sparkles, X, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { logUserActivity } from '@/lib/utils/activityLogger';

export default function TreePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 從 API 獲取數據
  const fetchTreeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/courses/${courseId}/tree`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '獲取數據失敗');
      }

      const data = await response.json();
      const isFirstLoad = nodes.length === 0;
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setCompletedNodes(new Set(data.completedNodes || []));
      
      // 自動記錄課程開始活動（只在首次載入時）
      if (isFirstLoad) {
        const courseIdNum = parseInt(courseId);
        if (courseIdNum) {
          logUserActivity('course_start', {
            courseId: courseIdNum,
          }).catch(() => {}); // 靜默失敗，不影響頁面載入
        }
      }
    } catch (err) {
      console.error('獲取 tree 數據錯誤:', err);
      setError(err instanceof Error ? err.message : '未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchTreeData();
    }
  }, [courseId]);

  // 完成節點（調試功能，但也會更新數據庫）
  const handleCompleteNode = async (nodeId: string) => {
    const nodeIdInt = parseInt(nodeId);
    const courseIdInt = parseInt(courseId);
    
    if (!nodeIdInt || !courseIdInt) return;

    try {
      // 調用 API 更新用戶進度和 XP
      const response = await fetch(`/api/courses/${courseIdInt}/nodes/${nodeIdInt}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // 更新本地狀態
        setCompletedNodes(prev => {
          const newSet = new Set(prev);
          newSet.add(nodeId);
          return newSet;
        });
        console.log('Node completed:', data);
        // 重新獲取 tree 數據以確保同步
        fetchTreeData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to complete node:', errorData.error || 'Unknown error');
        // 即使 API 失敗，也更新本地狀態（用於調試）
        setCompletedNodes(prev => {
          const newSet = new Set(prev);
          newSet.add(nodeId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error completing node:', error);
      // 即使出錯，也更新本地狀態（用於調試）
      setCompletedNodes(prev => {
        const newSet = new Set(prev);
        newSet.add(nodeId);
        return newSet;
      });
    }
  };

  // 加載狀態
  if (loading) {
    return (
      <div className="h-screen bg-deep-forest flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-white">
            <Loader2 size={48} className="animate-spin text-emerald-500" />
            <p className="text-lg">載入技能樹中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="h-screen bg-deep-forest flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-white bg-slate-900/50 p-8 rounded-2xl border border-red-500/20">
            <AlertCircle size={48} className="text-red-500" />
            <p className="text-lg font-bold">載入失敗</p>
            <p className="text-slate-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-deep-forest flex flex-col overflow-hidden">
      <Navbar />
      
      <div className="flex-1 relative overflow-hidden">
        {/* The Tree Canvas */}
        <OrganicTree 
          nodes={nodes}
          edges={edges}
          completedNodes={completedNodes}
          isCreatorMode={false}
          onNodeClick={setSelectedNode}
        />

        {/* Side Panel for Node Details */}
        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 w-full md:w-[450px] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl p-8 flex flex-col animate-slide-in z-40">
            <button 
                onClick={() => setSelectedNode(null)} 
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
            >
                <X size={20} />
            </button>
            
            <div className="flex items-center gap-5 mb-8 mt-4">
              <div className={`p-5 rounded-2xl shadow-inner border border-white/5 ${completedNodes.has(selectedNode.id) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {/* We could dynamically render the icon here too if we imported Lucide icons mapping */}
                <Sparkles size={32} />
              </div>
              <div>
                <h2 className="font-bold text-3xl text-white leading-tight mb-1">{selectedNode.title}</h2>
                <div className="text-xs text-slate-400 uppercase tracking-widest font-bold flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${completedNodes.has(selectedNode.id) ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {selectedNode.type} Node
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="prose prose-invert prose-lg">
                <p className="text-slate-300 leading-relaxed">
                  {selectedNode.description || '這個節點代表你學習旅程中的一個重要里程碑。完成目標以將這些知識融入你的技能樹。'}
                </p>
                
                <div className="my-8 bg-slate-950/50 rounded-2xl p-6 border border-white/5">
                  <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
                    <BookOpen size={16} className="text-emerald-500"/> Learning Objectives
                  </h4>
                  <ul className="space-y-4 text-slate-300 list-none pl-0">
                    <li className="flex gap-4 items-start">
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                        <span>Read the core concepts</span>
                    </li>
                    <li className="flex gap-4 items-start">
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                        <span>Complete the interactive quiz</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 mt-auto">
              {completedNodes.has(selectedNode.id) ? (
                <div className="w-full bg-emerald-900/20 border border-emerald-500/20 text-emerald-400 py-4 rounded-xl flex items-center justify-center gap-3 font-bold cursor-default">
                  <CheckCircle size={18} /> Knowledge Absorbed
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                    <Link 
                        href={`/courses/${params.courseId}/learn/${selectedNode.id}`}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 border border-slate-700"
                    >
                        View Lesson Content <ArrowRight size={18} />
                    </Link>
                    
                    {/* Debug Helper for "Instant Complete" */}
                    <button 
                        onClick={() => handleCompleteNode(selectedNode.id)} 
                        className="w-full text-xs text-slate-600 hover:text-slate-400 py-2"
                    >
                        [Debug: Instant Complete]
                    </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

