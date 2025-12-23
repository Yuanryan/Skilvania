# Supabase Storage 設置指南

## 設置 course-media Bucket

為了使用圖片上傳功能，需要在 Supabase 中設置 Storage bucket。

### 步驟 1: 創建 Bucket

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 前往 **Storage** 頁面
4. 點擊 **New bucket**
5. 設置以下資訊：
   - **Name**: `course-image`
   - **Public bucket**: ✅ 勾選（讓圖片可以公開訪問）
   - **File size limit**: 5 MB（或根據需求調整）
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,application/pdf`

### 步驟 2: 設置 Storage Policies（可選）

如果需要更細緻的權限控制，可以設置 Storage Policies：

#### 公開讀取政策（Public Read）

```sql
-- 允許所有人讀取圖片
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-image');
```

#### 僅創建者上傳政策（Creator Upload Only）

```sql
-- 只允許課程創建者上傳圖片
CREATE POLICY "Course creators can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-image' AND
  EXISTS (
    SELECT 1
    FROM auth_user_bridge uab
    JOIN public."USER" u ON uab.user_id = u."UserID"
    JOIN course c ON c."CreatorID" = u."UserID"
    WHERE uab.auth_user_id = auth.uid()
  )
);
```

### 步驟 3: 驗證設置

1. 在 Storage 頁面確認 `course-media` bucket 已創建
2. 確認 bucket 是公開的（Public bucket）
3. 測試上傳功能：
   - 前往課程編輯頁面
   - 點擊 Markdown 編輯器的圖片按鈕
   - 選擇「上傳圖片」模式
   - 上傳一張測試圖片
   - 確認圖片可以正常顯示

## 文件結構

上傳的圖片會按照以下結構存儲：

```
course-image/
  └── course-{courseId}/
      └── node-{nodeId}/
          └── {timestamp}-{randomString}.{ext}
```

例如：
```
course-image/
  └── course-1/
      └── node-5/
          └── 1704067200000-abc123def456.jpg
```

## 限制

- **文件大小**: 
  - 一般圖片（JPEG、PNG、GIF、WebP）：最大 5MB
  - PDF、HEIC、HEIF：最大 10MB
- **文件類型**: 支援 JPEG、PNG、GIF、WebP、HEIC、HEIF、PDF
- **權限**: 只有課程創建者可以上傳文件
- **壓縮**: 一般圖片會自動壓縮，PDF 和 HEIC 不壓縮

## 故障排除

### 錯誤：Bucket not found
- 確認 bucket 名稱是 `course-image`（完全一致）
- 確認 bucket 已創建且可見

### 錯誤：Permission denied
- 確認 bucket 設置為 Public
- 檢查 Storage Policies 是否正確設置

### 錯誤：File too large
- 確認文件大小不超過 5MB
- 可以在 Supabase Dashboard 中調整 bucket 的文件大小限制

### 圖片無法顯示
- 確認 bucket 是 Public
- 檢查圖片 URL 是否正確
- 查看瀏覽器控制台是否有 CORS 錯誤

