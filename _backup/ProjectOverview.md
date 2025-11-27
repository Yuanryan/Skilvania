# Skilvania: 專案總覽

## 1. 專案願景

**Skilvania** 是一個遊戲化的學習冒險平台，旨在解決自主學習缺乏結構的問題。雖然網路上有許多關於程式設計、攝影或語言的資源，但學習者往往缺乏一條系統性的成長路徑。

Skilvania 摒棄了線性的課程列表，轉而採用  **互動式技能樹 (Interactive Skill Trees)** 。這讓使用者能夠視覺化他們的成長，只有在掌握前置技能後才能解鎖新的能力（節點），並透過經驗值 (XP) 和等級來追蹤他們的冒險旅程。

這不僅僅是學習，這是在 **Skilvania** 的世界中探索與征服未知的領域。

## 2. 核心概念：技能樹 (The Skill Tree)

不同於傳統使用列表或資料夾的 LMS (學習管理系統)，Skilvania 使用  **圖形化學習模型 (Graph-based Learning Model)** ，這類似於 RPG 遊戲中的天賦樹。

* **世界樹 (The Tree)** ：特定領域的視覺化地圖（例如：「全端網頁開發」或「拉花藝術」）。
* **節點 (The Node)** ：單一的學習單元。一個節點代表一項具體的任務或概念（例如：「學習迴圈」或「打奶泡」）。
* **連結 (The Edge)** ：決定順序的連結線。你無法在完成「HTML 基礎」節點之前嘗試「進階 CSS」節點。

### 「解鎖」循環 (The "Unlock" Loop)

1. **封印 (Locked - 灰色)** ：因前置條件未完成而無法訪問的節點，如同地圖上的迷霧區域。
2. **解鎖 (Unlocked - 黃色/發光)** ：可以開始挑戰的節點。學習者點擊這些節點以查看任務卷軸。
3. **進行中 (In Progress)** ：學習者已接受任務但尚未提交證明。
4. **精通** (Completed -  **綠色)** ：學習者提交了他們的成果（URL、檔案或文字），系統記錄後，這些節點會長出綠葉，並解鎖通往下一區域的路徑。

## 3. 使用者角色

### A. 冒險者 (The Learner / User)

想要獲取新技能的主要使用者。

* **儀表板** ：查看當前等級、總 XP 和正在探索的技能樹。
* **行動** ：他們將技能樹「裝備」到自己的檔案中開始冒險。
* **提交任務** ：他們透過上傳證明（例如程式碼的 GitHub 連結、藝術作品的照片）來完成節點。
* **遊戲化機制** ：
* **XP** ：每個完成的節點都會給予經驗值。
* **等級** ：基於總 XP 計算，象徵冒險者的資歷。
* **成就** ：特殊的徽章（例如：「探索 5 棵樹」、「首次完美達成」）。

### B. 世界架構師 (The Content Designer)

建構課程與冒險路徑的設計師。

* **工坊介面 (Studio Interface)** ：一個拖放式的編輯器，用於創造節點並繪製它們之間的連結（依賴關係）。
* **內容管理** ：他們定義什麼構成一個「任務」（閱讀、測驗或專案），並設定每個節點的 XP 獎勵。
* **品質控制** ：他們可以檢視冒險者的提交內容，以持續優化課程品質。

## 4. 系統功能細分

| **功能類別**   | **細節**                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **身分驗證**   | 安全的登入/註冊。區分冒險者與架構師的權限。                                                           |
| **技能樹引擎** | 核心邏輯，根據 `NodePrerequisites`(前置條件) 和 `UserProgress`(使用者進度) 計算哪些節點可被訪問。 |
| **進度追蹤**   | 永久儲存每個完成的節點、分數和時間戳記。                                                              |
| **遊戲化**     | XP 和等級的即時更新。基於條件的成就系統。                                                             |
| **社群**       | 課程評價系統（星級與評論），幫助使用者找到高品質的技能樹。                                            |
| **提交系統**   | 記錄使用者為通過節點所做的事情（檔案/連結），並與特定時間綁定。                                       |

## 5. 為什麼 Skilvania 獨一無二？

大多數課程平台（如 Udemy, Coursera）都是線性的。**Skilvania** 允許  **非線性成長 (non-linear progression)** 。一個單一的「基礎」節點可能會分支成三條不同的路徑（例如：「前端」、「後端」、「DevOps」），允許使用者選擇他們的專精方向，同時仍能看見該技能領域的「宏觀地圖」。


## 6. Suggested Project Structure

/src
  /app
    (marketing)          # Group for public pages
      /page.tsx          # Landing Page (Hero, Features, Call to Action)
      /about/page.tsx    # "The Story of Skilvania"

    (auth)               # Auth Routes
      /login/page.tsx    # OAuth + Email Login
      /register/page.tsx # Registration

    (dashboard)          # Protected User Routes
      /dashboard/page.tsx # The "Campfire" (Active courses, Daily goals)
      /leaderboard/page.tsx
      /settings/page.tsx  # User preferences, dark mode toggle

    /profile
      /[username]/page.tsx # Public Profile (Showcasing the user's "Garden" of completed trees)

    /courses
      /page.tsx          # The Catalog (Search & Filters)
      /[courseId]        # The Course Wrapper
        /page.tsx        # Course Overview (Reviews, "Equip this Tree" button)
        /tree/page.tsx   # THE CORE: The Interactive Organic Tree UI (Learner Mode)
        /learn
          /[nodeId]/page.tsx # The Lesson Content (Video, Text, Quiz, Submission Form)

    /creator             # The Architect's Studio
      /page.tsx          # List of courses created by me
      /new/page.tsx      # Wizard to start a new tree
      /[courseId]
        /editor/page.tsx # THE CORE: The Interactive Tree Editor (Drag & Drop)
        /content
          /[nodeId]/page.tsx # Rich Text Editor for lesson content
        /submissions/page.tsx # Grading interface for student work

  /components
    /ui                  # Basic atoms (Buttons, Inputs, Modals)
    /visualization       # The Tree Engine (OrganicNode, BranchLine)
    /gamification        # XP bars, Level up modals, Confetti

  /lib
    /db                  # Database client (Prisma/Supabase)
    /hooks               # Custom React hooks (useTreeLogic, useAuth)
    /utils               # Helper functions (XP calculations, Tree algorithms)


/src
  /app
    (marketing)          # Group for public pages
      /page.tsx          # Landing Page (Hero, Features, Call to Action)
      /about/page.tsx    # "The Story of Skilvania"

    (auth)               # Auth Routes
      /login/page.tsx    # OAuth + Email Login
      /register/page.tsx # Registration

    (dashboard)          # Protected User Routes
      /dashboard/page.tsx # The "Campfire" (Active courses, Daily goals)
      /leaderboard/page.tsx
      /settings/page.tsx  # User preferences, dark mode toggle

    /profile
      /[username]/page.tsx # Public Profile (Showcasing the user's "Garden" of completed trees)

    /courses
      /page.tsx          # The Catalog (Search & Filters)
      /[courseId]        # The Course Wrapper
        /page.tsx        # Course Overview (Reviews, "Equip this Tree" button)
        /tree/page.tsx   # THE CORE: The Interactive Organic Tree UI (Learner Mode)
        /learn
          /[nodeId]/page.tsx # The Lesson Content (Video, Text, Quiz, Submission Form)

    /creator             # The Architect's Studio
      /page.tsx          # List of courses created by me
      /new/page.tsx      # Wizard to start a new tree
      /[courseId]
        /editor/page.tsx # THE CORE: The Interactive Tree Editor (Drag & Drop)
        /content
          /[nodeId]/page.tsx # Rich Text Editor for lesson content
        /submissions/page.tsx # Grading interface for student work

  /components
    /ui                  # Basic atoms (Buttons, Inputs, Modals)
    /visualization       # The Tree Engine (OrganicNode, BranchLine)
    /gamification        # XP bars, Level up modals, Confetti

  /lib
    /db                  # Database client (Prisma/Supabase)
    /hooks               # Custom React hooks (useTreeLogic, useAuth)
    /utils               # Helper functions (XP calculations, Tree algorithms)
