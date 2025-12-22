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
  scale?: number;
  disableTransition?: boolean;
}

export const OrganicTree: React.FC<OrganicTreeProps> = ({
  nodes,
  edges,
  completedNodes,
  isCreatorMode,
  onNodeClick,
  onNodeDrag,
  onConnect,
  scale = 1,
  disableTransition = false
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Pan and Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const hasPannedRef = useRef(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  
  // 記錄 mousedown 時的滑鼠位置，用於區分點擊和拖曳
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
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

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Don't pan if dragging a node (shouldn't happen due to stopPropagation in handleNodeMouseDown, but just in case)
    if (draggingId) return;
    // Only left click
    if (e.button !== 0) return;

    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    hasPannedRef.current = false;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // 1. Handle Node Dragging (Creator Mode)
    if (draggingId && canvasRef.current && onNodeDrag) {
      // 檢查是否真的在拖曳（移動距離超過閾值）
      if (mouseDownPosRef.current) {
        const dx = e.clientX - mouseDownPosRef.current.x;
        const dy = e.clientY - mouseDownPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 只有移動距離超過閾值才視為拖曳
        if (distance < DRAG_THRESHOLD) {
          return; // 移動距離太小，不視為拖曳
        }
      }
      
      isDraggingRef.current = true;
      
      // Get container and canvas positions
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 2;
      
      // Calculate mouse position relative to container center, then account for pan and zoom
      const relativeX = (e.clientX - containerRect.left - containerCenterX - pan.x) / zoom;
      const relativeY = (e.clientY - containerRect.top - containerCenterY - pan.y) / zoom;
      
      // Convert to SVG coordinates (0-800 range), SVG is centered at (0,0) in canvas space
      const x = Math.max(0, Math.min(800, relativeX + 400));
      const y = Math.max(0, Math.min(800, relativeY + 400));
  
      onNodeDrag(draggingId, x, y);
      return;
    }

    // 2. Handle Canvas Panning
    if (isPanning) {
      e.preventDefault(); // Prevent text selection etc.
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasPannedRef.current = true;
      }

      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasMouseUp = () => {
    // 重置拖曳相關狀態
    mouseDownPosRef.current = null;
    setDraggingId(null);
    setIsPanning(false);
  };

  const handleNodeClick = (node: Node) => {
    // Prevent click if we were panning
    if (hasPannedRef.current) return;

    if (isCreatorMode) {
        if (!isDraggingRef.current) {
            // If we were already selecting a node, maybe we want to connect them?
            if (selectedNodeId && selectedNodeId !== node.id && onConnect) {
                onConnect(selectedNodeId, node.id);
            } else {
                setSelectedNodeId(node.id);
            }
            onNodeClick(node);
        }
    } else {
        setSelectedNodeId(node.id);
        onNodeClick(node);
    }
  };

  const handleBackgroundClick = () => {
    if (!hasPannedRef.current) {
        setSelectedNodeId(null);
    }
  };

  // --- ZOOM HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (!containerRef.current || !canvasRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Zoom factor
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(3, zoom * zoomFactor));
    
    // Calculate container center
    const containerCenterX = containerRect.width / 2;
    const containerCenterY = containerRect.height / 2;
    
    // Calculate the point in the canvas before zoom
    const canvasX = (mouseX - containerCenterX - pan.x) / zoom;
    const canvasY = (mouseY - containerCenterY - pan.y) / zoom;
    
    // Calculate new pan to keep the same point under the mouse
    const newPanX = mouseX - containerCenterX - canvasX * newZoom;
    const newPanY = mouseY - containerCenterY - canvasY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleCenter = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };


  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden cursor-grab ${isPanning ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleCanvasMouseDown}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onMouseMove={handleCanvasMouseMove}
      onClick={handleBackgroundClick}
      onWheel={handleWheel}
    >
      {/* Zoom Controls */}
      <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2">
        <button
          onClick={handleCenter}
          className="p-3 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl text-white hover:bg-slate-800 transition-colors shadow-lg"
          title="Center Tree"
        >
          <Locate size={20} />
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
            transform: `scale(${scale})` 
          }}
        >
          {/* 
            3. INTERNAL PAN/ZOOM LAYER: 
            Handles user interaction (drag and scroll zoom).
          */}
          <div 
            className="w-full h-full origin-center will-change-transform" 
            ref={canvasRef}
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* 
              4. CONTENT CONTAINER: 
              Exactly centered inside the 4000px canvas.
            */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" 
                viewBox="0 0 800 800" 
                preserveAspectRatio="xMidYMid meet"
              >
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
              <div className="absolute inset-0 w-[800px] h-[800px]">
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

