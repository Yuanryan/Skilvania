import { LucideIcon } from 'lucide-react';

// --- USER & PROGRESS ---

export interface User {
  id: string;
  username: string;
  level: number;
  xp: number;
  nextLevelXp: number;
}

// --- COURSE STRUCTURE ---

export interface Course {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  totalNodes: number;
}

// --- SKILL TREE ENGINE ---

export type NodeType = 'theory' | 'code' | 'project';

export type NodeStatus = 'locked' | 'unlocked' | 'completed';

export interface Node {
  id: string;
  title: string;
  xp: number;
  type: NodeType;
  x: number;
  y: number;
  iconName?: string; // We'll map string names to Lucide icons in the component
  description?: string;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
}

export interface TreeData {
  nodes: Node[];
  edges: Edge[];
}

// --- VISUALIZATION PROPS ---

export interface OrganicNodeProps {
  node: Node;
  status: NodeStatus;
  isSelected: boolean;
  isCreatorMode: boolean;
  onClick: (node: Node) => void;
  onMouseDown?: (e: React.MouseEvent, node: Node) => void;
}

