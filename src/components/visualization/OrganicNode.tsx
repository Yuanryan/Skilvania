"use client";

import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Node, NodeStatus } from '@/types';
import { cn } from '@/lib/utils/cn';

interface OrganicNodeProps {
  node: Node;
  status: NodeStatus;
  isSelected: boolean;
  isCreatorMode: boolean;
  onClick: (node: Node) => void;
  onMouseDown?: (e: React.MouseEvent, node: Node) => void;
}

const getDelay = (y: number) => {
  const startY = 1500;
  const pxPerSecond = 250;
  return Math.max(0, (startY - y) / pxPerSecond); 
};

export const OrganicNode: React.FC<OrganicNodeProps> = ({ 
  node, 
  status, 
  onClick, 
  isSelected, 
  isCreatorMode, 
  onMouseDown 
}) => {
  // Dynamically resolve icon, fallback to Code
  const Icon = (Icons as any)[node.iconName || 'Code'] || Icons.Code;
  const animDelay = getDelay(node.y) + 0.5;

  const statusStyles = {
    locked: "bg-slate-900/80 border-slate-700 text-slate-600 scale-90 grayscale",
    unlocked: "bg-slate-900 border-emerald-500 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse hover:scale-110 cursor-pointer",
    completed: "bg-emerald-900 border-emerald-400 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-110 cursor-pointer",
    // Creator mode: match completed palette for a consistent look while editing
    creator: "bg-emerald-900 border-emerald-400 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-move hover:shadow-[0_0_25px_rgba(16,185,129,0.45)]"
  };

  let currentStyle = statusStyles[status] || statusStyles.locked;
  if (isCreatorMode) currentStyle = statusStyles.creator;

  // Selection glow logic
  const selectedStyle = isSelected 
    ? (isCreatorMode ? "ring-2 ring-white scale-110 z-30" : "ring-4 ring-emerald-100/20 z-30") 
    : "z-20";

  return (
    <motion.div 
      className={cn(
        "absolute w-16 h-16 -ml-8 -mt-8 rounded-full border-[3px] flex items-center justify-center backdrop-blur-sm transition-colors duration-200",
        currentStyle,
        selectedStyle
      )}
      style={{ 
        left: `${(node.x / 4000) * 100}%`, // Assuming 4000 width base
        top: `${(node.y / 4000) * 100}%`,  // Assuming 4000 height base
      }}
      initial={!isCreatorMode ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
      animate={!isCreatorMode ? { scale: isSelected ? 1.25 : 1, opacity: 1 } : { scale: isSelected ? 1.1 : 1, opacity: 1 }}
      transition={{ 
        duration: 0.8, 
        delay: !isCreatorMode ? animDelay : 0,
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      onMouseDown={(e) => {
        if (isCreatorMode && onMouseDown) {
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
        <motion.div 
          className="absolute -top-2 -right-2 text-emerald-500"
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          <Icons.Leaf size={12} fill="currentColor" />
        </motion.div>
      )}

      {!isCreatorMode && status === 'completed' && (
        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-900 rounded-full p-0.5 border-2 border-slate-900 z-10">
          <Icons.CheckCircle size={12} fill="currentColor" />
        </div>
      )}

      {/* Creator Mode: Drag Handle visual cue */}
      {isCreatorMode && isSelected && (
        <div className="absolute -bottom-6 bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full opacity-80 pointer-events-none whitespace-nowrap">
          Drag to move
        </div>
      )}
    </motion.div>
  );
};

