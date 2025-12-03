"use client";

import React, { useState } from 'react';
import { OrganicTree } from '@/components/visualization/OrganicTree';
import { Node, Edge } from '@/types';
import { Save, Plus, Trash2, Edit3, ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CreatorEditorPage() {
  const params = useParams();
  
  // --- STATE ---
  const [nodes, setNodes] = useState<Node[]>([
    { id: '1', title: "Start Here", xp: 100, type: "theory", x: 400, y: 700, iconName: 'Globe' }
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // --- ACTIONS ---

  const addNode = () => {
    const newId = (Math.max(0, ...nodes.map(n => parseInt(n.id))) + 1).toString();
    const newNode: Node = { 
      id: newId, 
      title: "New Skill", 
      xp: 100, 
      type: "code", 
      x: 400, 
      y: 400, 
      iconName: 'Code' 
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const updateNode = (id: string, updates: Partial<Node>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteSelected = () => {
    if (!selectedNodeId) return;
    setEdges(prev => prev.filter(e => e.from !== selectedNodeId && e.to !== selectedNodeId));
    setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const handleConnect = (sourceId: string, targetId: string) => {
     // Toggle connection
     const existingEdge = edges.find(e => e.from === sourceId && e.to === targetId);
     if (existingEdge) {
         setEdges(prev => prev.filter(e => e.id !== existingEdge.id));
     } else {
         // Prevent cycles? For now, let's just allow it.
         setEdges(prev => [...prev, { id: `e-${Date.now()}`, from: sourceId, to: targetId }]);
     }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      
      {/* Creator Navbar */}
      <header className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-white">
                <ArrowLeft size={20} />
            </Link>
            <span className="font-bold text-white">Course Editor</span>
            <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">Draft Mode</span>
        </div>
        <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors">
                <Save size={16} /> Save Tree
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
                        onChange={(e) => updateNode(selectedNode.id, { type: e.target.value as any })}
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
            <OrganicTree 
              nodes={nodes}
              edges={edges}
              completedNodes={new Set()} // Creator mode ignores completed status
              isCreatorMode={true}
              onNodeClick={(node) => setSelectedNodeId(node.id)}
              onNodeDrag={(id, x, y) => updateNode(id, { x, y })}
              onConnect={handleConnect}
            />
        </div>

      </div>
    </div>
  );
}

