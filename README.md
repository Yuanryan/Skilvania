# [114-1] Web Programming Final Project

**(Group Skilvania) Skilvania - 冒險式技能學習與知識交換平台**

Demo 影片：(待補)

系統上線（Deploy）：[https://skilvania.vercel.app/](https://skilvania.vercel.app/)

---

## 一、專案簡介

Skilvania 是一個結合「知識共生」概念的互動式學習平台。我們將枯燥的課程列表轉化為一片生機蓬勃的「知識森林」，讓每一位使用者既是探索世界的學習者，也是培育森林的領路人。透過視覺化的「技能樹」系統與智慧媒合機制，使用者可以輕鬆交換彼此的專長、分享獨到的見解，並在共同解鎖節點（Nodes）的過程中建立深度的社群連結。在 Skilvania，學習不再是孤獨的攀爬，而是一場全員參與、互助共享的冒險旅程。

---

## 二、系統功能說明

### （一）註冊與登入
*   支援 Email/Password 註冊與登入。
*   支援 Google OAuth 快速登入（整合 NextAuth.js v5）。

### （二）冒險式學習流程（學習者）
*   **技能森林視覺化**：首頁以動態生長的樹狀結構展示學習路徑，隨著滾動呈現知識的分支。
*   **節點闖關機制**：課程被拆解為具備不同難度（初、中、高）的「知識節點」，隨著探索進度解鎖內容。
*   **遊戲化成長指標**：完成學習活動可獲得經驗值（XP），提升個人等級並記錄在冒險日誌中。

### （三）全民創作者與知識共享（分享者）
*   **去中心化分享**：平台鼓勵使用者分享專長，將個人經驗轉化為可被探索的技能樹分支。
*   **區塊編輯器 (Block Editor)**：提供強大的創作工具，支援 Markdown、程式碼區塊、數學公式 (KaTeX) 與圖片上傳。
*   **視覺化路徑規劃**：創作者可自由設計非線性的學習地圖，引導他人進入特定領域。

### （四）技能交換與社群互動
*   **智慧夥伴媒合**：系統根據學習興趣與專長，分析「互補性」並推薦適合的 Study Buddies 進行技能交換。
*   **讀書會 (Study Groups)**：建立特定主題的討論小組，與同好即時交流心得、共同進步。
*   **即時互動訊息**：支援發送訊息與解鎖夥伴聯絡方式，建立真實的知識連結。

### （五）個人化儀表板
*   展示等級、XP 進度條、當前參與課程與社群活躍動態。

---

## 三、使用技術與框架

**前端：**
*   **Framework**: Next.js 16 (App Router) with React 19
*   **Styling**: Tailwind CSS 4 & Framer Motion 12（視覺動畫核心）
*   **Components**: Lucide React, React Markdown, KaTeX

**後端與資料庫：**
*   **Database**: Supabase (PostgreSQL) + MongoDB (User Activity Logging)
*   **Logic**: Next.js Server Actions & API Routes

**驗證與狀態管理：**
*   **Authentication**: NextAuth.js v5 (Beta)
*   **State Management**: Zustand
*   **Validation**: Zod

---

## 四、地端測試與開發指引

為確保專案能在地端 (localhost) 順利執行，請參考以下步驟進行環境設定：

### 1. 複製專案與安裝依賴
```bash
git clone <repository-url>
cd Skilvania
npm install
```

### 2. 環境變數設定
請於根目錄建立 `.env.local` 檔案，並填入必要資訊。可以參考 `env.example`（或本文件下方的環境變數說明）：

**必要變數：**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# NextAuth Configuration
NEXTAUTH_SECRET=your-generated-secret-here  # 可使用 npm run generate-secret 生成
NEXTAUTH_URL=http://localhost:3000
```

**選用變數：**
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

```

### 3. 資料庫設定 (Supabase)
1.  前往 [Supabase](https://supabase.com) 建立專案。
2.  在 SQL Editor 中執行 `supabase/schema.sql` 以建立核心資料表（USER, COURSE, NODE 等）。
3.  若需啟用社群功能，可執行 `supabase/community_schema.sql`。

### 4. 啟動開發伺服器
```bash
npm run dev
```
開啟瀏覽器造訪 `http://localhost:3000` 即可進行測試。

---

