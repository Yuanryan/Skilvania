"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge, NodeStatus } from '@/types';
import { OrganicNode } from './OrganicNode';
import { TreeBranch } from './TreeBranch';

interface OrganicTreeProps {
  nodes: Node[];
  edges: Edge[];
  completedNodes: Set<string>;
  isCreatorMode: boolean;
  onNodeClick: (node: Node) => void;
  onNodeDrag?: (nodeId: string, x: number, y: number) => void;
  onConnect?: (sourceId: string, targetId: string) => void;
}

export const OrganicTree: React.FC<OrganicTreeProps> = ({
  nodes,
  edges,
  completedNodes,
  isCreatorMode,
  onNodeClick,
  onNodeDrag,
  onConnect
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

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
  const handleMouseDown = (e: React.MouseEvent, node: Node) => {
    if (!isCreatorMode) return;
    e.stopPropagation();
    setDraggingId(node.id);
    isDraggingRef.current = false;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current || !onNodeDrag) return;
    
    isDraggingRef.current = true;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onNodeDrag(draggingId, x, y);
  };

  const handleCanvasMouseUp = () => {
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

  return (
    <div 
      className="relative w-full h-full min-h-[800px] overflow-hidden"
      onMouseUp={handleCanvasMouseUp}
      onMouseMove={handleCanvasMouseMove}
      onClick={() => setSelectedNodeId(null)}
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

      <div className="relative w-full aspect-square max-w-3xl mx-auto mt-10" ref={canvasRef}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid meet">
          
          {/* Root Base Visualization */}
          <path 
            d="M 360 780 Q 400 750 440 780" 
            stroke="#3f3c35" 
            strokeWidth="16" 
            strokeLinecap="round" 
            fill="none" 
            className="opacity-80" 
            filter="url(#roughness-global)"
          />

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

        {nodes.map(node => (
          <OrganicNode 
            key={node.id} 
            node={node} 
            status={getNodeStatus(node.id)} 
            isSelected={selectedNodeId === node.id || (isCreatorMode && draggingId === node.id)}
            isCreatorMode={isCreatorMode}
            onMouseDown={handleMouseDown}
            onClick={handleNodeClick}
          />
        ))}
      </div>
    </div>
  );
};

