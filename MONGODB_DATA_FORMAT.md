# MongoDB 活動記錄數據格式

本系統的所有使用者行為（登入、註冊、課程瀏覽、節點完成…）都會記錄在：

**MongoDB → skilvania → user_activities 集合**

為提高分析效率，活動紀錄採用**最小必要格式（Minimal Viable Schema）**，只保留核心欄位，便於做 Aggregation 與報表分析。

## 🧱 1. 活動紀錄資料格式（Schema）

```typescript
{
  "_id": "ObjectId",                    // MongoDB 自動生成
  "userId": 123,                        // 用戶 ID（必需）
  "event": "login",                     // 事件名稱（必需）
  "timestamp": "2024-01-15T10:30:00Z", // 時間戳（必需）
  
  // 可選欄位（根據事件類型）
  "courseId": 456,                      // 課程 ID（課程/節點相關事件）
  "nodeId": 789,                        // 節點 ID（節點相關事件）
  "xpGained": 100                       // 獲得 XP（node_complete 專用）
}
```

## 💡 欄位保留理由（極簡但足夠）

| 欄位 | 保留理由 |
|------|---------|
| userId | 所有行為分析都需要 |
| event | 活動分類的核心 |
| timestamp | 分析趨勢必備 |
| courseId | 分析課程相關活動（start / complete / view nodes） |
| nodeId | 分析學習細節（node_view / complete） |
| xpGained | 記錄學習成效（node_complete 專用） |

所有非必要欄位已去除。

## 🧾 2. 各活動類型範例資料

### ✅ 登入（login）

```json
{
  "userId": 123,
  "event": "login",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### ✅ 登出（logout）

```json
{
  "userId": 123,
  "event": "logout",
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### ✅ 註冊（register）

```json
{
  "userId": 123,
  "event": "register",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### ✅ 開始課程（course_start）

```json
{
  "userId": 123,
  "event": "course_start",
  "courseId": 456,
  "timestamp": "2024-01-15T11:00:00Z"
}
```

### ✅ 完成課程（course_complete）

```json
{
  "userId": 123,
  "event": "course_complete",
  "courseId": 456,
  "timestamp": "2024-01-15T11:25:00Z"
}
```

### ✅ 查看節點（node_view）

```json
{
  "userId": 123,
  "event": "node_view",
  "courseId": 456,
  "nodeId": 789,
  "timestamp": "2024-01-15T11:10:00Z"
}
```

### ✅ 完成節點（node_complete）

```json
{
  "userId": 123,
  "event": "node_complete",
  "courseId": 456,
  "nodeId": 789,
  "xpGained": 100,
  "timestamp": "2024-01-15T11:15:00Z"
}
```

### ✅ 創建課程（course_create）

```json
{
  "userId": 123,
  "event": "course_create",
  "courseId": 456,
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### ✅ 創建節點（node_create）

```json
{
  "userId": 123,
  "event": "node_create",
  "courseId": 456,
  "nodeId": 789,
  "timestamp": "2024-01-15T10:05:00Z"
}
```

## 🔍 3. 查詢範例

### 查詢特定用戶的所有活動
```javascript
db.user_activities.find({ userId: 123 })
```

### 查詢特定事件類型
```javascript
db.user_activities.find({ event: "login" })
```

### 查詢特定課程的所有活動
```javascript
db.user_activities.find({ courseId: 456 })
```

### 查詢時間範圍內的活動
```javascript
db.user_activities.find({
  timestamp: {
    $gte: ISODate("2024-01-01T00:00:00Z"),
    $lte: ISODate("2024-01-31T23:59:59Z")
  }
})
```

### Aggregation 範例：統計每個事件類型的數量
```javascript
db.user_activities.aggregate([
  {
    $group: {
      _id: "$event",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }
  }
])
```

### Aggregation 範例：統計每個用戶的活動數量
```javascript
db.user_activities.aggregate([
  {
    $group: {
      _id: "$userId",
      totalActivities: { $sum: 1 },
      events: { $push: "$event" }
    }
  }
])
```

### Aggregation 範例：統計課程完成率
```javascript
db.user_activities.aggregate([
  {
    $match: { event: "course_start" }
  },
  {
    $group: {
      _id: "$courseId",
      startedCount: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "user_activities",
      let: { courseId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$courseId", "$$courseId"] },
                { $eq: ["$event", "course_complete"] }
              ]
            }
          }
        }
      ],
      as: "completed"
    }
  },
  {
    $project: {
      courseId: "$_id",
      startedCount: 1,
      completedCount: { $size: "$completed" },
      completionRate: {
        $cond: {
          if: { $gt: ["$startedCount", 0] },
          then: {
            $divide: [
              { $size: "$completed" },
              "$startedCount"
            ]
          },
          else: 0
        }
      }
    }
  }
])
```

## 📝 4. 程式碼使用範例

### 服務器端記錄
```typescript
import { logActivity } from '@/lib/mongodb/activity';

// 記錄登入
await logActivity(userId, 'login');

// 記錄課程開始
await logActivity(userId, 'course_start', {
  courseId: 456,
});

// 記錄節點完成
await logActivity(userId, 'node_complete', {
  courseId: 456,
  nodeId: 789,
  xpGained: 100,
});
```

### 客戶端記錄
```typescript
import { logUserActivity, logNodeView, logNodeComplete } from '@/lib/utils/activityLogger';

// 記錄登出
await logUserActivity('logout');

// 記錄節點查看
await logNodeView(nodeId, courseId);

// 記錄節點完成
await logNodeComplete(nodeId, courseId, xpGained);
```

## 🎯 5. 優勢

1. **極簡結構**：只保留核心欄位，減少存儲空間
2. **易於聚合**：可以直接對 `event`, `courseId`, `nodeId` 等欄位進行聚合
3. **查詢高效**：欄位少，索引更有效
4. **類型安全**：TypeScript 類型定義確保數據一致性
5. **易於擴展**：未來需要時可以添加新欄位

## 📊 6. 事件類型列表

| 事件類型 | 必需欄位 | 可選欄位 |
|---------|---------|---------|
| login | userId, event, timestamp | - |
| logout | userId, event, timestamp | - |
| register | userId, event, timestamp | - |
| course_start | userId, event, timestamp | courseId |
| course_complete | userId, event, timestamp | courseId |
| course_create | userId, event, timestamp | courseId |
| node_view | userId, event, timestamp | courseId, nodeId |
| node_complete | userId, event, timestamp | courseId, nodeId, xpGained |
| node_create | userId, event, timestamp | courseId, nodeId |
