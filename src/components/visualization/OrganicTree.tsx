"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge, NodeStatus } from '@/types';
import { OrganicNode } from './OrganicNode';
import { TreeBranch } from './TreeBranch';
import { Locate } from 'lucide-react';

interface OrganicTreeProps {
  nodes: Node[];
  edges: Edge[];
  completedNodes: Set<string>;
  isCreatorMode: boolean;
  onNodeClick: (node: Node) => void;
  onNodeDrag?: (nodeId: string, x: number, y: number) => void;
  onConnect?: (sourceId: string, targetId: string) => void;
  onBackgroundClick?: () => void;
  scale?: number;
  disableTransition?: boolean;
  /**
   * If provided, external selection state can be synced.
   * When absent, OrganicTree manages its own selection state.
   */
  externalSelectedNodeId?: string | null;
}

export const OrganicTree: React.FC<OrganicTreeProps> = ({
  nodes,
  edges,
  completedNodes,
  isCreatorMode,
  onNodeClick,
  onNodeDrag,
  onConnect,
  onBackgroundClick,
  scale = 1,
  disableTransition = false,
  externalSelectedNodeId = null
}) => {
  const BASE_ZOOM = 0.5;
  const isControlledSelection = externalSelectedNodeId !== null;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  
  // 記錄 mousedown 時的滑鼠位置，用於區分點擊和拖曳
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 5; // 移動超過 5px 才視為拖曳

  // --- NODE STATUS LOGIC ---
  const getNodeStatus = (nodeId: string): NodeStatus => {
    if (completedNodes.has(nodeId)) return 'completed';
    
    // Find all prerequisites (nodes that point TO this node)
    const prerequisites = edges.filter(e => e.to === nodeId).map(e => e.from);
    
    // If no prereqs, it's unlocked. If all prereqs are completed, it's unlocked.
    const allPrereqsMet = prerequisites.length === 0 || prerequisites.every(id => completedNodes.has(id));
    
    return allPrereqsMet ? 'unlocked' : 'locked';
  };

  // --- DRAG HANDLERS ---
  const handleNodeMouseDown = (e: React.MouseEvent, node: Node) => {
    if (!isCreatorMode) return;
    e.stopPropagation();
    
    // 記錄 mousedown 時的滑鼠位置
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    setDraggingId(node.id);
    isDraggingRef.current = false;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // 1. Handle Node Dragging (Creator Mode)
    if (draggingId && canvasRef.current && onNodeDrag) {
      if (!containerRef.current) return;
      
      // 檢查移動距離以區分點擊和拖曳
      if (mouseDownPosRef.current) {
        const dx = e.clientX - mouseDownPosRef.current.x;
        const dy = e.clientY - mouseDownPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 只有移動距離超過閾值才標記為真正的拖曳（避免誤觸點擊）
        if (distance >= DRAG_THRESHOLD) {
          isDraggingRef.current = true;
        }
      }
      
      // Get container and canvas positions
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 2;
      
      // Calculate mouse position relative to container center
      // Account for external scale, internal pan, and internal zoom
      const externalScale = scale * BASE_ZOOM;
      const totalScale = externalScale * zoom;
      
      const relativeX = (e.clientX - containerRect.left - containerCenterX) / totalScale - pan.x;
      const relativeY = (e.clientY - containerRect.top - containerCenterY) / totalScale - pan.y;
      
      // Convert to SVG coordinates (0-4000 range), SVG is centered at (0,0) in canvas space
      const x = Math.max(0, Math.min(4000, relativeX + 2000));
      const y = Math.max(0, Math.min(4000, relativeY + 2000));
  
      onNodeDrag(draggingId, x, y);
      return;
    }

    // 2. Handle Panning
    if (isPanning && lastMousePosRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      
      const externalScale = scale * BASE_ZOOM;
      // We divide by externalScale because pan is applied inside the external scale layer
      setPan(prev => ({
        x: prev.x + dx / (externalScale * zoom),
        y: prev.y + dy / (externalScale * zoom)
      }));
      
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      
      // If we move enough, mark as dragging to prevent background click
      if (mouseDownPosRef.current) {
        const totalDx = e.clientX - mouseDownPosRef.current.x;
        const totalDy = e.clientY - mouseDownPosRef.current.y;
        if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > DRAG_THRESHOLD) {
          isDraggingRef.current = true;
        }
      }
    }
  };

  const handleCanvasMouseUp = () => {
    // 重置拖曳相關狀態
    mouseDownPosRef.current = null;
    lastMousePosRef.current = null;
    setDraggingId(null);
    setIsPanning(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    
    // If we're not clicking on a node (stopped propagation), start panning
    setIsPanning(true);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Standard wheel zoom logic
    const delta = -e.deltaY;
    const factor = Math.pow(1.1, delta / 100);
    const newZoom = Math.min(Math.max(zoom * factor, 0.1), 5);
    
    setZoom(newZoom);
  };

  const handleNodeClick = (node: Node) => {
    if (isCreatorMode) {
      if (!isDraggingRef.current) {
        // Creator mode: only select; connection is handled by parent explicitly.
        if (!isControlledSelection) {
          setSelectedNodeId(node.id);
        }
        onNodeClick(node);
      }
    } else {
      if (!isControlledSelection) {
        setSelectedNodeId(node.id);
      }
      onNodeClick(node);
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // If we were just dragging or panning, don't trigger background click
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }

    if (!isControlledSelection) {
      setSelectedNodeId(null);
    }
    if (onBackgroundClick) {
      onBackgroundClick();
    }
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  // Sync selection when external selection changes
  useEffect(() => {
    if (isControlledSelection) {
      setSelectedNodeId(externalSelectedNodeId ?? null);
    }
  }, [externalSelectedNodeId]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onMouseMove={handleCanvasMouseMove}
      onClick={handleBackgroundClick}
      onWheel={handleWheel}
    >
      {/* Reset View Button */}
      <div className="absolute bottom-6 right-6 z-40 flex flex-col gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetView();
          }}
          className="p-3 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-lg group"
          title="Reset View"
        >
          <Locate size={20} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* SVG Filter for Organic Roughness (Hidden, but defined globally for reference if needed outside this SVG context) */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="roughness-global">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
          </filter>
        </defs>
      </svg>

      {/* 
        1. ROOT WRAPPER: 
        Positioned at screen center. We give it a small size so it has a valid 'center' point.
      */}
      <div className="absolute top-1/2 left-1/2 w-1 h-1">
        
        {/* 
          2. EXTERNAL SCALE LAYER: 
          Handles the smooth "zoom to node" transitions. 
          We make it 4000px wide so the 'origin-center' is stable.
        */}
        <div 
          className={`absolute origin-center will-change-transform ${disableTransition ? '' : 'transition-transform duration-500 '}`}
          style={{ 
            width: '4000px',
            height: '4000px',
            left: '-2000px', // Perfectly centers the 4000px box on the screen
            top: '-2000px',
            transform: `scale(${scale * BASE_ZOOM})` 
          }}
        >
          {/* 
            3. INTERNAL CONTENT LAYER: 
            Handles manual pan and zoom.
          */}
          <div 
            className="w-full h-full origin-center will-change-transform" 
            ref={canvasRef}
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`
            }}
          >
            {/* 
              4. CONTENT CONTAINER: 
              Exactly centered inside the 4000px canvas.
            */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[4000px] h-[4000px]">
              {/* Center Crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-50">
                <div className="absolute w-16 h-[1px] bg-slate-400 -translate-x-1/2"></div>
                <div className="absolute h-16 w-[1px] bg-slate-400 -translate-y-1/2"></div>
              </div>

              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" 
                viewBox="0 0 4000 4000" 
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="12"
                    markerHeight="12"
                    refX="48"
                    refY="6"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M0,2 L12,6 L0,10" fill="#475569" />
                  </marker>
                </defs>
                {edges.map((edge) => {
                  const startNode = nodes.find(n => n.id === edge.from);
                  const endNode = nodes.find(n => n.id === edge.to);
                  if (!startNode || !endNode) return null;

                  let status: 'locked' | 'unlocked' | 'completed' = 'locked';
                  if (completedNodes.has(edge.from) && completedNodes.has(edge.to)) status = 'completed';
                  else if (completedNodes.has(edge.from)) status = 'unlocked';

                  return (
                    <TreeBranch 
                      key={edge.id} 
                      start={startNode} 
                      end={endNode} 
                      status={status} 
                      isCreatorMode={isCreatorMode} 
                    />
                  );
                })}
              </svg>

              {/* Nodes Container */}
              <div className="absolute inset-0 w-[4000px] h-[4000px]">
                {nodes.map(node => (
                  <OrganicNode 
                    key={node.id} 
                    node={node} 
                    status={getNodeStatus(node.id)} 
                    isSelected={selectedNodeId === node.id || (isCreatorMode && draggingId === node.id)}
                    isCreatorMode={isCreatorMode}
                    onMouseDown={handleNodeMouseDown}
                    onClick={handleNodeClick}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

