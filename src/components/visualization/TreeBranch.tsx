"use client";

import React from 'react';
import { Node, Edge } from '@/types';

interface TreeBranchProps {
  start: Node;
  end: Node;
  status: 'locked' | 'unlocked' | 'completed';
  isCreatorMode: boolean;
}

const getDelay = (y: number) => {
  const startY = 1500;
  const pxPerSecond = 250;
  return Math.max(0, (startY - y) / pxPerSecond); 
};

export const TreeBranch: React.FC<TreeBranchProps> = ({ start, end, status, isCreatorMode }) => {
  // Cubic Bezier Logic for "Organic Growth"
  const controlPointY = start.y - (start.y - end.y) * 0.5;
  
  const path = `
    M ${start.x} ${start.y} 
    C ${start.x} ${controlPointY}, 
      ${end.x} ${controlPointY}, 
      ${end.x} ${end.y}
  `;

  const normalizeY = Math.max(0, Math.min(1, start.y / 1600)); 
  const thickness = 4 + (normalizeY * 10); 

  const delay = getDelay(start.y);
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
        markerEnd="url(#arrowhead)"
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
        filter="url(#roughness-global)" 
        className="opacity-90"
        style={{
          strokeDasharray: length,
          strokeDashoffset: length,
          animation: `growBranch 2s ease-out forwards`,
          animationDelay: `${delay}s`,
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
             animationDelay: `${delay}s`
          }}
          className="opacity-80 mix-blend-screen"
        />
      )}
    </g>
  );
};
