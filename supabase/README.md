# 資料庫設置說明

## 🚀 快速設置（推薦）

使用自動化設置腳本：

```bash
./setup_schemas.sh
```

這個腳本會引導你按正確順序執行所有 schema 文件。

## 手動設置步驟

### 1. 執行基礎 Schema

首先執行基礎的資料庫 schema（如果還沒執行過）：

1. 登入 Supabase Dashboard
2. 進入 SQL Editor
3. 複製 `schema.sql` 的內容並執行

這會創建：
- USER 表
- COURSE 表（課程）
- NODE 表（節點）
- EDGE 表（連接線）
- USERPROGRESS 表（學習進度）
- 以及其他核心表格

### 2. 執行 Auth Schema

執行認證橋接 schema 以支援 Google OAuth：

1. 在 SQL Editor 中
2. 複製 `auth_schema.sql` 的內容並執行

這會創建：
- auth_user_bridge 表（認證橋接表）

### 3. 執行 Community Schema

執行社群功能 schema：

1. 在 SQL Editor 中
2. 複製 `community_schema.sql` 的內容並執行

這會創建：
- community_profiles 表（社群個人檔案）
- buddy_connections 表（學習夥伴連接）
- community_messages 表（社群訊息）

### 4. 驗證設置

執行 `validate_setup.sql` 中的查詢來驗證所有表格是否創建成功：

或者手動執行：

```sql
-- 檢查所有表格是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('USER', 'course', 'node', 'edge', 'userprogress', 'auth_user_bridge', 'community_profiles', 'buddy_connections', 'community_messages');
```

應該返回 9 行，包含所有必要的表格。

## 注意事項

- 所有表格都啟用了 Row Level Security (RLS)
- 只有課程創建者可以編輯自己的課程
- 節點和連接會自動級聯刪除
- 社群功能需要先設置 auth_user_bridge 表
- Google OAuth 用戶需要通過 auth_user_bridge 橋接到 USER 表

## 🔧 故障排除

### "auth_user_bridge" 表不存在錯誤

如果遇到 `relation "auth_user_bridge" does not exist` 錯誤：

1. **確保執行順序正確**：必須先執行 `auth_schema.sql` 再執行其他 schema
2. **使用設置腳本**：運行 `./setup_schemas.sh` 確保正確順序
3. **檢查執行狀態**：使用 `validate_setup.sql` 驗證所有表格存在

應用程式會在資料庫表格不存在時自動使用 Mock 模式，但某些功能需要完整設置才能運作。

## 故障排除

如果遇到權限錯誤：
1. 檢查 RLS policies 是否正確創建
2. 確認 auth_user_bridge 表有正確的資料
3. 檢查 Supabase Auth 是否正常運作

