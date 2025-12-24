"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Node, Edge } from '@/types';

interface TreeBranchProps {
  start: Node;
  end: Node;
  status: 'locked' | 'unlocked' | 'completed';
  isCreatorMode: boolean;
  delay?: number;
}

export const TreeBranch: React.FC<TreeBranchProps> = ({ start, end, status, isCreatorMode, delay: propDelay }) => {
  // Cubic Bezier Logic for "Organic Growth"
  const controlPointY = start.y - (start.y - end.y) * 0.5;
  
  const path = `
    M ${start.x} ${start.y} 
    C ${start.x} ${controlPointY}, 
    ${end.x} ${controlPointY}, 
    ${end.x} ${end.y}
  `;

  const normalizeY = Math.max(0, Math.min(1, start.y / 4000)); 
  const thickness = 4 + (normalizeY * 10); 

  // Use provided delay or fallback to Y-position based delay (legacy support)
  const getDelay = (y: number) => {
    const startY = 1500;
    const pxPerSecond = 250;
    return Math.max(0, (startY - y) / pxPerSecond); 
  };
  
  const delay = propDelay !== undefined ? propDelay : getDelay(start.y);
  
  // Estimate path length for better animation timing
  const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  const length = Math.max(dist * 1.5, 100); // Minimum length to avoid glitch
  const duration = Math.max(1, length / 500); // Speed: 500px/s, min 1s

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
      <motion.path 
        d={path} 
        stroke="#3f3c35" 
        strokeWidth={thickness} 
        strokeLinecap="round" 
        fill="none" 
        filter="url(#roughness-global)" 
        className="opacity-90"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ 
          duration: duration, 
          delay: delay,
          ease: "easeOut" 
        }}
      />
      
      {/* The "Energy" */}
      {(status === 'completed' || status === 'unlocked') && (
        <motion.path 
          d={path} 
          stroke={status === 'completed' ? "#10b981" : "#059669"} 
          strokeWidth={thickness / 2.5} 
          strokeLinecap="round" 
          fill="none" 
          className="opacity-80 mix-blend-screen"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ 
            duration: duration, 
            delay: delay,
            ease: "easeOut" 
          }}
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
             animationDelay: `calc(${delay}s + ${duration}s)`, // Wait for growth animation to finish
             opacity: 0, // Initially hidden
          }}
          className="blur-[1px] mix-blend-plus-lighter"
        />
      )}
    </g>
  );
};
