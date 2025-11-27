"use client";

import React, { useState, useMemo } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { OrganicTree } from '@/components/visualization/OrganicTree';
import { Node, Edge } from '@/types';
import { BookOpen, CheckCircle, Sparkles, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// --- MOCK DATA (Same as initial mock for now) ---
const INITIAL_NODES: Node[] = [
  { id: '1', title: "HTML Roots",       xp: 100, type: "theory", x: 400, y: 700, iconName: 'Globe' },
  { id: '2', title: "CSS Trunk",        xp: 150, type: "theory", x: 400, y: 550, iconName: 'Layout' },
  { id: '3', title: "JS Logic",         xp: 300, type: "code",   x: 250, y: 450, iconName: 'Code' },
  { id: '4', title: "Responsive UI",    xp: 200, type: "code",   x: 550, y: 450, iconName: 'BookOpen' },
  { id: '5', title: "React Bloom",      xp: 500, type: "code",   x: 180, y: 300, iconName: 'Cpu' },
  { id: '6', title: "Node Backend",     xp: 450, type: "code",   x: 620, y: 300, iconName: 'Server' },
  { id: '7', title: "Database Fruit",   xp: 400, type: "theory", x: 500, y: 200, iconName: 'Database' },
  { id: '8', title: "Capstone Crown",   xp: 1000, type: "project", x: 400, y: 100, iconName: 'Trophy' },
];

const INITIAL_EDGES: Edge[] = [
  { from: '1', to: '2', id: 'e1' },
  { from: '2', to: '3', id: 'e2' },
  { from: '2', to: '4', id: 'e3' },
  { from: '3', to: '5', id: 'e4' },
  { from: '4', to: '6', id: 'e5' },
  { from: '6', to: '7', id: 'e6' },
  { from: '5', to: '8', id: 'e7' },
  { from: '7', to: '8', id: 'e8' },
];

export default function TreePage() {
  const params = useParams();
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set(['1']));
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Mock "Learning" Action
  const handleCompleteNode = (nodeId: string) => {
    setCompletedNodes(prev => {
        const newSet = new Set(prev);
        newSet.add(nodeId);
        return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col overflow-hidden">
      <Navbar />
      
      <div className="flex-1 relative">
        {/* The Tree Canvas */}
        <OrganicTree 
          nodes={INITIAL_NODES}
          edges={INITIAL_EDGES}
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
                  This node represents a key milestone in your journey. Complete the objectives to graft this knowledge onto your skill tree.
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

