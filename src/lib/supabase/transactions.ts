/**
 * Supabase 事务管理和并发控制工具
 * 
 * 由于 Supabase (PostgreSQL) 不支持跨表事务，我们使用以下策略：
 * 1. 数据库级别的唯一约束
 * 2. 乐观锁（版本号）
 * 3. Upsert 操作
 * 4. 重试机制
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 重试配置
 */
interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 100, // 毫秒
  retryableErrors: ['23505', '23503'], // 唯一约束违反、外键约束违反
};

/**
 * 带重试的数据库操作
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries, retryDelay, retryableErrors } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // 检查是否是可重试的错误
      const errorCode = error?.code || error?.message?.match(/error code: (\d+)/)?.[1];
      const isRetryable = retryableErrors?.some(code => 
        errorCode === code || error?.message?.includes(code)
      );
      
      if (!isRetryable || attempt >= maxRetries) {
        throw error;
      }
      
      // 指数退避
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * 安全的 Upsert 操作（用于评分等需要唯一约束的场景）
 */
export async function safeUpsert<T>(
  supabase: SupabaseClient,
  table: string,
  data: any,
  uniqueKey: string | string[],
  updateFields?: string[]
): Promise<{ data: T | null; error: any }> {
  // 构建唯一键查询
  const query = Array.isArray(uniqueKey)
    ? uniqueKey.reduce((q, key) => q.eq(key, data[key]), supabase.from(table).select('*'))
    : supabase.from(table).select('*').eq(uniqueKey, data[uniqueKey]);
  
  const { data: existing, error: selectError } = await query.single();
  
  if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found
    return { data: null, error: selectError };
  }
  
  if (existing) {
    // 更新现有记录
    const updateData: any = {};
    const fieldsToUpdate = updateFields || Object.keys(data).filter(k => !Array.isArray(uniqueKey) || !uniqueKey.includes(k));
    
    fieldsToUpdate.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });
    
    // 添加 UpdatedAt 时间戳
    if (updateData.UpdatedAt === undefined) {
      updateData.UpdatedAt = new Date().toISOString();
    }
    
    const updateQuery = Array.isArray(uniqueKey)
      ? uniqueKey.reduce((q, key) => q.eq(key, data[key]), supabase.from(table).update(updateData))
      : supabase.from(table).update(updateData).eq(uniqueKey, data[uniqueKey]);
    
    const { data: updated, error: updateError } = await updateQuery.select().single();
    return { data: updated as T, error: updateError };
  } else {
    // 插入新记录
    const insertData = {
      ...data,
      CreatedAt: data.CreatedAt || new Date().toISOString(),
      UpdatedAt: data.UpdatedAt || new Date().toISOString(),
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from(table)
      .insert(insertData)
      .select()
      .single();
    
    return { data: inserted as T, error: insertError };
  }
}

/**
 * 使用乐观锁更新记录
 * 要求表有 Version 字段
 */
export async function optimisticUpdate<T>(
  supabase: SupabaseClient,
  table: string,
  id: number,
  idColumn: string,
  updates: any,
  currentVersion?: number
): Promise<{ data: T | null; error: any; conflict: boolean }> {
  // 如果提供了版本号，先检查
  if (currentVersion !== undefined) {
    const { data: current, error: checkError } = await supabase
      .from(table)
      .select('Version')
      .eq(idColumn, id)
      .single();
    
    if (checkError) {
      return { data: null, error: checkError, conflict: false };
    }
    
    if (current?.Version !== currentVersion) {
      return { data: null, error: null, conflict: true };
    }
  }
  
  // 更新版本号
  const updateData = {
    ...updates,
    Version: currentVersion !== undefined ? currentVersion + 1 : undefined,
    UpdatedAt: new Date().toISOString(),
  };
  
  const { data: updated, error } = await supabase
    .from(table)
    .update(updateData)
    .eq(idColumn, id)
    .select()
    .single();
  
  return { data: updated as T, error, conflict: false };
}

/**
 * 原子性的标签更新操作
 * 先删除旧标签，再插入新标签，使用事务模拟
 */
export async function atomicTagUpdate(
  supabase: SupabaseClient,
  courseId: number,
  tagNames: string[]
): Promise<{ success: boolean; error?: any }> {
  try {
    // 1. 删除现有标签关联
    const { error: deleteError } = await supabase
      .from('course_tag')
      .delete()
      .eq('CourseID', courseId);
    
    if (deleteError) {
      return { success: false, error: deleteError };
    }
    
    // 2. 获取或创建标签（tag 表没有 UpdatedAt 字段，需要特殊处理）
    // 标签可以被多个课程重复使用，所以先查找是否存在
    const tagIds: number[] = [];
    for (const tagName of tagNames) {
      if (!tagName || typeof tagName !== 'string' || !tagName.trim()) continue;
      
      const trimmedName = tagName.trim();
      let tagId: number | null = null;
      
      // 先查找是否已存在（标签名称是唯一的，可以被多个课程重复使用）
      const { data: existingTag, error: findError } = await supabase
        .from('tag')
        .select('TagID')
        .eq('Name', trimmedName)
        .maybeSingle();
      
      if (existingTag) {
        // 标签已存在，直接使用（标签可以被重复使用）
        tagId = existingTag.TagID;
      } else if (!findError || findError.code === 'PGRST116') {
        // 标签不存在，尝试创建新标签
        const { data: newTag, error: insertError } = await supabase
          .from('tag')
          .insert({ Name: trimmedName })
          .select('TagID')
          .single();
        
        if (insertError) {
          // 如果是主键冲突（序列问题），立即重新查找
          if (insertError.code === '23505') {
            console.warn(`Tag 序列冲突，重新查找标签: "${trimmedName}"`);
            
            // 立即重新查找（序列冲突意味着标签可能已存在，只是序列值不同步）
            const { data: retryTag } = await supabase
              .from('tag')
              .select('TagID')
              .eq('Name', trimmedName)
              .maybeSingle();
            
            if (retryTag) {
              tagId = retryTag.TagID;
              console.log(`找到现有标签: "${trimmedName}" (TagID: ${tagId})`);
            } else {
              console.error(`无法创建或找到标签 "${trimmedName}"。请执行 supabase/fix_tag_sequence.sql 修复序列`);
            }
          } else {
            // 其他插入错误
            console.error('Error creating tag:', insertError);
          }
        } else if (newTag) {
          tagId = newTag.TagID;
        }
      } else {
        // 其他查找错误
        console.error('Error finding tag:', findError);
      }
      
      if (tagId) {
        tagIds.push(tagId);
      } else {
        console.warn(`Skipping tag "${trimmedName}" - could not create or find`);
      }
    }
    
    // 3. 插入新的标签关联
    if (tagIds.length > 0) {
      const courseTags = tagIds.map(tagId => ({
        CourseID: courseId,
        TagID: tagId,
      }));
      
      const { error: insertError } = await supabase
        .from('course_tag')
        .insert(courseTags);
      
      if (insertError) {
        return { success: false, error: insertError };
      }
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * 防止重复完成的节点完成操作
 * 使用数据库唯一约束 + 重试机制
 */
export async function safeNodeComplete(
  supabase: SupabaseClient,
  userId: number,
  nodeId: number,
  xpReward: number
): Promise<{
  success: boolean;
  progressId?: number;
  xpGained?: number;
  alreadyCompleted?: boolean;
  error?: any;
}> {
  try {
    // 先检查是否已经完成
    const { data: existingProgress, error: checkError } = await supabase
      .from('userprogress')
      .select('ProgressID, Status, CompletedAt')
      .eq('UserID', userId)
      .eq('NodeID', nodeId)
      .single();
    
    // 如果记录存在且已完成，直接返回
    if (existingProgress && existingProgress.Status === 'completed') {
      return {
        success: true,
        progressId: existingProgress.ProgressID,
        xpGained: 0,
        alreadyCompleted: true,
      };
    }
    
    // 如果记录不存在，创建新记录；如果存在但未完成，更新状态
    const progressData = {
      UserID: userId,
      NodeID: nodeId,
      Status: 'completed' as const,
      CompletedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };
    
    let progressId: number;
    let wasNew = false;
    
    if (!existingProgress) {
      // 创建新记录
      const { data: newProgress, error: insertError } = await supabase
        .from('userprogress')
        .insert(progressData)
        .select('ProgressID')
        .single();
      
      if (insertError) {
        // 如果是唯一约束错误，说明并发创建了，重新查询
        if (insertError.code === '23505') {
          const { data: concurrentProgress } = await supabase
            .from('userprogress')
            .select('ProgressID, Status')
            .eq('UserID', userId)
            .eq('NodeID', nodeId)
            .single();
          
          if (concurrentProgress?.Status === 'completed') {
            return {
              success: true,
              progressId: concurrentProgress.ProgressID,
              xpGained: 0,
              alreadyCompleted: true,
            };
          }
        }
        return { success: false, error: insertError };
      }
      
      progressId = newProgress.ProgressID;
      wasNew = true;
    } else {
      // 更新现有记录
      const { data: updatedProgress, error: updateError } = await supabase
        .from('userprogress')
        .update(progressData)
        .eq('ProgressID', existingProgress.ProgressID)
        .select('ProgressID')
        .single();
      
      if (updateError) {
        return { success: false, error: updateError };
      }
      
      progressId = updatedProgress.ProgressID;
      wasNew = existingProgress.Status !== 'completed';
    }
    
    // 只有在首次完成时才奖励 XP
    if (wasNew) {
      // 更新用户 XP
      const { data: user, error: userError } = await supabase
        .from('USER')
        .select('XP, Level')
        .eq('UserID', userId)
        .single();
      
      if (userError || !user) {
        console.error('Error fetching user:', userError);
        return {
          success: true,
          progressId,
          xpGained: xpReward,
          error: userError,
        };
      }
      
      const newXP = (user.XP || 0) + xpReward;
      const newLevel = Math.floor(newXP / 500) + 1;
      
      const { error: xpError } = await supabase
        .from('USER')
        .update({
          XP: newXP,
          Level: newLevel,
          UpdatedAt: new Date().toISOString(),
        })
        .eq('UserID', userId);
      
      if (xpError) {
        console.error('Error updating XP:', xpError);
        return {
          success: true,
          progressId,
          xpGained: xpReward,
          error: xpError,
        };
      }
      
      return {
        success: true,
        progressId,
        xpGained: xpReward,
        alreadyCompleted: false,
      };
    }
    
    return {
      success: true,
      progressId,
      xpGained: 0,
      alreadyCompleted: true,
    };
  } catch (error) {
    return { success: false, error };
  }
}

