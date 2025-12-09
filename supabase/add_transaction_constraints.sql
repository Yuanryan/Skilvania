-- =============================================
-- 事务管理和并发控制所需的数据库约束
-- =============================================
-- 
-- 这些约束确保数据一致性并防止并发问题：
-- 1. 防止重复的用户进度记录
-- 2. 防止重复的评分记录
-- 3. 确保标签名称唯一
-- 4. 确保课程标签关联唯一
--
-- 执行此文件以添加所有必需的约束
-- =============================================

-- 1. 用户进度唯一约束
-- 确保每个用户对每个节点只有一个进度记录
-- 这防止了节点完成时的并发问题（重复奖励 XP）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_node'
    ) THEN
        ALTER TABLE userprogress 
        ADD CONSTRAINT unique_user_node UNIQUE (UserID, NodeID);
        RAISE NOTICE 'Added constraint: unique_user_node';
    ELSE
        RAISE NOTICE 'Constraint unique_user_node already exists';
    END IF;
END $$;

-- 2. 评分唯一约束
-- 确保每个用户对每个课程只有一个评分
-- 这防止了评分创建时的并发问题（重复评分）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_course_user_rating'
    ) THEN
        ALTER TABLE courserating 
        ADD CONSTRAINT unique_course_user_rating UNIQUE (CourseID, UserID);
        RAISE NOTICE 'Added constraint: unique_course_user_rating';
    ELSE
        RAISE NOTICE 'Constraint unique_course_user_rating already exists';
    END IF;
END $$;

-- 3. 标签名称唯一约束
-- 确保标签名称唯一（如果还没有）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_tag_name'
    ) THEN
        ALTER TABLE tag 
        ADD CONSTRAINT unique_tag_name UNIQUE (Name);
        RAISE NOTICE 'Added constraint: unique_tag_name';
    ELSE
        RAISE NOTICE 'Constraint unique_tag_name already exists';
    END IF;
END $$;

-- 4. 课程标签关联唯一约束
-- 确保每个课程对每个标签只有一个关联
-- 这防止了标签更新时的重复关联
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_course_tag'
    ) THEN
        ALTER TABLE course_tag 
        ADD CONSTRAINT unique_course_tag UNIQUE (CourseID, TagID);
        RAISE NOTICE 'Added constraint: unique_course_tag';
    ELSE
        RAISE NOTICE 'Constraint unique_course_tag already exists';
    END IF;
END $$;

-- =============================================
-- 验证约束
-- =============================================
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname IN (
    'unique_user_node',
    'unique_course_user_rating',
    'unique_tag_name',
    'unique_course_tag'
)
ORDER BY conname;

