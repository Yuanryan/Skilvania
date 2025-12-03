# Skilvania 系統架構文檔

## 📋 目錄
1. [技術棧](#技術棧)
2. [專案結構](#專案結構)
3. [資料庫架構](#資料庫架構)
4. [共用組件](#共用組件)
5. [Creator 功能架構](#creator-功能架構)
6. [API 設計](#api-設計)
7. [開發指南](#開發指南)

---

## 技術棧

- **前端框架**: Next.js 16 (App Router) + React 19
- **語言**: TypeScript
- **資料庫**: Supabase (PostgreSQL)
- **認證**: NextAuth.js v5 (Email/Password + Google OAuth)
- **樣式**: Tailwind CSS
- **動畫**: Framer Motion
- **圖標**: Lucide React

---

## 專案結構

```
src/
├── app/                          # Next.js App Router 頁面
│   ├── (auth)/                   # 認證相關頁面（路由組）
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # 儀表板相關頁面（路由組）
│   │   └── dashboard/
│   ├── api/                      # API 路由
│   │   └── auth/[...nextauth]/
│   ├── creator/                  # ⭐ Creator 功能區域
│   │   ├── page.tsx             # Creator Dashboard
│   │   └── [courseId]/
│   │       ├── editor/          # 技能樹編輯器
│   │       ├── content/         # 節點內容編輯
│   │       └── submissions/     # 學生提交審核
│   ├── courses/                  # 學習者課程瀏覽
│   │   └── [courseId]/
│   │       ├── page.tsx         # 課程概覽
│   │       ├── tree/            # 技能樹視圖
│   │       └── learn/          # 學習節點
│   └── ...
│
├── components/                   # 可重用組件
│   ├── ui/                       # UI 組件
│   │   └── Navbar.tsx           # ✅ 共用導航欄
│   └── visualization/           # 視覺化組件
│       ├── OrganicTree.tsx      # ✅ 共用技能樹容器
│       ├── OrganicNode.tsx      # ✅ 共用節點組件
│       └── TreeBranch.tsx       # ✅ 共用連接線組件
│
├── lib/                          # 工具函數和配置
│   ├── auth/                     # 認證配置
│   ├── supabase/                 # Supabase 客戶端
│   └── utils/                    # 工具函數
│
└── types/                        # TypeScript 類型定義
    ├── index.ts                  # 主要類型定義
    └── next-auth.d.ts           # NextAuth 類型擴展
```

---

## 資料庫架構

### 現有表格（已實現）

1. **USER** - 使用者表
   - UserID, Username, Email, Password, XP, Level, CreatedAt, UpdatedAt

2. **ROLES** - 角色表
   - RoleID, RoleName (愛好者, 設計師, 開發者, 學習者, 教師)

3. **USERROLE** - 使用者角色關聯表
   - UserID, RoleID

4. **auth_user_bridge** - Supabase Auth 橋接表
   - auth_user_id, user_id

### 需要創建的表格（Creator 功能需要）

#### 1. COURSE (課程表)
```sql
CREATE TABLE COURSE (
    "CourseID" SERIAL PRIMARY KEY,
    "Title" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "CreatorID" INT NOT NULL REFERENCES "USER"("UserID"),
    "Status" VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    "TotalNodes" INT DEFAULT 0,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. NODE (節點表)
```sql
CREATE TABLE NODE (
    "NodeID" SERIAL PRIMARY KEY,
    "CourseID" INT NOT NULL REFERENCES COURSE("CourseID") ON DELETE CASCADE,
    "Title" VARCHAR(200) NOT NULL,
    "Type" VARCHAR(20) NOT NULL, -- 'theory', 'code', 'project'
    "XP" INT DEFAULT 100,
    "X" INT NOT NULL, -- 畫布 X 座標 (0-800)
    "Y" INT NOT NULL, -- 畫布 Y 座標 (0-800)
    "IconName" VARCHAR(50), -- Lucide icon 名稱
    "Description" TEXT,
    "Content" TEXT, -- 節點內容（HTML/Markdown）
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. EDGE (連接線表)
```sql
CREATE TABLE EDGE (
    "EdgeID" SERIAL PRIMARY KEY,
    "CourseID" INT NOT NULL REFERENCES COURSE("CourseID") ON DELETE CASCADE,
    "FromNodeID" INT NOT NULL REFERENCES NODE("NodeID") ON DELETE CASCADE,
    "ToNodeID" INT NOT NULL REFERENCES NODE("NodeID") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("FromNodeID", "ToNodeID") -- 防止重複連接
);
```

#### 4. USERPROGRESS (學習進度表)
```sql
CREATE TABLE USERPROGRESS (
    "ProgressID" SERIAL PRIMARY KEY,
    "UserID" INT NOT NULL REFERENCES "USER"("UserID") ON DELETE CASCADE,
    "NodeID" INT NOT NULL REFERENCES NODE("NodeID") ON DELETE CASCADE,
    "Status" VARCHAR(20) DEFAULT 'locked', -- 'locked', 'unlocked', 'completed'
    "CompletedAt" TIMESTAMP WITH TIME ZONE,
    "SubmissionURL" TEXT, -- 學生提交的 URL/檔案
    "SubmissionText" TEXT, -- 學生提交的文字
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("UserID", "NodeID")
);
```

#### 5. SUBMISSION (提交審核表)
```sql
CREATE TABLE SUBMISSION (
    "SubmissionID" SERIAL PRIMARY KEY,
    "ProgressID" INT NOT NULL REFERENCES USERPROGRESS("ProgressID") ON DELETE CASCADE,
    "Status" VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    "Feedback" TEXT, -- Creator 的評語
    "ReviewedAt" TIMESTAMP WITH TIME ZONE,
    "ReviewedBy" INT REFERENCES "USER"("UserID"),
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 共用組件

### ✅ 已實現的共用組件

#### 1. **Navbar** (`src/components/ui/Navbar.tsx`)
- **用途**: 全站導航欄
- **功能**: 
  - 顯示 Logo 和主要導航連結
  - 使用者認證狀態顯示
  - 登入/登出功能
- **使用位置**: 所有需要導航的頁面
- **狀態**: ✅ 已完成，可直接使用

#### 2. **OrganicTree** (`src/components/visualization/OrganicTree.tsx`)
- **用途**: 技能樹視覺化容器
- **功能**:
  - 渲染節點和連接線
  - 處理拖拽（Creator 模式）
  - 處理節點點擊和連接
- **Props**:
  ```typescript
  {
    nodes: Node[];
    edges: Edge[];
    completedNodes: Set<string>;
    isCreatorMode: boolean;
    onNodeClick: (node: Node) => void;
    onNodeDrag?: (nodeId: string, x: number, y: number) => void;
    onConnect?: (sourceId: string, targetId: string) => void;
  }
  ```
- **使用位置**: 
  - `/creator/[courseId]/editor` (編輯模式)
  - `/courses/[courseId]/tree` (學習模式)
- **狀態**: ✅ 已完成，可直接使用

#### 3. **OrganicNode** (`src/components/visualization/OrganicNode.tsx`)
- **用途**: 單個技能節點組件
- **功能**:
  - 顯示節點圖標和狀態
  - 支援拖拽（Creator 模式）
  - 動畫效果
- **Props**:
  ```typescript
  {
    node: Node;
    status: NodeStatus; // 'locked' | 'unlocked' | 'completed'
    isSelected: boolean;
    isCreatorMode: boolean;
    onClick: (node: Node) => void;
    onMouseDown?: (e: React.MouseEvent, node: Node) => void;
  }
  ```
- **狀態**: ✅ 已完成，可直接使用

#### 4. **TreeBranch** (`src/components/visualization/TreeBranch.tsx`)
- **用途**: 節點之間的連接線
- **功能**: 視覺化節點之間的依賴關係
- **狀態**: ✅ 已完成，可直接使用

---

## Creator 功能架構

### 功能模組

#### 1. **Creator Dashboard** (`/creator`)
- **檔案**: `src/app/creator/page.tsx`
- **功能**:
  - 顯示創建者所有課程列表
  - 顯示課程狀態（Draft/Published）
  - 顯示學生數量和評分
  - 快速操作（編輯、刪除、發布）
- **狀態**: ⚠️ 目前使用 Mock 資料，需要連接資料庫

#### 2. **技能樹編輯器** (`/creator/[courseId]/editor`)
- **檔案**: `src/app/creator/[courseId]/editor/page.tsx`
- **功能**:
  - ✅ 視覺化編輯技能樹（使用 OrganicTree）
  - ✅ 拖拽節點調整位置
  - ✅ 點擊節點連接
  - ✅ 添加/刪除節點
  - ✅ 編輯節點屬性（標題、類型、XP）
  - ⚠️ 保存功能（需要 API）
  - ⚠️ 載入現有課程資料（需要 API）
- **狀態**: UI 已完成，需要連接後端

#### 3. **節點內容編輯器** (`/creator/[courseId]/content/[nodeId]`)
- **檔案**: `src/app/creator/[courseId]/content/[nodeId]/page.tsx`
- **功能**:
  - ⚠️ 富文本編輯器（目前只有簡單 textarea）
  - ⚠️ 插入圖片、影片
  - ⚠️ Markdown 支援
  - ⚠️ 預覽功能
  - ⚠️ 保存內容到資料庫
- **狀態**: 基礎 UI 完成，需要增強編輯功能和後端

#### 4. **學生提交審核** (`/creator/[courseId]/submissions`)
- **檔案**: `src/app/creator/[courseId]/submissions/page.tsx`
- **功能**:
  - ⚠️ 顯示待審核的學生提交
  - ⚠️ 查看提交內容（URL/檔案/文字）
  - ⚠️ 批准/拒絕提交
  - ⚠️ 添加評語
  - ⚠️ 自動更新學生進度和 XP
- **狀態**: UI 完成，需要連接後端

### 需要創建的新組件

#### 1. **NodePropertiesPanel** (節點屬性面板)
- **位置**: `src/components/creator/NodePropertiesPanel.tsx`
- **用途**: 在編輯器中顯示和編輯選中節點的屬性
- **功能**:
  - 編輯節點標題
  - 選擇節點類型（theory/code/project）
  - 設定 XP 獎勵
  - 快速連結到內容編輯器
- **狀態**: ⚠️ 需要創建（目前邏輯在 editor/page.tsx 中）

#### 2. **CourseCard** (課程卡片)
- **位置**: `src/components/creator/CourseCard.tsx`
- **用途**: 在 Creator Dashboard 中顯示課程卡片
- **功能**:
  - 顯示課程資訊
  - 狀態標籤
  - 快速操作按鈕
- **狀態**: ⚠️ 需要創建（目前邏輯在 creator/page.tsx 中）

#### 3. **ContentEditor** (內容編輯器)
- **位置**: `src/components/creator/ContentEditor.tsx`
- **用途**: 富文本編輯器組件
- **功能**:
  - Markdown 編輯
  - 圖片上傳
  - 程式碼區塊
  - 即時預覽
- **狀態**: ⚠️ 需要創建（建議使用 react-markdown 或 Tiptap）

#### 4. **SubmissionCard** (提交卡片)
- **位置**: `src/components/creator/SubmissionCard.tsx`
- **用途**: 顯示單個學生提交
- **功能**:
  - 顯示學生資訊
  - 顯示提交內容
  - 批准/拒絕按鈕
  - 評語輸入
- **狀態**: ⚠️ 需要創建（目前邏輯在 submissions/page.tsx 中）

---

## API 設計

### 需要實現的 API 端點

#### 1. 課程管理

##### `GET /api/courses`
- **用途**: 獲取創建者的所有課程
- **查詢參數**: `?creatorId=xxx`
- **回應**:
```typescript
{
  courses: Course[];
}
```

##### `POST /api/courses`
- **用途**: 創建新課程
- **請求體**:
```typescript
{
  title: string;
  description?: string;
}
```
- **回應**:
```typescript
{
  courseId: number;
  course: Course;
}
```

##### `GET /api/courses/[courseId]`
- **用途**: 獲取單個課程詳情
- **回應**:
```typescript
{
  course: Course;
  nodes: Node[];
  edges: Edge[];
}
```

##### `PUT /api/courses/[courseId]`
- **用途**: 更新課程資訊（標題、描述、狀態）
- **請求體**:
```typescript
{
  title?: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
}
```

##### `DELETE /api/courses/[courseId]`
- **用途**: 刪除課程（級聯刪除節點和連接）

#### 2. 節點管理

##### `POST /api/courses/[courseId]/nodes`
- **用途**: 創建新節點
- **請求體**:
```typescript
{
  title: string;
  type: 'theory' | 'code' | 'project';
  x: number;
  y: number;
  xp?: number;
  iconName?: string;
}
```

##### `PUT /api/courses/[courseId]/nodes/[nodeId]`
- **用途**: 更新節點（位置、屬性）
- **請求體**:
```typescript
{
  title?: string;
  type?: string;
  x?: number;
  y?: number;
  xp?: number;
  iconName?: string;
  description?: string;
}
```

##### `DELETE /api/courses/[courseId]/nodes/[nodeId]`
- **用途**: 刪除節點（級聯刪除相關連接）

##### `PUT /api/courses/[courseId]/nodes/batch`
- **用途**: 批量更新節點位置（拖拽後保存）
- **請求體**:
```typescript
{
  nodes: Array<{ nodeId: number; x: number; y: number }>;
}
```

#### 3. 連接管理

##### `POST /api/courses/[courseId]/edges`
- **用途**: 創建連接
- **請求體**:
```typescript
{
  fromNodeId: number;
  toNodeId: number;
}
```

##### `DELETE /api/courses/[courseId]/edges/[edgeId]`
- **用途**: 刪除連接

#### 4. 內容管理

##### `GET /api/courses/[courseId]/nodes/[nodeId]/content`
- **用途**: 獲取節點內容
- **回應**:
```typescript
{
  content: string; // HTML/Markdown
}
```

##### `PUT /api/courses/[courseId]/nodes/[nodeId]/content`
- **用途**: 保存節點內容
- **請求體**:
```typescript
{
  content: string;
}
```

#### 5. 提交審核

##### `GET /api/courses/[courseId]/submissions`
- **用途**: 獲取待審核的提交
- **查詢參數**: `?status=pending`
- **回應**:
```typescript
{
  submissions: Array<{
    submissionId: number;
    student: User;
    node: Node;
    submissionUrl?: string;
    submissionText?: string;
    submittedAt: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
}
```

##### `POST /api/submissions/[submissionId]/approve`
- **用途**: 批准提交
- **請求體**:
```typescript
{
  feedback?: string;
}
```

##### `POST /api/submissions/[submissionId]/reject`
- **用途**: 拒絕提交
- **請求體**:
```typescript
{
  feedback?: string;
}
```

---

## 開發指南

### Creator 功能開發優先順序

#### Phase 1: 基礎功能（優先）
1. ✅ **資料庫 Schema** - 創建 Course, Node, Edge, UserProgress, Submission 表
2. ⚠️ **創建新課程** - 實現 `POST /api/courses`
3. ⚠️ **載入課程資料** - 實現 `GET /api/courses/[courseId]`
4. ⚠️ **保存技能樹** - 實現節點和連接的保存功能

#### Phase 2: 編輯功能
5. ⚠️ **節點 CRUD** - 實現節點的創建、更新、刪除 API
6. ⚠️ **連接管理** - 實現連接的創建和刪除
7. ⚠️ **批量保存** - 實現拖拽後的批量位置更新

#### Phase 3: 內容編輯
8. ⚠️ **內容編輯器增強** - 實現富文本編輯功能
9. ⚠️ **內容保存** - 實現節點內容的保存和載入

#### Phase 4: 審核功能
10. ⚠️ **提交列表** - 實現獲取待審核提交
11. ⚠️ **審核操作** - 實現批准/拒絕功能
12. ⚠️ **進度更新** - 審核後自動更新學生進度和 XP

### 組件開發建議

#### 1. 優先使用現有組件
- ✅ **Navbar** - 所有頁面都應該使用
- ✅ **OrganicTree** - 編輯器和學習視圖都使用
- ✅ **OrganicNode** - 已支援 Creator 模式

#### 2. 創建可重用組件
- 將 Creator Dashboard 中的課程卡片提取為 `CourseCard` 組件
- 將編輯器中的節點屬性面板提取為 `NodePropertiesPanel` 組件
- 將提交列表中的項目提取為 `SubmissionCard` 組件

#### 3. 組件設計原則
- **單一職責**: 每個組件只負責一個功能
- **Props 明確**: 使用 TypeScript 定義清晰的 Props 介面
- **可重用性**: 考慮其他功能模組也可能使用
- **樣式統一**: 使用 Tailwind CSS，保持設計系統一致

### 資料流設計

#### Creator 編輯器資料流
```
1. 頁面載入 → GET /api/courses/[courseId]
   ↓
2. 獲取 nodes 和 edges → 渲染 OrganicTree
   ↓
3. 使用者操作（拖拽、添加、刪除）
   ↓
4. 本地狀態更新（React state）
   ↓
5. 保存操作 → PUT /api/courses/[courseId]/nodes/batch
   ↓
6. 成功後更新本地狀態
```

#### 內容編輯資料流
```
1. 點擊節點 → 導航到 /creator/[courseId]/content/[nodeId]
   ↓
2. 頁面載入 → GET /api/courses/[courseId]/nodes/[nodeId]/content
   ↓
3. 顯示編輯器（載入現有內容）
   ↓
4. 使用者編輯
   ↓
5. 保存 → PUT /api/courses/[courseId]/nodes/[nodeId]/content
```

### 錯誤處理

- **API 錯誤**: 使用 try-catch 和適當的錯誤訊息
- **驗證**: 前端和後端都要驗證資料
- **載入狀態**: 使用 loading state 和 skeleton UI
- **樂觀更新**: 可以考慮在保存前先更新 UI

### 測試建議

- **單元測試**: 測試組件的渲染和互動
- **整合測試**: 測試 API 端點
- **E2E 測試**: 測試完整的創建課程流程

---

## 注意事項

1. **權限控制**: 確保只有課程創建者可以編輯自己的課程
2. **資料驗證**: 節點座標範圍、連接不能形成循環等
3. **效能優化**: 大量節點時考慮虛擬滾動或分頁
4. **備份機制**: 刪除操作前確認，考慮軟刪除
5. **版本控制**: 未來可能需要課程版本管理功能

---

## 下一步行動

1. ✅ 閱讀並理解此架構文檔
2. ⚠️ 創建資料庫 Schema（Course, Node, Edge 等表）
3. ⚠️ 實現基礎 API 端點
4. ⚠️ 連接前端頁面到後端 API
5. ⚠️ 創建可重用組件
6. ⚠️ 測試和優化

---

**最後更新**: 2025-01-03
**維護者**: Henry (Creator 功能開發)

