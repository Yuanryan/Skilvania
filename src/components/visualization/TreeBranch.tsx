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
  const length = 3000; 

  // In Creator Mode, we want solid lines that update instantly, no fancy growth animation
  if (isCreatorMode) {
    // Use the completed palette for creator mode to mirror finished-state styling
    return (
      <g>
        
        <path 
          d={path} 
          stroke="#10b981" 
          strokeWidth={thickness} 
          strokeLinecap="round" 
          fill="none" 
          className="opacity-80"
        />
        {/* The "Flow Pulse" for Creator Mode - Shows direction without growth animation */}
        <path 
          d={path} 
          stroke="#a7f3d0" 
          strokeWidth={thickness * 0.6} 
          strokeLinecap="round" 
          fill="none" 
          style={{
             strokeDasharray: `100 1400`, 
             animation: `growBranch 3.5s linear infinite`,
          }}
          className="opacity-40 blur-[1px] mix-blend-plus-lighter"
        />
      </g>
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
          animation: `growBranch 10s ease-out forwards`,
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
             animation: `growBranch 10s ease-out forwards`,
             animationDelay: `${delay}s`
          }}
          className="opacity-80 mix-blend-screen"
        />
      )}

      {/* The "Flow Pulse" - Shows direction */}
      {(status === 'completed' || status === 'unlocked') && (
        <path 
          d={path} 
          stroke="#a7f3d0" 
          strokeWidth={thickness * 0.6} 
          strokeLinecap="round" 
          fill="none" 
          style={{
             strokeDasharray: `100 1400`, 
             animation: `growBranch 3.5s linear infinite, fade-in-pulse 0.1s forwards`,
             animationDelay: `calc(${delay}s)`, // Wait for growth animation (10s) to finish
             opacity: 0, // Initially hidden
          }}
          className="blur-[1px] mix-blend-plus-lighter"
        />
      )}
    </g>
  );
};
