# 資料庫設置說明

## 設置步驟

### 1. 執行基礎 Schema

首先執行基礎的資料庫 schema（如果還沒執行過）：

1. 登入 Supabase Dashboard
2. 進入 SQL Editor
3. 複製 `schema.sql` 的內容並執行

這會創建：
- ROLES 表
- USER 表
- USERROLE 表
- auth_user_bridge 表

### 2. 執行 Creator Schema

然後執行 Creator 功能的擴展 schema：

1. 在 SQL Editor 中
2. 複製 `creator_schema.sql` 的內容並執行

這會創建：
- COURSE 表（課程）
- NODE 表（節點）
- EDGE 表（連接線）
- USERPROGRESS 表（學習進度）
- SUBMISSION 表（提交審核）

### 3. 驗證設置

執行以下查詢來驗證表格是否創建成功：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('COURSE', 'NODE', 'EDGE', 'USERPROGRESS', 'SUBMISSION');
```

應該返回 5 行。

## 注意事項

- 所有表格都啟用了 Row Level Security (RLS)
- 只有課程創建者可以編輯自己的課程
- 節點和連接會自動級聯刪除
- 課程的 TotalNodes 會自動更新

## 故障排除

如果遇到權限錯誤：
1. 檢查 RLS policies 是否正確創建
2. 確認 auth_user_bridge 表有正確的資料
3. 檢查 Supabase Auth 是否正常運作

