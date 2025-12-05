# Final Project – Midterm Plan

## Deploy Link

<Deploy_Link>

## 1. 本次 Prototype 已完成

- **基本頁面架構**
  - Landing Page（首頁）
  - About Page（關於頁面）
  - Courses Catalog（課程目錄）
  - Dashboard（使用者儀表板）
  - Leaderboard（排行榜）
  - Settings（設定頁面）
  - Profile（個人檔案頁面）

- **登入框架**
  - NextAuth 認證系統架構
  - Supabase Auth 整合
  - Google OAuth 設定（可選）

- **兩個示意頁面**
  - 技能樹視覺化頁面（`/courses/[courseId]/tree`）
  - 節點學習頁面（`/courses/[courseId]/learn/[nodeId]`）

- **基本功能 placeholder**
  - Creator Dashboard（創作者儀表板）
  - 技能樹編輯器（`/creator/[courseId]/editor`）
  - 節點內容編輯器（`/creator/[courseId]/content/[nodeId]`）
  - 資料庫 Schema（Supabase + MongoDB）
  - API 端點基礎架構（課程、節點、連接管理）

## 2. 最終版本預計完成項目

- **完整的使用者流程**
  - 學習者完整流程：瀏覽課程 → 開始學習 → 查看節點內容 → 提交作業 → 解鎖下一個節點
  - 創作者完整流程：創建課程 → 設計技能樹 → 編輯節點內容 → 審核學生提交 → 查看統計數據
  - 使用者認證流程：註冊 → 登入 → 個人資料管理

- **資料庫串接**
  - 完整串接 Supabase（使用者資料、課程、節點、進度追蹤）
  - MongoDB 活動日誌完整記錄
  - 使用者進度（USERPROGRESS）即時更新
  - 提交系統（SUBMISSION）完整實作

- **三大主要功能：學習者系統、創作者系統、遊戲化系統**
  - **學習者系統**：技能樹瀏覽與互動、節點學習內容、作業提交、進度追蹤
  - **創作者系統**：課程創建與管理、技能樹編輯、內容編輯、提交審核
  - **遊戲化系統**：XP 計算與累積、等級提升機制、排行榜、成就系統

## 3. 預期開發進度

- **Week 1: 完成功能 A & B**
  - 功能 A：學習者核心流程實作
    - 技能樹節點狀態顯示（Locked/Unlocked/In Progress/Completed）
    - 節點解鎖邏輯（檢查前置節點完成狀態）
    - 節點學習內容頁面完整實作（內容顯示、作業提交表單）
    - 使用者進度追蹤 API 串接
  - 功能 B：提交系統實作
    - 學習者提交作業功能（文字、URL、檔案上傳）
    - 提交狀態管理（Pending/Approved/Rejected）
    - 創作者審核介面實作

- **Week 2: 完成功能 C / 串接 API**
  - 功能 C：遊戲化系統實作
    - XP 計算邏輯（完成節點獲得 XP）
    - 等級計算與提升機制
    - 排行榜資料串接與顯示
    - 使用者等級顯示（Dashboard、Profile）
  - API 完整串接
    - 使用者進度 API 完整實作
    - 提交審核 API 實作
    - XP/等級更新 API 實作
    - 活動日誌完整記錄

- **Week 3: 介面調整與最終整合**
  - UI/UX 優化與調整
  - 響應式設計完善（行動裝置適配）
  - 錯誤處理與使用者體驗優化
  - 效能優化（載入速度、API 響應時間）
  - 最終測試與 Bug 修復
  - 部署與文件整理

