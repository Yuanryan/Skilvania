"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OrganicTree } from '@/components/visualization/OrganicTree';
import { Node, Edge } from '@/types';
import { Save, Plus, Trash2, Edit3, ArrowLeft, Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CreatorEditorPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  
  // --- STATE ---
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');

  // --- LOAD DATA ---
  useEffect(() => {
    if (courseId) {
      loadCourseData();
    }
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) {
        throw new Error('Failed to load course');
      }
      const data = await response.json();
      setCourseTitle(data.course.title);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (error) {
      console.error('Error loading course:', error);
      alert('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  const addNode = async () => {
    const newNode: Node = { 
      id: 'temp-' + Date.now(), 
      title: "New Skill", 
      xp: 100, 
      type: "code", 
      x: 400, 
      y: 400, 
      iconName: 'Code' 
    };
    
    // 樂觀更新 UI
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);

    // 保存到後端
    try {
      const response = await fetch(`/api/courses/${courseId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNode.title,
          type: newNode.type,
          x: newNode.x,
          y: newNode.y,
          xp: newNode.xp,
          iconName: newNode.iconName
        })
      });

      if (!response.ok) throw new Error('Failed to create node');
      const data = await response.json();
      
      // 更新為真實 ID
      setNodes(prev => prev.map(n => n.id === newNode.id ? data.node : n));
      setSelectedNodeId(data.node.id);
    } catch (error) {
      console.error('Error creating node:', error);
      // 回滾
      setNodes(prev => prev.filter(n => n.id !== newNode.id));
      setSelectedNodeId(null);
      alert('Failed to create node');
    }
  };

  const updateNode = useCallback(async (id: string, updates: Partial<Node>) => {
    // 樂觀更新 UI
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

    // 如果是位置更新，使用批量 API
    if (updates.x !== undefined || updates.y !== undefined) {
      // 延遲批量保存位置更新
      return;
    }

    // 其他更新立即保存
    try {
      const response = await fetch(`/api/courses/${courseId}/nodes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update node');
      }

      // 使用 API 返回的數據更新本地狀態（確保與資料庫同步）
      const data = await response.json();
      if (data.node) {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, ...data.node } : n));
      }
    } catch (error) {
      console.error('Error updating node:', error);
      // 重新載入以恢復正確狀態
      loadCourseData();
    }
  }, [courseId]);

  // 批量保存節點位置的防抖計時器
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 批量保存節點位置
  const saveNodePositions = useCallback(async (nodesToSave: Node[]) => {
    try {
      // 過濾掉臨時節點（temp-xxx）
      const validNodes = nodesToSave.filter(n => !n.id.startsWith('temp-'));
      
      if (validNodes.length === 0) {
        return; // 沒有有效節點，直接返回
      }

      const response = await fetch(`/api/courses/${courseId}/nodes/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: validNodes.map(n => ({ nodeId: n.id, x: n.x, y: n.y }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save positions');
      }
    } catch (error) {
      console.error('Error saving positions:', error);
      // 不顯示 alert，因為這是自動保存（防抖），避免打擾用戶
    }
  }, [courseId]);

  // 節點拖拽處理（使用防抖）
  const handleNodeDrag = useCallback((id: string, x: number, y: number) => {
    // 立即更新 UI
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
    
    // 清除之前的計時器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    // 設置新的防抖計時器
    saveTimerRef.current = setTimeout(() => {
      setNodes(currentNodes => {
        const nodeToSave = currentNodes.find(n => n.id === id);
        if (nodeToSave) {
          saveNodePositions([nodeToSave]);
        }
        return currentNodes;
      });
    }, 1000); // 1秒後保存
  }, [saveNodePositions]);

  const deleteSelected = async () => {
    if (!selectedNodeId) return;

    const nodeId = selectedNodeId;
    
    // 樂觀更新 UI
    setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setSelectedNodeId(null);

    // 刪除後端節點（級聯刪除連接）
    try {
      const response = await fetch(`/api/courses/${courseId}/nodes/${nodeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete node');
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      // 重新載入以恢復正確狀態
      loadCourseData();
      alert('Failed to delete node');
    }
  };

  const handleConnect = async (sourceId: string, targetId: string) => {
    // 檢查是否已存在連接
    const existingEdge = edges.find(e => e.from === sourceId && e.to === targetId);
    
    if (existingEdge) {
      // 如果是臨時 edge（temp-xxx），直接從 UI 移除，不需要調用 API
      if (existingEdge.id.startsWith('temp-')) {
        setEdges(prev => prev.filter(e => e.id !== existingEdge.id));
        return;
      }
      
      // 刪除連接
      setEdges(prev => prev.filter(e => e.id !== existingEdge.id));
      
      try {
        // edgeId 應該已經是 "e-123" 格式，如果不是則添加前綴
        const edgeId = existingEdge.id.startsWith('e-') ? existingEdge.id : `e-${existingEdge.id}`;
        const response = await fetch(`/api/courses/${courseId}/edges/${edgeId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to delete edge');
        }
      } catch (error) {
        console.error('Error deleting edge:', error);
        // 如果刪除失敗，重新載入資料以恢復正確狀態
        loadCourseData();
        alert('Failed to delete connection. Please try again.');
      }
    } else {
      // 創建連接
      const tempEdge: Edge = { id: `temp-${Date.now()}`, from: sourceId, to: targetId };
      setEdges(prev => [...prev, tempEdge]);

      try {
        const response = await fetch(`/api/courses/${courseId}/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromNodeId: sourceId,
            toNodeId: targetId
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create edge');
        }

        const data = await response.json();
        // 更新為真實 ID
        setEdges(prev => prev.map(e => e.id === tempEdge.id ? data.edge : e));
      } catch (error) {
        console.error('Error creating edge:', error);
        // 回滾
        setEdges(prev => prev.filter(e => e.id !== tempEdge.id));
        alert('Failed to create connection');
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 清除防抖計時器
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      
      // 過濾掉臨時節點（temp-xxx），只保存已創建的節點
      const validNodes = nodes.filter(n => !n.id.startsWith('temp-'));
      
      if (validNodes.length === 0) {
        alert('No nodes to save. Please create at least one node.');
        return;
      }

      // 保存所有節點的完整信息（位置、標題、類型、XP、圖標等）
      const response = await fetch(`/api/courses/${courseId}/nodes/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: validNodes.map(n => ({
            nodeId: n.id,
            x: n.x,
            y: n.y,
            title: n.title,
            type: n.type,
            xp: n.xp,
            iconName: n.iconName,
            description: n.description
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save tree');
      }

      alert('Tree saved successfully!');
    } catch (error) {
      console.error('Error saving tree:', error);
      alert(error instanceof Error ? error.message : 'Failed to save tree');
    } finally {
      setSaving(false);
    }
  };

  // 清理計時器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      
      {/* Creator Navbar */}
      <header className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
            <Link href="/creator" className="text-slate-400 hover:text-white">
                <ArrowLeft size={20} />
            </Link>
            <span className="font-bold text-white">{courseTitle || 'Course Editor'}</span>
            <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">Draft Mode</span>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Tree
                </>
              )}
            </button>
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                <Settings size={18} />
            </button>
        </div>
      </header>

      <div className="flex-1 relative flex">
        
        {/* Floating Toolbox */}
        <div className="absolute top-6 left-6 z-40 flex flex-col gap-2 w-64">
            <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"><Edit3 size={14} /> Toolbox</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={addNode} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors">
                        <Plus size={20} /> Add Node
                    </button>
                    <button disabled={!selectedNodeId} onClick={deleteSelected} className="bg-red-900/50 hover:bg-red-600/80 border border-red-500/30 text-white p-3 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Trash2 size={20} /> Delete
                    </button>
                </div>
                <div className="mt-4 text-xs text-slate-500 space-y-1">
                    <p>• Drag nodes to position</p>
                    <p>• Click to select a node</p>
                    <p>• Click another node to link</p>
                </div>
            </div>

            {/* Node Properties Panel */}
            {selectedNode && (
               <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur animate-slide-in mt-2">
                 <h3 className="text-white font-bold mb-4 text-sm">Node Properties</h3>
                 <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Title</label>
                      <input 
                        value={selectedNode.title} 
                        onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Type</label>
                      <select 
                        value={selectedNode.type}
                        onChange={(e) => {
                          const newType = e.target.value as any;
                          // 根據 Type 自動設置對應的 Icon
                          const iconMap: Record<string, string> = {
                            'theory': 'Book',
                            'code': 'Code',
                            'project': 'Rocket'
                          };
                          const newIconName = iconMap[newType] || 'Code';
                          updateNode(selectedNode.id, { type: newType, iconName: newIconName });
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="theory">Theory (Reading)</option>
                        <option value="code">Code Challenge</option>
                        <option value="project">Project</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">XP Reward</label>
                      <input 
                        type="number"
                        value={selectedNode.xp} 
                        onChange={(e) => updateNode(selectedNode.id, { xp: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="pt-2 border-t border-white/5">
                        <Link 
                            href={`/creator/${params.courseId}/content/${selectedNode.id}`}
                            className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 rounded transition-colors"
                        >
                            Edit Lesson Content
                        </Link>
                    </div>
                 </div>
               </div>
             )}
        </div>

        {/* The Canvas */}
        <div className="flex-1 bg-[#0f1115] relative overflow-hidden" style={{ 
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
        }}>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="animate-spin mx-auto text-slate-400 mb-4" size={32} />
                  <p className="text-slate-500">Loading course...</p>
                </div>
              </div>
            ) : (
              <OrganicTree 
                nodes={nodes}
                edges={edges}
                completedNodes={new Set()} // Creator mode ignores completed status
                isCreatorMode={true}
                onNodeClick={(node) => setSelectedNodeId(node.id)}
                onNodeDrag={handleNodeDrag}
                onConnect={handleConnect}
              />
            )}
        </div>

      </div>
    </div>
  );
}

