import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BookOpen, Code, Trophy, CheckCircle, Cpu, Globe, Database, Layout, Server, Sparkles, Leaf, Plus, Move, GitBranch, Trash2, Edit3, Save, Map } from 'lucide-react';

// --- INITIAL MOCK DATA ---

const INITIAL_USER = {
  id: 1,
  username: "ForestWalker",
  level: 4,
  xp: 1250,
  nextLevelXp: 2000,
};

const COURSE_INFO = {
  id: 101,
  title: "Full Stack Web Developer",
  description: "Cultivate your skills in the forests of code.",
  totalNodes: 8,
};

const INITIAL_NODES = [
  { id: 1, title: "HTML Roots",       xp: 100, type: "theory", x: 400, y: 750, icon: Globe },
  { id: 2, title: "CSS Trunk",        xp: 150, type: "theory", x: 400, y: 620, icon: Layout },
  { id: 3, title: "JS Logic",         xp: 300, type: "code",   x: 250, y: 500, icon: Code },
  { id: 4, title: "Responsive UI",    xp: 200, type: "code",   x: 550, y: 500, icon: BookOpen },
  { id: 5, title: "React Bloom",      xp: 500, type: "code",   x: 180, y: 350, icon: Cpu },
  { id: 6, title: "Node Backend",     xp: 450, type: "code",   x: 620, y: 350, icon: Server },
  { id: 7, title: "Database Fruit",   xp: 400, type: "theory", x: 500, y: 220, icon: Database },
  { id: 8, title: "Capstone Crown",   xp: 1000, type: "project", x: 400, y: 120, icon: Trophy },
];

const INITIAL_EDGES = [
  { from: 1, to: 2, id: 'e1' },
  { from: 2, to: 3, id: 'e2' },
  { from: 2, to: 4, id: 'e3' },
  { from: 3, to: 5, id: 'e4' },
  { from: 4, to: 6, id: 'e5' },
  { from: 6, to: 7, id: 'e6' },
  { from: 5, to: 8, id: 'e7' },
  { from: 7, to: 8, id: 'e8' },
];

// --- HELPERS ---

const getDelay = (y) => {
  const startY = 750;
  const pxPerSecond = 250;
  return Math.max(0, (startY - y) / pxPerSecond); 
};

// --- COMPONENTS ---

const OrganicNode = ({ node, status, onClick, isSelected, isCreatorMode, onMouseDown }) => {
  const Icon = node.icon || Code; // Fallback icon
  const animDelay = `${getDelay(node.y) + 0.5}s`;

  const statusStyles = {
    locked: "bg-slate-900/80 border-slate-700 text-slate-600 scale-90 grayscale",
    unlocked: "bg-slate-900 border-emerald-500 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse hover:scale-110 cursor-pointer",
    completed: "bg-emerald-900 border-emerald-400 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-110 cursor-pointer",
    creator: "bg-slate-800 border-slate-500 text-slate-300 hover:border-white cursor-move hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
  };

  let currentStyle = statusStyles[status] || statusStyles.locked;
  if (isCreatorMode) currentStyle = statusStyles.creator;

  // Selection glow logic
  const selectedStyle = isSelected 
    ? (isCreatorMode ? "ring-2 ring-white scale-110 z-30" : "ring-4 ring-emerald-100/20 scale-125 z-30") 
    : "z-20";

  return (
    <div 
      className={`absolute w-16 h-16 -ml-8 -mt-8 rounded-full border-[3px] flex items-center justify-center transition-transform duration-200 ease-out backdrop-blur-sm ${currentStyle} ${selectedStyle}`}
      style={{ 
        left: node.x, 
        top: node.y,
        // Only animate entry in learner mode to avoid jumpiness in editor
        animation: !isCreatorMode ? `bloom 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards` : 'none',
        animationDelay: !isCreatorMode ? animDelay : '0s',
        opacity: isCreatorMode ? 1 : 0, 
        transform: isCreatorMode ? 'scale(1)' : 'scale(0)'
      }}
      onMouseDown={(e) => {
        if (isCreatorMode) {
          onMouseDown(e, node);
        }
      }}
      onClick={(e) => {
        e.stopPropagation(); // Prevent canvas click
        onClick(node);
      }}
    >
      <Icon size={28} strokeWidth={2} />
      
      {/* Decorative Leaf for unlocked nodes in Learner Mode */}
      {!isCreatorMode && status !== 'locked' && (
        <div className="absolute -top-2 -right-2 text-emerald-500 animate-bounce" style={{ animationDuration: '3s' }}>
          <Leaf size={12} fill="currentColor" />
        </div>
      )}

      {!isCreatorMode && status === 'completed' && (
        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-900 rounded-full p-0.5 border-2 border-slate-900 z-10">
          <CheckCircle size={12} fill="currentColor" />
        </div>
      )}

      {/* Creator Mode: Drag Handle visual cue */}
      {isCreatorMode && isSelected && (
        <div className="absolute -bottom-6 bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full opacity-80 pointer-events-none whitespace-nowrap">
          Drag to move
        </div>
      )}
    </div>
  );
};

const TreeBranch = ({ start, end, status, isCreatorMode }) => {
  // Cubic Bezier Logic for "Organic Growth"
  const controlPointY = start.y - (start.y - end.y) * 0.5;
  
  const path = `
    M ${start.x} ${start.y} 
    C ${start.x} ${controlPointY}, 
      ${end.x} ${controlPointY}, 
      ${end.x} ${end.y}
  `;

  const normalizeY = Math.max(0, Math.min(1, start.y / 800)); 
  const thickness = 4 + (normalizeY * 10); 

  const delay = `${getDelay(start.y)}s`;
  const length = 500; 

  // In Creator Mode, we want solid lines that update instantly, no fancy growth animation
  if (isCreatorMode) {
    return (
      <path 
        d={path} 
        stroke="#475569" 
        strokeWidth={thickness} 
        strokeLinecap="round" 
        fill="none" 
        className="opacity-50"
      />
    );
  }

  // Learner Mode: Full Animation
  return (
    <g>
      {/* The "Bark" */}
      <path 
        d={path} 
        stroke="#3f3c35" 
        strokeWidth={thickness} 
        strokeLinecap="round"
        fill="none" 
        filter="url(#roughness)" 
        className="opacity-90"
        style={{
          strokeDasharray: length,
          strokeDashoffset: length,
          animation: `growBranch 2s ease-out forwards`,
          animationDelay: delay,
        }}
      />
      
      {/* The "Energy" */}
      {(status === 'completed' || status === 'unlocked') && (
        <path 
          d={path} 
          stroke={status === 'completed' ? "#10b981" : "#059669"} 
          strokeWidth={thickness / 2.5} 
          strokeLinecap="round"
          fill="none" 
          style={{
             strokeDasharray: length,
             strokeDashoffset: length,
             animation: `growBranch 2s ease-out forwards`,
             animationDelay: delay
          }}
          className="opacity-80 mix-blend-screen"
        />
      )}
    </g>
  );
};

const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
  <div className="relative overflow-hidden bg-slate-900/60 border border-slate-700/50 p-4 rounded-xl backdrop-blur-md group hover:bg-slate-800/60 transition-all duration-300">
    <div className={`absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 text-${color}-500`}>
      <Icon size={100} />
    </div>
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg bg-${color}-500/20 text-${color}-400`}>
        <Icon size={20} />
      </div>
      <span className="text-slate-300 text-sm font-medium">{label}</span>
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    {subtext && <div className="text-xs text-slate-400 mt-1">{subtext}</div>}
  </div>
);

export default function SkilvaniaApp() {
  // --- STATE ---
  const [isCreatorMode, setIsCreatorMode] = useState(false);
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(INITIAL_EDGES);
  
  const [user, setUser] = useState(INITIAL_USER);
  const [completedNodes, setCompletedNodes] = useState(new Set([1])); 
  const [selectedNode, setSelectedNode] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Drag State
  const [draggingId, setDraggingId] = useState(null);
  const isDraggingRef = useRef(false); // Track if we are actually dragging vs just clicking
  const canvasRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);
  
  // --- LEARNER LOGIC ---
  const nodeStatuses = useMemo(() => {
    const statuses = {};
    nodes.forEach(node => {
      if (completedNodes.has(node.id)) {
        statuses[node.id] = 'completed';
      } else {
        const prerequisites = edges.filter(e => e.to === node.id).map(e => e.from);
        const allPrereqsMet = prerequisites.length === 0 || prerequisites.every(id => completedNodes.has(id));
        statuses[node.id] = allPrereqsMet ? 'unlocked' : 'locked';
      }
    });
    return statuses;
  }, [completedNodes, nodes, edges]);

  const handleCompleteTask = (node) => {
    const newXp = user.xp + node.xp;
    let newLevel = user.level;
    if (newXp >= user.nextLevelXp) newLevel++;
    setUser({ ...user, xp: newXp, level: newLevel });
    setCompletedNodes(prev => new Set([...prev, node.id]));
    setTimeout(() => setSelectedNode(null), 500);
  };

  // --- CREATOR LOGIC ---

  const handleMouseDown = (e, node) => {
    if (!isCreatorMode) return;
    e.stopPropagation();
    setDraggingId(node.id);
    isDraggingRef.current = false; // Reset drag status
    // Important: We DO NOT select the node here. We wait for click.
    // This fixes the "linking" issue where source node was immediately deselected.
  };

  const handleCanvasMouseMove = (e) => {
    if (!draggingId || !canvasRef.current) return;
    
    isDraggingRef.current = true; // We are now officially dragging
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update node position
    setNodes(prev => prev.map(n => 
      n.id === draggingId ? { ...n, x, y } : n
    ));
  };

  const handleCanvasMouseUp = () => {
    setDraggingId(null);
  };

  const addNode = () => {
    const newId = Math.max(...nodes.map(n => n.id)) + 1;
    const newNode = { 
      id: newId, 
      title: "New Skill", 
      xp: 100, 
      type: "code", 
      x: 400, 
      y: 400, 
      icon: Code 
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
  };

  const deleteSelected = () => {
    if (!selectedNode) return;
    // Remove edges connected to this node
    setEdges(prev => prev.filter(e => e.from !== selectedNode.id && e.to !== selectedNode.id));
    // Remove node
    setNodes(prev => prev.filter(n => n.id !== selectedNode.id));
    setSelectedNode(null);
  };

  const handleConnect = (targetNode) => {
    // If nothing selected, select this one
    if (!selectedNode) {
        setSelectedNode(targetNode);
        return;
    }

    // If clicking itself, just select it (or keep selected)
    if (selectedNode.id === targetNode.id) {
        setSelectedNode(targetNode);
        return;
    }

    // Toggle connection
    const existingEdge = edges.find(e => e.from === selectedNode.id && e.to === targetNode.id);
    if (existingEdge) {
        setEdges(prev => prev.filter(e => e.id !== existingEdge.id));
    } else {
        setEdges(prev => [...prev, { from: selectedNode.id, to: targetNode.id, id: `e-${Date.now()}` }]);
    }
    // Don't change selection, allows multiple child connections
  };

  return (
    <div 
      className="min-h-screen bg-[#0f1115] text-slate-200 font-sans overflow-hidden selection:bg-emerald-500/30 flex flex-col"
      onMouseUp={handleCanvasMouseUp}
      onMouseMove={handleCanvasMouseMove}
    >
      
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f1115] to-black"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-emerald-950/30 to-transparent"></div>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: isCreatorMode ? '40px 40px' : '60px 60px' }}></div>
      </div>

      {/* Navbar */}
      <nav className="relative border-b border-white/5 bg-black/20 backdrop-blur-md z-50 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600/20 p-1.5 rounded-lg border border-emerald-500/30">
            <Sparkles className="text-emerald-400" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-200">Skil<span className="text-emerald-500">vania</span></span>
        </div>

        {/* CREATOR MODE TOGGLE */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex bg-slate-900 p-1 rounded-lg border border-slate-700">
          <button 
            onClick={() => setIsCreatorMode(false)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${!isCreatorMode ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Map size={14} /> Explorer
          </button>
          <button 
            onClick={() => setIsCreatorMode(true)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${isCreatorMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Edit3 size={14} /> Architect
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          {!isCreatorMode && (
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Lvl {user.level} Druid</div>
                <div className="text-emerald-400 font-bold">{user.xp} XP</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-white font-bold shadow-lg">
                {user.username[0]}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="flex-1 relative overflow-hidden flex">
        
        {/* CREATOR TOOLBAR (Floating) */}
        {isCreatorMode && (
          <div className="absolute top-6 left-6 z-40 flex flex-col gap-2">
             <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur w-64">
               <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Edit3 size={16} /> Toolbox</h3>
               <div className="grid grid-cols-2 gap-2">
                 <button onClick={addNode} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors">
                   <Plus size={20} /> Add Node
                 </button>
                 <button disabled={!selectedNode} onClick={deleteSelected} className="bg-red-900/50 hover:bg-red-600/80 border border-red-500/30 text-white p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                   <Trash2 size={20} /> Delete
                 </button>
               </div>
               <div className="mt-4 text-xs text-slate-400">
                 <p>1. Drag nodes to move</p>
                 <p>2. Click to select</p>
                 <p>3. Click another node to link/unlink</p>
               </div>
             </div>

             {selectedNode && (
               <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur w-64 animate-slideIn">
                 <h3 className="text-white font-bold mb-2 text-sm">Node Properties</h3>
                 <div className="space-y-2">
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-bold">Title</label>
                      <input 
                        value={selectedNode.title} 
                        onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? {...n, title: e.target.value} : n))}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-bold">XP Reward</label>
                      <input 
                        type="number"
                        value={selectedNode.xp} 
                        onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? {...n, xp: parseInt(e.target.value)} : n))}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                 </div>
               </div>
             )}
          </div>
        )}

        {/* LEARNER SIDEBAR */}
        {!isCreatorMode && (
          <div className="w-80 lg:w-96 bg-slate-900/40 backdrop-blur-md border-r border-white/5 p-6 z-10 flex flex-col gap-6 h-[calc(100vh-64px)]">
            <div>
              <div className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-2">Active Quest</div>
              <h1 className="text-3xl font-bold text-white mb-2 leading-tight">{COURSE_INFO.title}</h1>
              <p className="text-slate-400 text-sm">{COURSE_INFO.description}</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <StatCard icon={CheckCircle} label="Growth" value={`${Math.round((completedNodes.size / nodes.length) * 100)}%`} subtext={`${completedNodes.size}/${nodes.length} Branches`} color="emerald"/>
              <StatCard icon={Trophy} label="Wisdom" value={user.xp} color="amber"/>
            </div>
          </div>
        )}

        {/* THE CANVAS */}
        <div className="flex-1 relative overflow-hidden cursor-default" onClick={() => setSelectedNode(null)}>
          
          {/* Creator Grid Background */}
          {isCreatorMode && (
            <div className="absolute inset-0 pointer-events-none" style={{ 
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }}></div>
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            <svg style={{ position: 'absolute', width: 0, height: 0 }}><defs><filter id="roughness"><feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="5" /></filter></defs></svg>

            <div className="relative w-full h-full max-w-4xl mx-auto mt-20" ref={canvasRef}>
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                {/* Root Base */}
                <path d="M 360 780 Q 400 750 440 780" stroke="#3f3c35" strokeWidth="16" strokeLinecap="round" fill="none" className="opacity-80" filter="url(#roughness)"/>

                {mounted && edges.map((edge) => {
                  const startNode = nodes.find(n => n.id === edge.from);
                  const endNode = nodes.find(n => n.id === edge.to);
                  if (!startNode || !endNode) return null;

                  let status = 'locked';
                  if (completedNodes.has(edge.from) && completedNodes.has(edge.to)) status = 'completed';
                  else if (completedNodes.has(edge.from)) status = 'unlocked';

                  return <TreeBranch key={edge.id} start={startNode} end={endNode} status={status} isCreatorMode={isCreatorMode} />;
                })}
              </svg>

              {mounted && nodes.map(node => (
                <OrganicNode 
                  key={node.id} 
                  node={node} 
                  status={nodeStatuses[node.id]} 
                  isSelected={selectedNode?.id === node.id || (isCreatorMode && draggingId === node.id)}
                  isCreatorMode={isCreatorMode}
                  onMouseDown={handleMouseDown}
                  onClick={(clickedNode) => {
                     if (isCreatorMode) {
                        if (!isDraggingRef.current) handleConnect(clickedNode);
                     } else {
                        setSelectedNode(clickedNode);
                     }
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* LEARNER TASK OVERLAY */}
        {!isCreatorMode && selectedNode && (
          <div className="absolute right-0 top-0 bottom-0 w-[500px] bg-[#0f1115]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl p-8 flex flex-col animate-slideIn z-40">
            <button onClick={() => setSelectedNode(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">✕</button>
            
            <div className="flex items-center gap-5 mb-8 mt-4">
              <div className={`p-5 rounded-2xl shadow-inner border border-white/5 ${completedNodes.has(selectedNode.id) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                <selectedNode.icon size={32} />
              </div>
              <div>
                <h2 className="font-bold text-3xl text-white leading-tight mb-1">{selectedNode.title}</h2>
                <div className="text-xs text-slate-400 uppercase tracking-widest font-bold flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${completedNodes.has(selectedNode.id) ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {selectedNode.type} Node
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="prose prose-invert prose-lg">
                <p className="text-slate-300 leading-relaxed">
                  Quest: <strong>{selectedNode.title}</strong>. Absorb knowledge to unlock higher canopies.
                </p>
                <div className="my-8 bg-[#1a1d24] rounded-2xl p-6 border border-white/5">
                  <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide flex items-center gap-2"><BookOpen size={16} className="text-emerald-500"/> Objectives</h4>
                  <ul className="space-y-4 text-slate-300 list-none pl-0">
                    <li className="flex gap-4 items-start"><div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold">1</div><span className="mt-0.5">Read Documentation</span></li>
                    <li className="flex gap-4 items-start"><div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold">2</div><span className="mt-0.5">Complete Quiz</span></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              {completedNodes.has(selectedNode.id) ? (
                <button disabled className="w-full bg-emerald-900/20 border border-emerald-500/20 text-emerald-400 py-4 rounded-xl flex items-center justify-center gap-3 font-bold cursor-default">
                  <CheckCircle size={18} /> Knowledge Absorbed
                </button>
              ) : (
                <button onClick={() => handleCompleteTask(selectedNode)} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-orange-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 group">
                  <Sparkles size={20} className="group-hover:animate-spin" /> <span>Claim {selectedNode.xp} XP</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      <style jsx global>{`
        @keyframes growBranch { from { stroke-dashoffset: 500; } to { stroke-dashoffset: 0; } }
        @keyframes bloom { 0% { transform: scale(0); opacity: 0; } 70% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        .animate-slideIn { animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}