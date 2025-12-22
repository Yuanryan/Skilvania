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
  disableTransition = false
}) => {
  const BASE_ZOOM = 0.5;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
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
        // 即使距離小於閾值，也繼續處理（允許初始拖曳），但不會標記為拖曳（避免觸發點擊）
      }
      
      // 一旦開始拖曳（draggingId 存在），就立即更新位置
      // Get container and canvas positions
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 2;
      
      // Calculate mouse position relative to container center
      // Since zoom/pan are removed, the only transform affecting screen space is (scale * BASE_ZOOM).
      // Convert from screen pixels back into the 1600x1600 logical space.
      const effectiveScale = scale * BASE_ZOOM;
      const relativeX = (e.clientX - containerRect.left - containerCenterX) / effectiveScale;
      const relativeY = (e.clientY - containerRect.top - containerCenterY) / effectiveScale;
      
      // Convert to SVG coordinates (0-1600 range), SVG is centered at (0,0) in canvas space
      const x = Math.max(0, Math.min(1600, relativeX + 800));
      const y = Math.max(0, Math.min(1600, relativeY + 800));
  
      onNodeDrag(draggingId, x, y);
      return;
    }
  };

  const handleCanvasMouseUp = () => {
    // 重置拖曳相關狀態
    mouseDownPosRef.current = null;
    setDraggingId(null);
  };

  const handleNodeClick = (node: Node) => {
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
    setSelectedNodeId(null);
    if (onBackgroundClick) {
      onBackgroundClick();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onMouseMove={handleCanvasMouseMove}
      onClick={handleBackgroundClick}
    >
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
            3. INTERNAL CONTENT LAYER (Was Pan/Zoom): 
            Now just holds content centered.
          */}
          <div 
            className="w-full h-full origin-center" 
            ref={canvasRef}
          >
            {/* 
              4. CONTENT CONTAINER: 
              Exactly centered inside the 4000px canvas.
            */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1600px] h-[1600px]">
              {/* Center Crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-50">
                <div className="absolute w-16 h-[1px] bg-slate-400 -translate-x-1/2"></div>
                <div className="absolute h-16 w-[1px] bg-slate-400 -translate-y-1/2"></div>
              </div>

              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" 
                viewBox="0 0 1600 1600" 
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
              <div className="absolute inset-0 w-[1600px] h-[1600px]">
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

