# 事务管理和并发控制指南

## 📋 目录

1. [概述](#概述)
2. [问题识别](#问题识别)
3. [解决方案](#解决方案)
4. [实现细节](#实现细节)
5. [使用示例](#使用示例)
6. [最佳实践](#最佳实践)
7. [数据库约束要求](#数据库约束要求)

---

## 概述

由于 Supabase (PostgreSQL) 在应用层不支持跨表事务，我们需要使用其他策略来确保数据一致性和防止并发问题。本文档说明了系统中需要事务管理和并发控制的关键场景，以及如何正确处理它们。

---

## 问题识别

### 🔴 需要事务管理的场景

#### 1. **节点完成操作** (`/api/courses/[courseId]/nodes/[nodeId]/complete`)

**问题：**
- 多个请求同时完成同一节点可能导致重复奖励 XP
- 进度记录创建和 XP 更新不是原子操作
- 竞态条件：检查 → 创建/更新 → 奖励 XP 之间存在时间窗口

**影响：**
- 用户可能获得多次 XP 奖励
- 数据不一致

#### 2. **评分创建/更新** (`/api/courses/[courseId]/ratings`)

**问题：**
- 两个请求同时检查"是否已有评分"可能都返回 false
- 导致创建重复评分记录

**影响：**
- 违反业务规则（一个用户对一个课程只能有一个评分）
- 数据重复

#### 3. **课程标签更新** (`/api/courses/[courseId]`)

**问题：**
- 删除旧标签和插入新标签之间没有事务保护
- 如果插入失败，旧标签已被删除，导致数据丢失

**影响：**
- 标签关联可能丢失
- 数据不一致

#### 4. **课程创建** (`/api/courses`)

**问题：**
- 创建课程和创建标签关联不是原子操作
- 如果标签创建失败，课程已创建但无标签

**影响：**
- 部分数据创建失败
- 需要手动清理

---

## 解决方案

### 策略 1: 数据库唯一约束

**适用场景：** 防止重复记录

**实现：**
- 在数据库层面添加唯一约束
- 使用 `safeUpsert` 函数处理插入/更新

**示例：**
```sql
-- 用户进度唯一约束
ALTER TABLE userprogress 
ADD CONSTRAINT unique_user_node UNIQUE (UserID, NodeID);

-- 评分唯一约束
ALTER TABLE courserating 
ADD CONSTRAINT unique_course_user_rating UNIQUE (CourseID, UserID);
```

### 策略 2: 重试机制

**适用场景：** 处理临时性并发冲突

**实现：**
- 使用 `withRetry` 函数包装操作
- 指数退避重试

**示例：**
```typescript
const result = await withRetry(
  () => safeNodeComplete(supabase, userId, nodeId, xpReward),
  { maxRetries: 3, retryDelay: 50 }
);
```

### 策略 3: 原子性操作函数

**适用场景：** 需要多个步骤的操作

**实现：**
- `atomicTagUpdate`: 原子性更新标签
- `safeNodeComplete`: 安全的节点完成操作
- `safeUpsert`: 安全的插入/更新操作

### 策略 4: 乐观锁（可选）

**适用场景：** 需要版本控制的更新操作

**实现：**
- 使用 `optimisticUpdate` 函数
- 要求表有 `Version` 字段

---

## 实现细节

### 工具函数位置

所有事务管理和并发控制工具位于：
```
src/lib/supabase/transactions.ts
```

### 核心函数

#### 1. `withRetry<T>(operation, config?)`

带重试机制的数据库操作包装器。

**参数：**
- `operation`: 要执行的操作函数
- `config`: 重试配置
  - `maxRetries`: 最大重试次数（默认 3）
  - `retryDelay`: 初始重试延迟（默认 100ms）
  - `retryableErrors`: 可重试的错误代码数组

**返回：** Promise<T>

**示例：**
```typescript
const result = await withRetry(
  () => supabase.from('table').insert(data),
  { maxRetries: 3, retryDelay: 50 }
);
```

#### 2. `safeUpsert<T>(supabase, table, data, uniqueKey, updateFields?)`

安全的插入/更新操作，防止重复记录。

**参数：**
- `supabase`: Supabase 客户端
- `table`: 表名
- `data`: 要插入/更新的数据
- `uniqueKey`: 唯一键（字符串或字符串数组）
- `updateFields`: 可更新的字段数组（可选）

**返回：** `Promise<{ data: T | null; error: any }>`

**示例：**
```typescript
const { data, error } = await safeUpsert(
  supabase,
  'courserating',
  {
    CourseID: 1,
    UserID: 123,
    RatingScore: 5,
    Comment: 'Great course!'
  },
  ['CourseID', 'UserID'], // 唯一键
  ['RatingScore', 'Comment', 'ReviewedAt'] // 可更新字段
);
```

#### 3. `atomicTagUpdate(supabase, courseId, tagNames)`

原子性更新课程标签。

**参数：**
- `supabase`: Supabase 客户端
- `courseId`: 课程 ID
- `tagNames`: 标签名称数组

**返回：** `Promise<{ success: boolean; error?: any }>`

**示例：**
```typescript
const { success, error } = await atomicTagUpdate(
  supabase,
  courseId,
  ['JavaScript', 'React', 'Node.js']
);
```

#### 4. `safeNodeComplete(supabase, userId, nodeId, xpReward)`

安全的节点完成操作，防止重复奖励 XP。

**参数：**
- `supabase`: Supabase 客户端
- `userId`: 用户 ID
- `nodeId`: 节点 ID
- `xpReward`: XP 奖励

**返回：** `Promise<{ success: boolean; progressId?: number; xpGained?: number; alreadyCompleted?: boolean; error?: any }>`

**示例：**
```typescript
const result = await safeNodeComplete(
  supabase,
  userId,
  nodeId,
  100
);

if (result.success && !result.alreadyCompleted) {
  console.log(`Gained ${result.xpGained} XP!`);
}
```

#### 5. `optimisticUpdate<T>(supabase, table, id, idColumn, updates, currentVersion?)`

使用乐观锁的更新操作。

**参数：**
- `supabase`: Supabase 客户端
- `table`: 表名
- `id`: 记录 ID
- `idColumn`: ID 列名
- `updates`: 要更新的数据
- `currentVersion`: 当前版本号（可选）

**返回：** `Promise<{ data: T | null; error: any; conflict: boolean }>`

**示例：**
```typescript
const { data, error, conflict } = await optimisticUpdate(
  supabase,
  'course',
  courseId,
  'CourseID',
  { Title: 'New Title' },
  currentVersion
);

if (conflict) {
  // 处理版本冲突
}
```

---

## 使用示例

### 示例 1: 节点完成（已修复）

```typescript
// src/app/api/courses/[courseId]/nodes/[nodeId]/complete/route.ts
import { safeNodeComplete, withRetry } from '@/lib/supabase/transactions';

export async function POST(request: NextRequest, { params }) {
  // ... 验证和获取数据 ...
  
  // 使用安全的事务操作完成节点（带重试机制）
  const result = await withRetry(
    () => safeNodeComplete(supabase, userId, nodeIdInt, xpReward),
    { maxRetries: 3, retryDelay: 50 }
  );

  if (!result.success) {
    return NextResponse.json({ error: 'Failed to complete node' }, { status: 500 });
  }

  if (result.alreadyCompleted) {
    return NextResponse.json({
      success: true,
      message: 'Node already completed',
      xpGained: 0,
      alreadyCompleted: true
    });
  }

  return NextResponse.json({
    success: true,
    xpGained: result.xpGained,
    // ...
  });
}
```

### 示例 2: 评分创建/更新（已修复）

```typescript
// src/app/api/courses/[courseId]/ratings/route.ts
import { safeUpsert, withRetry } from '@/lib/supabase/transactions';

export async function POST(request: NextRequest, { params }) {
  // ... 验证和获取数据 ...
  
  // 使用安全的 upsert 操作（防止并发创建重复评分）
  const { data: rating, error: ratingError } = await withRetry(
    () => safeUpsert(
      supabase,
      'courserating',
      {
        CourseID: courseIdInt,
        UserID: userId,
        RatingScore: ratingInt,
        Comment: comment?.trim() || null,
        ReviewedAt: new Date().toISOString()
      },
      ['CourseID', 'UserID'], // 唯一键
      ['RatingScore', 'Comment', 'ReviewedAt'] // 可更新字段
    ),
    { maxRetries: 3, retryDelay: 50 }
  );

  if (ratingError) {
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
  }

  return NextResponse.json({ rating });
}
```

### 示例 3: 课程标签更新（已修复）

```typescript
// src/app/api/courses/[courseId]/route.ts
import { atomicTagUpdate } from '@/lib/supabase/transactions';

export async function PUT(request: NextRequest, { params }) {
  // ... 更新课程信息 ...
  
  // 处理标签更新（使用原子性操作）
  if (tags !== undefined && Array.isArray(tags)) {
    const { success, error: tagError } = await atomicTagUpdate(
      supabase,
      parseInt(courseId),
      tags
    );

    if (!success && tagError) {
      console.error('Error updating course tags:', tagError);
      // 不中断流程，标签更新失败不影响课程更新
    }
  }
}
```

---

## 最佳实践

### ✅ 应该做的

1. **使用工具函数**
   - 对于需要事务的操作，使用 `transactions.ts` 中的工具函数
   - 不要直接使用 `insert`/`update`，除非确定不会有并发问题

2. **添加数据库约束**
   - 在数据库层面添加唯一约束
   - 使用外键约束保证数据完整性

3. **错误处理**
   - 检查操作结果
   - 记录错误但不中断用户流程（如果适用）

4. **重试机制**
   - 对于可能发生临时冲突的操作，使用 `withRetry`
   - 设置合理的重试次数和延迟

5. **幂等性设计**
   - 确保操作可以安全地重复执行
   - 使用 upsert 而不是 insert

### ❌ 不应该做的

1. **不要忽略并发问题**
   - 不要假设操作是顺序执行的
   - 不要忽略检查-然后-操作（Check-Then-Act）的竞态条件

2. **不要依赖应用层事务**
   - Supabase 不支持跨表事务
   - 不要假设多个操作会自动回滚

3. **不要忽略错误**
   - 不要静默忽略数据库错误
   - 记录错误以便调试

4. **不要过度重试**
   - 设置合理的重试次数
   - 不要无限重试

---

## 数据库约束要求

### 必需的唯一约束

为了确保并发控制正常工作，需要在数据库中添加以下约束：

#### 1. 用户进度唯一约束

```sql
-- 确保每个用户对每个节点只有一个进度记录
ALTER TABLE userprogress 
ADD CONSTRAINT unique_user_node UNIQUE (UserID, NodeID);

-- 如果约束已存在，先删除
-- ALTER TABLE userprogress DROP CONSTRAINT IF EXISTS unique_user_node;
```

#### 2. 评分唯一约束

```sql
-- 确保每个用户对每个课程只有一个评分
ALTER TABLE courserating 
ADD CONSTRAINT unique_course_user_rating UNIQUE (CourseID, UserID);

-- 如果约束已存在，先删除
-- ALTER TABLE courserating DROP CONSTRAINT IF EXISTS unique_course_user_rating;
```

#### 3. 标签唯一约束

```sql
-- 确保标签名称唯一（如果还没有）
ALTER TABLE tag 
ADD CONSTRAINT unique_tag_name UNIQUE (Name);

-- 如果约束已存在，先删除
-- ALTER TABLE tag DROP CONSTRAINT IF EXISTS unique_tag_name;
```

#### 4. 课程标签关联唯一约束

```sql
-- 确保每个课程对每个标签只有一个关联
ALTER TABLE course_tag 
ADD CONSTRAINT unique_course_tag UNIQUE (CourseID, TagID);

-- 如果约束已存在，先删除
-- ALTER TABLE course_tag DROP CONSTRAINT IF EXISTS unique_course_tag;
```

### 执行约束

在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- =============================================
-- 事务管理和并发控制所需的数据库约束
-- =============================================

-- 1. 用户进度唯一约束
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_node'
    ) THEN
        ALTER TABLE userprogress 
        ADD CONSTRAINT unique_user_node UNIQUE (UserID, NodeID);
    END IF;
END $$;

-- 2. 评分唯一约束
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_course_user_rating'
    ) THEN
        ALTER TABLE courserating 
        ADD CONSTRAINT unique_course_user_rating UNIQUE (CourseID, UserID);
    END IF;
END $$;

-- 3. 标签名称唯一约束（如果还没有）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_tag_name'
    ) THEN
        ALTER TABLE tag 
        ADD CONSTRAINT unique_tag_name UNIQUE (Name);
    END IF;
END $$;

-- 4. 课程标签关联唯一约束
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_course_tag'
    ) THEN
        ALTER TABLE course_tag 
        ADD CONSTRAINT unique_course_tag UNIQUE (CourseID, TagID);
    END IF;
END $$;
```

---

## 测试建议

### 并发测试场景

1. **节点完成并发测试**
   - 同时发送多个完成同一节点的请求
   - 验证：只奖励一次 XP

2. **评分并发测试**
   - 同时发送多个创建评分的请求
   - 验证：只创建一个评分记录

3. **标签更新测试**
   - 在标签更新过程中模拟失败
   - 验证：数据一致性

### 测试工具

可以使用以下工具进行并发测试：

```bash
# 使用 Apache Bench 进行并发测试
ab -n 100 -c 10 -p rating.json -T application/json \
  http://localhost:3000/api/courses/1/ratings

# 使用 curl 并行请求
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/courses/1/nodes/1/complete &
done
wait
```

---

## 总结

通过使用数据库约束、重试机制和原子性操作函数，我们可以在 Supabase 环境中实现有效的事务管理和并发控制。关键要点：

1. ✅ **识别并发问题**：检查-然后-操作模式
2. ✅ **使用数据库约束**：唯一约束防止重复
3. ✅ **使用工具函数**：`safeUpsert`、`atomicTagUpdate`、`safeNodeComplete`
4. ✅ **重试机制**：处理临时性冲突
5. ✅ **错误处理**：记录错误但不中断用户流程

---

## 相关文件

- 工具函数：`src/lib/supabase/transactions.ts`
- 节点完成 API：`src/app/api/courses/[courseId]/nodes/[nodeId]/complete/route.ts`
- 评分 API：`src/app/api/courses/[courseId]/ratings/route.ts`
- 课程更新 API：`src/app/api/courses/[courseId]/route.ts`
- 课程创建 API：`src/app/api/courses/route.ts`

---

**最后更新：** 2024年

