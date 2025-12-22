"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { OrganicTree } from '@/components/visualization/OrganicTree';
import { Node, Edge } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { logUserActivity } from '@/lib/utils/activityLogger';
import { LessonDrawer } from '@/components/course/LessonDrawer';

export default function TreePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Drawer state
  const [drawerWidth, setDrawerWidth] = useState<number>(66.666);
  const [isResizing, setIsResizing] = useState(false);

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
      
      // 自動記錄課程瀏覽（只在首次載入時）
      if (isFirstLoad) {
        const courseIdNum = parseInt(courseId);
        if (courseIdNum) {
          logUserActivity('course_view', {
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
      
      <div className="flex-1 relative overflow-hidden flex">
        {/* The Tree Canvas */}
        <div 
            className={`flex-1 relative ease-in-out ${isResizing ? '' : 'transition-all duration-300'}`}
            style={{
                transform: selectedNode ? `translateX(-${drawerWidth / 2}%)` : 'none'
            }}
        >
          <OrganicTree 
            nodes={nodes}
            edges={edges}
            completedNodes={completedNodes}
            isCreatorMode={false}
            onNodeClick={setSelectedNode}
            scale={selectedNode ? Math.max(0.5, 1 - (drawerWidth / 150)) : 1}
            disableTransition={isResizing}
          />
        </div>

        {/* Lesson Drawer */}
        {selectedNode && (
          <LessonDrawer 
            courseId={courseId}
            nodeId={selectedNode.id}
            isOpen={true}
            onClose={() => setSelectedNode(null)}
            onComplete={() => {
              setCompletedNodes(prev => {
                const newSet = new Set(prev);
                newSet.add(selectedNode.id);
                return newSet;
              });
            }}
            initialCompleted={completedNodes.has(selectedNode.id)}
            width={drawerWidth}
            onWidthChange={setDrawerWidth}
            onResizeStart={() => setIsResizing(true)}
            onResizeEnd={() => setIsResizing(false)}
          />
        )}
      </div>
    </div>
  );
}
