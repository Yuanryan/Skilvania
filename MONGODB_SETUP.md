# MongoDB 設置指南

本指南將幫助您設置 MongoDB 來存儲用戶使用記錄。

## 為什麼使用 MongoDB？

- **靈活性**: NoSQL 數據庫適合存儲非結構化的使用記錄數據
- **性能**: 適合高頻率的寫入操作（活動記錄）
- **可擴展性**: 易於處理大量日誌數據
- **成本**: MongoDB Atlas 提供免費層級

## 設置步驟

### 1. 創建 MongoDB Atlas 帳戶

1. 訪問 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 點擊 "Try Free" 創建免費帳戶
3. 完成註冊流程

### 2. 創建集群

1. 登入後，點擊 "Build a Database"
2. 選擇 **FREE** (M0) 層級
3. 選擇雲提供商和區域（建議選擇離您最近的區域）
4. 點擊 "Create" 創建集群
5. 等待集群創建完成（約 3-5 分鐘）

### 3. 創建數據庫用戶

1. 在 "Database Access" 頁面，點擊 "Add New Database User"
2. 選擇 "Password" 認證方式
3. 輸入用戶名和強密碼（**請記住這些信息**）
4. 設置用戶權限為 "Atlas Admin" 或 "Read and write to any database"
5. 點擊 "Add User"

### 4. 配置網絡訪問

1. 在 "Network Access" 頁面，點擊 "Add IP Address"
2. 對於開發環境，可以點擊 "Allow Access from Anywhere"（添加 `0.0.0.0/0`）
3. 對於生產環境，建議只添加您的服務器 IP 地址
4. 點擊 "Confirm"

### 5. 獲取連接字符串

1. 在 "Database" 頁面，點擊 "Connect"
2. 選擇 "Connect your application"
3. 選擇驅動程序為 "Node.js"，版本為最新
4. 複製連接字符串，格式如下：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/
   ```
   mongodb+srv://joeyu0210_db_user:joe930210@skilvania.x2vceig.mongodb.net/?appName=Skilvania
   
5. 將 `<username>` 和 `<password>` 替換為您創建的數據庫用戶憑證

### 6. 配置環境變量

在您的 `.env.local` 文件中添加：

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
MONGODB_DB_NAME=skilvania
```

**重要**: 
- 確保連接字符串中的密碼已正確 URL 編碼（特殊字符需要編碼）
- 不要將 `.env.local` 文件提交到版本控制系統

## 驗證設置

啟動應用程序後，MongoDB 連接會在首次使用時自動建立。如果連接失敗，活動記錄功能會靜默失敗，不會影響應用程序的其他功能。

您可以在 MongoDB Atlas 控制台的 "Database" → "Browse Collections" 中查看 `user_activities` 集合來驗證數據是否正確寫入。

## 活動記錄類型

系統會自動記錄以下類型的用戶活動：

- `page_view`: 頁面瀏覽
- `node_view`: 節點查看
- `node_complete`: 節點完成
- `course_start`: 開始課程
- `course_complete`: 完成課程
- `search`: 搜尋操作
- `login`: 用戶登入
- `logout`: 用戶登出
- `register`: 用戶註冊
- `profile_update`: 更新個人資料
- `submission_create`: 創建提交
- `submission_review`: 審核提交
- `course_create`: 創建課程
- `course_edit`: 編輯課程
- `node_create`: 創建節點
- `node_edit`: 編輯節點

## 查詢活動記錄

### 通過 API

```typescript
// 獲取用戶的所有活動
GET /api/activities

// 獲取特定類型的活動
GET /api/activities?activityType=page_view

// 獲取時間範圍內的活動
GET /api/activities?startDate=2024-01-01&endDate=2024-12-31

// 獲取活動統計
GET /api/activities?stats=true
```

### 在代碼中使用

```typescript
import { logActivity } from '@/lib/mongodb/activity';
import { logUserActivity } from '@/lib/utils/activityLogger';

// 服務器端
await logActivity(userId, 'page_view', { page: '/dashboard' });

// 客戶端
await logUserActivity('node_complete', { nodeId: 123, courseId: 456 });
```

## 數據清理

為了避免數據庫過度增長，建議定期清理舊的活動記錄。您可以使用以下函數：

```typescript
import { deleteOldActivities } from '@/lib/mongodb/activity';

// 刪除 365 天前的記錄
await deleteOldActivities(365);
```

## 故障排除

### 連接失敗

1. 檢查 `MONGODB_URI` 是否正確
2. 確認網絡訪問列表包含您的 IP 地址
3. 驗證數據庫用戶憑證是否正確
4. 檢查 MongoDB Atlas 集群是否正在運行

### 數據未寫入

1. 檢查瀏覽器控制台是否有錯誤
2. 確認用戶已登入（活動記錄需要認證）
3. 查看 MongoDB Atlas 的日誌

### 性能問題

1. 考慮為 `timestamp` 和 `userId` 字段創建索引
2. 定期清理舊數據
3. 考慮使用批量插入來提高性能

## 安全建議

1. **生產環境**: 只允許特定 IP 地址訪問
2. **密碼**: 使用強密碼並定期更換
3. **權限**: 使用最小權限原則
4. **監控**: 定期檢查異常活動
5. **備份**: 定期備份重要數據

## 更多資源

- [MongoDB Atlas 文檔](https://docs.atlas.mongodb.com/)
- [MongoDB Node.js 驅動程序文檔](https://docs.mongodb.com/drivers/node/)
- [MongoDB 最佳實踐](https://docs.mongodb.com/manual/administration/production-notes/)

