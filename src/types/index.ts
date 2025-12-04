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

export type ActivityType = 
  | 'page_view'           // 頁面瀏覽
  | 'node_view'           // 節點查看
  | 'node_complete'       // 節點完成
  | 'course_start'        // 開始課程
  | 'course_complete'     // 完成課程
  | 'search'              // 搜尋
  | 'login'               // 登入
  | 'logout'              // 登出
  | 'register'            // 註冊
  | 'profile_update'      // 更新個人資料
  | 'submission_create'   // 創建提交
  | 'submission_review'   // 審核提交
  | 'course_create'       // 創建課程
  | 'course_edit'         // 編輯課程
  | 'node_create'         // 創建節點
  | 'node_edit'           // 編輯節點
  | 'other';              // 其他

export interface UserActivity {
  _id?: string;
  userId: number;                    // 用戶 ID (對應 Supabase USER.UserID)
  activityType: ActivityType;        // 活動類型
  timestamp: Date;                    // 時間戳
  metadata?: {                        // 額外的元數據
    [key: string]: any;
    // 常見的元數據欄位：
    // - page?: string;               // 頁面路徑
    // - courseId?: number;           // 課程 ID
    // - nodeId?: number;             // 節點 ID
    // - searchQuery?: string;        // 搜尋關鍵字
    // - duration?: number;           // 持續時間（秒）
    // - ipAddress?: string;          // IP 地址
    // - userAgent?: string;          // 用戶代理
    // - referrer?: string;           // 來源頁面
  };
  sessionId?: string;                 // 會話 ID（用於追蹤用戶會話）
  createdAt: Date;                    // 記錄創建時間
}

export interface ActivityQuery {
  userId?: number;
  activityType?: ActivityType | ActivityType[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
  sort?: 'asc' | 'desc';
}



