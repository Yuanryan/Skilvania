 "use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OrganicTree } from '@/components/visualization/OrganicTree';
import { Node, Edge } from '@/types';
import { Save, Plus, Trash2, ArrowLeft, Settings, Loader2, Link2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LessonEditorDrawer } from '@/components/creator/LessonEditorDrawer';

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
  const [drawerWidth, setDrawerWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);

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

  // 取消連線模式的輔助函數
  const cancelConnectionMode = () => {
    if (isConnecting) {
      setIsConnecting(false);
      setConnectSourceId(null);
    }
  };

  const addNode = async () => {
    // 任何其他操作都應該先取消連線模式
    cancelConnectionMode();
    
    // 如果抽屜寬度太小（被收起），重置為默認寬度，確保抽屜打開
    if (drawerWidth < 5) {
      setDrawerWidth(50);
    }
    
    // Helper to find a free position
    const findFreePosition = (baseX: number, baseY: number): { x: number, y: number } => {
      const MIN_DISTANCE = 150; // Minimum distance between centers
      
      // Check if a position is valid (not too close to existing nodes)
      const isValid = (x: number, y: number) => {
        return !nodes.some(node => {
          const dx = node.x - x;
          const dy = node.y - y;
          return Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE;
        });
      };

      // 1. Try center first
      if (isValid(baseX, baseY)) return { x: baseX, y: baseY };

      // 2. Spiral search out
      let radius = MIN_DISTANCE;
      const MAX_RADIUS = 2000; // Don't go too far
      
      while (radius < MAX_RADIUS) {
        // Circumference ≈ 2 * PI * radius
        // Number of steps ≈ circumference / MIN_DISTANCE
        const steps = Math.max(8, Math.floor((2 * Math.PI * radius) / MIN_DISTANCE));
        const angleStep = (2 * Math.PI) / steps;

        for (let i = 0; i < steps; i++) {
          const angle = i * angleStep;
          const x = baseX + Math.cos(angle) * radius;
          const y = baseY + Math.sin(angle) * radius;

          // Check boundaries (keep some padding from 0 and 4000)
          if (x > 100 && x < 3900 && y > 100 && y < 3900) {
            if (isValid(x, y)) {
              return { x, y };
            }
          }
        }
        radius += MIN_DISTANCE;
      }
      
      // Fallback: Random offset
      return { 
        x: baseX + (Math.random() - 0.5) * 200, 
        y: baseY + (Math.random() - 0.5) * 200 
      };
    };

    const { x, y } = findFreePosition(2000, 2000);

    const newNode: Node = { 
      id: 'temp-' + Date.now(), 
      title: "New Skill", 
      xp: 100, 
      type: "code", 
      x, 
      y, 
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

  // Title 更新的防抖計時器和最後輸入值追蹤
  const titleUpdateTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastTitleInputRef = useRef<Record<string, string>>({});

  const updateNode = useCallback(async (id: string, updates: Partial<Node>) => {
    // 樂觀更新 UI
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

    // 如果是位置更新，使用批量 API
    if (updates.x !== undefined || updates.y !== undefined) {
      // 延遲批量保存位置更新
      return;
    }

    // 如果是 title 更新，使用防抖延遲保存
    if (updates.title !== undefined) {
      // 記錄最後一次輸入的值
      lastTitleInputRef.current[id] = updates.title;
      
      // 清除之前的計時器
      if (titleUpdateTimerRef.current[id]) {
        clearTimeout(titleUpdateTimerRef.current[id]);
      }
      
      // 設置新的防抖計時器
      titleUpdateTimerRef.current[id] = setTimeout(async () => {
        const titleToSave = lastTitleInputRef.current[id];
        if (!titleToSave) return;
        
        try {
          const response = await fetch(`/api/courses/${courseId}/nodes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: titleToSave })
          });

          if (!response.ok) {
            throw new Error('Failed to update node');
          }

          // 使用 API 返回的數據更新本地狀態（確保與資料庫同步）
          const data = await response.json();
          if (data.node) {
            // 檢查當前輸入框的值是否和我們保存的值一致
            // 如果不一致，說明用戶在我們保存期間又輸入了新值，保留用戶輸入的值
            setNodes(prev => prev.map(n => {
              if (n.id === id) {
                const currentTitle = n.title;
                const savedTitle = lastTitleInputRef.current[id];
                // 如果當前值不等於我們保存的值，說明用戶又輸入了新值，保留當前值
                const finalTitle = (currentTitle !== savedTitle) ? currentTitle : data.node.title;
                return { ...n, ...data.node, title: finalTitle };
              }
              return n;
            }));
          }
        } catch (error) {
          console.error('Error updating node:', error);
          // 不重新載入，避免打斷用戶輸入
        }
      }, 500); // 500ms 防抖
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
        // 合併更新，而不是完全替換
        setNodes(prev => prev.map(n => {
          if (n.id === id) {
            return { ...n, ...data.node };
          }
          return n;
        }));
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
          nodes: validNodes.map(n => ({ 
            nodeId: n.id, 
            x: n.x, 
            y: n.y,
            // 確保這些欄位也包含在內，即使是 undefined 也無妨，後端應該會處理部分更新
            // 但最好只發送 x 和 y，或者確保其他必填欄位存在
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
    // 任何其他操作都應該先取消連線模式
    cancelConnectionMode();

    if (!selectedNodeId) return;

    const nodeId = selectedNodeId;
    
    // 樂觀更新 UI
    setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    
    // Find closest node to switch selection to, instead of closing drawer
    const currentNode = nodes.find(n => n.id === nodeId);
    if (currentNode) {
      let closestNode: Node | null = null;
      let minDistance = Infinity;
      
      nodes.forEach(n => {
        if (n.id === nodeId) return;
        const dx = n.x - currentNode.x;
        const dy = n.y - currentNode.y;
        const dist = dx * dx + dy * dy; // Compare squared distance to save sqrt
        if (dist < minDistance) {
          minDistance = dist;
          closestNode = n;
        }
      });
      
      setSelectedNodeId(closestNode ? (closestNode as Node).id : null);
    } else {
      setSelectedNodeId(null);
    }

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
    // 任何其他操作都應該先取消連線模式
    cancelConnectionMode();

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

  const handleTreeNodeClick = (node: Node) => {
    if (isConnecting && connectSourceId) {
      if (node.id !== connectSourceId) {
        handleConnect(connectSourceId, node.id);
      }
      // Keep the source selected (or clear) instead of selecting the target
      setIsConnecting(false);
      setConnectSourceId(null);
      setSelectedNodeId(connectSourceId);
      return;
    }
    setSelectedNodeId(node.id);
  };

  const startConnection = () => {
    // 如果已經在連線模式，再次點擊則取消
    if (isConnecting) {
      cancelConnectionMode();
      return;
    }

    if (!selectedNodeId) {
      alert('請先選取來源節點，再新增連線。');
      return;
    }
    setIsConnecting(true);
    setConnectSourceId(selectedNodeId);
  };

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
              onClick={addNode} 
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors"
            >
                <Plus size={16} /> Add Node
            </button>
            <button 
              onClick={startConnection}
              disabled={!selectedNodeId && !isConnecting} // 如果正在連線，允許點擊以取消
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                !selectedNodeId && !isConnecting
                  ? 'bg-slate-800/60 text-slate-400 border border-slate-700 cursor-not-allowed'
                  : isConnecting 
                    ? 'bg-emerald-700 text-white border border-emerald-400/50 hover:bg-emerald-600' 
                    : 'bg-emerald-900/60 hover:bg-emerald-700 text-emerald-200 border border-emerald-500/30'
              }`}
            >
                <Link2 size={16} /> {isConnecting ? 'Select target…' : 'Link / Unlink'}
            </button>
            <button 
              disabled={!selectedNodeId} 
              onClick={deleteSelected} 
              className="flex items-center gap-2 px-4 py-1.5 bg-red-900/50 hover:bg-red-600/80 border border-red-500/30 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Trash2 size={16} /> Delete
            </button>
            <div className="h-6 w-[1px] bg-slate-700 mx-1"></div>
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
        </div>
      </header>

      <div className="flex-1 relative flex overflow-hidden">

        {/* The Canvas */}
        <div 
          className={`flex-1 bg-[#0f1115] relative overflow-hidden ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
          style={{ 
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', 
              backgroundSize: '40px 40px',
              transform: selectedNodeId ? `translateX(-${drawerWidth / 2}%)` : 'none',
          }}
        >
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
                onNodeClick={handleTreeNodeClick}
                onBackgroundClick={() => {
                  // 點擊空白處不再關閉抽屜，只在連線模式下取消連線狀態
                  if (isConnecting) {
                    setIsConnecting(false);
                    setConnectSourceId(null);
                  }
                }}
                onNodeDrag={handleNodeDrag}
                scale={selectedNodeId ? Math.max(0.5, 1 - (drawerWidth / 150)) : 1}
                disableTransition={isResizing}
                externalSelectedNodeId={selectedNodeId}
              />
            )}
        </div>

        {/* Lesson Editor Drawer */}
        {selectedNodeId && selectedNode && (
          <LessonEditorDrawer
            courseId={courseId}
            nodeId={selectedNode.id}
            isOpen={!!selectedNodeId}
            onClose={() => setSelectedNodeId(null)}
            initialData={selectedNode}
            onUpdateNode={updateNode}
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

