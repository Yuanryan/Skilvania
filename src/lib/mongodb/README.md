# MongoDB 活動記錄模組

此模組提供用戶活動記錄功能，使用 MongoDB 存儲非結構化的使用記錄數據。

## 文件結構

- `client.ts`: MongoDB 客戶端連接配置
- `activity.ts`: 活動記錄的核心功能（記錄、查詢、統計）

## 使用方式

### 服務器端記錄

```typescript
import { logActivity } from '@/lib/mongodb/activity';

// 記錄單個活動
await logActivity(
  userId,
  'page_view',
  { page: '/dashboard', duration: 120 },
  sessionId
);

// 批量記錄（性能優化）
import { logActivities } from '@/lib/mongodb/activity';

await logActivities([
  { userId: 1, activityType: 'page_view', metadata: { page: '/' } },
  { userId: 1, activityType: 'node_view', metadata: { nodeId: 123 } },
]);
```

### 客戶端記錄

```typescript
import { logUserActivity, logPageView, logNodeComplete } from '@/lib/utils/activityLogger';

// 通用活動記錄
await logUserActivity('search', { searchQuery: 'react' });

// 便捷函數
await logPageView('/courses');
await logNodeComplete(nodeId, courseId, xpGained);
```

### 查詢活動

```typescript
import { getActivities, getActivityStats } from '@/lib/mongodb/activity';

// 獲取活動列表
const activities = await getActivities({
  userId: 123,
  activityType: 'page_view',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  limit: 100,
  sort: 'desc',
});

// 獲取統計信息
const stats = await getActivityStats(
  userId,
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

## API 端點

### POST /api/activities

記錄用戶活動

**請求體**:
```json
{
  "activityType": "page_view",
  "metadata": {
    "page": "/dashboard"
  },
  "sessionId": "session_123"
}
```

### GET /api/activities

查詢用戶活動

**查詢參數**:
- `activityType`: 活動類型（可選）
- `startDate`: 開始日期（可選）
- `endDate`: 結束日期（可選）
- `limit`: 返回數量限制（默認 100）
- `skip`: 跳過數量（默認 0）
- `sort`: 排序方式 'asc' 或 'desc'（默認 'desc'）
- `stats`: 是否返回統計信息（'true' 或 'false'）

**示例**:
```
GET /api/activities?activityType=page_view&limit=50&stats=false
GET /api/activities?stats=true&startDate=2024-01-01
```

## 數據模型

```typescript
interface UserActivity {
  _id?: string;                    // MongoDB 自動生成的 ID
  userId: number;                  // 用戶 ID
  activityType: ActivityType;      // 活動類型
  timestamp: Date;                 // 活動發生時間
  metadata?: {                     // 額外的元數據
    [key: string]: any;
  };
  sessionId?: string;              // 會話 ID
  createdAt: Date;                 // 記錄創建時間
}
```

## 性能優化

1. **批量插入**: 使用 `logActivities()` 批量記錄多個活動
2. **異步處理**: 活動記錄是異步的，不會阻塞主要功能
3. **錯誤處理**: 記錄失敗不會影響應用程序的其他功能
4. **索引**: 建議為 `userId`、`timestamp` 和 `activityType` 創建索引

## 數據清理

定期清理舊數據以避免數據庫過度增長：

```typescript
import { deleteOldActivities } from '@/lib/mongodb/activity';

// 刪除 365 天前的記錄
const deletedCount = await deleteOldActivities(365);
console.log(`Deleted ${deletedCount} old activities`);
```

## 注意事項

1. 活動記錄需要用戶認證
2. 如果 MongoDB 連接失敗，記錄會靜默失敗，不會影響應用程序
3. 生產環境建議設置適當的索引以提高查詢性能
4. 定期清理舊數據以控制數據庫大小

