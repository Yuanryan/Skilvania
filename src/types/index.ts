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

// --- USER ACTIVITY LOGGING ---

export type EventType = 
  | 'login'               // 登入
  | 'logout'              // 登出
  | 'register'           // 註冊
  | 'course_start'        // 開始課程（舊事件，保留兼容）
  | 'course_view'         // 查看課程（新事件）
  | 'course_complete'     // 完成課程
  | 'course_create'       // 創建課程
  | 'course_edit'         // 編輯課程
  | 'node_view'           // 查看節點
  | 'node_complete'       // 完成節點
  | 'node_create'         // 創建節點
  | 'node_edit'           // 編輯節點
  | 'page_view'           // 頁面瀏覽
  | 'search'              // 搜尋
  | 'profile_update'      // 更新個人資料
  | 'submission_create'   // 創建提交
  | 'submission_review'   // 審核提交
  | 'other';              // 其他

// 最小必要活動記錄格式（Minimal Viable Schema）
export interface UserActivity {
  _id?: string;
  userId: number;                    // 用戶 ID（必需）
  event: EventType;                  // 事件名稱（必需）
  timestamp: Date;                   // 時間戳（必需）
  
  // 可選欄位（根據事件類型）
  courseId?: number;                 // 課程 ID（課程/節點相關事件）
  nodeId?: number;                   // 節點 ID（節點相關事件）
  xpGained?: number;                 // 獲得 XP（node_complete 專用）
}

export interface ActivityQuery {
  userId?: number;
  event?: EventType | EventType[];
  courseId?: number;
  nodeId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
  sort?: 'asc' | 'desc';
}
