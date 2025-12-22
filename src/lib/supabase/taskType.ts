/**
 * TASKTYPE 工具函数
 * 处理节点类型（TypeID）和类型名称（TypeName）之间的映射
 */

import { SupabaseClient } from '@supabase/supabase-js';

// 类型名称到 TypeID 的映射缓存
const typeNameToIdCache = new Map<string, number>();

/**
 * 根据类型名称获取或创建 TypeID
 * @param supabase Supabase 客户端
 * @param typeName 类型名称（'theory', 'code', 'project'）
 * @returns TypeID
 */
export async function getOrCreateTypeID(
  supabase: SupabaseClient,
  typeName: string
): Promise<number | null> {
  // 检查缓存
  if (typeNameToIdCache.has(typeName)) {
    return typeNameToIdCache.get(typeName)!;
  }

  try {
    // 先查找是否已存在（Supabase 表名通常是小写）
    const { data: existingType, error: findError } = await supabase
      .from('tasktype')
      .select('TypeID')
      .eq('TypeName', typeName)
      .single();

    if (existingType && !findError) {
      typeNameToIdCache.set(typeName, existingType.TypeID);
      return existingType.TypeID;
    }

    // 如果不存在，创建新类型
    const { data: newType, error: insertError } = await supabase
      .from('tasktype')
      .insert({ TypeName: typeName })
      .select('TypeID')
      .single();

    if (insertError || !newType) {
      console.error('Error creating task type:', insertError);
      return null;
    }

    typeNameToIdCache.set(typeName, newType.TypeID);
    return newType.TypeID;
  } catch (error) {
    console.error('Error in getOrCreateTypeID:', error);
    return null;
  }
}

/**
 * 根据 TypeID 获取类型名称
 * @param supabase Supabase 客户端
 * @param typeID TypeID
 * @returns 类型名称
 */
export async function getTypeName(
  supabase: SupabaseClient,
  typeID: number | null
): Promise<string | null> {
  if (!typeID) {
    return null;
  }

  try {
    const { data: taskType, error } = await supabase
      .from('tasktype')
      .select('TypeName')
      .eq('TypeID', typeID)
      .single();

    if (error || !taskType) {
      console.error('Error fetching task type:', error);
      return null;
    }

    return taskType.TypeName;
  } catch (error) {
    console.error('Error in getTypeName:', error);
    return null;
  }
}

/**
 * 批量获取类型名称
 * @param supabase Supabase 客户端
 * @param typeIDs TypeID 数组
 * @returns TypeID 到 TypeName 的映射
 */
export async function getTypeNames(
  supabase: SupabaseClient,
  typeIDs: number[]
): Promise<Map<number, string>> {
  const typeMap = new Map<number, string>();

  if (typeIDs.length === 0) {
    return typeMap;
  }

  try {
    const { data: taskTypes, error } = await supabase
      .from('tasktype')
      .select('TypeID, TypeName')
      .in('TypeID', typeIDs);

    if (error || !taskTypes) {
      console.error('Error fetching task types:', error);
      return typeMap;
    }

    taskTypes.forEach(tt => {
      typeMap.set(tt.TypeID, tt.TypeName);
    });

    return typeMap;
  } catch (error) {
    console.error('Error in getTypeNames:', error);
    return typeMap;
  }
}

/**
 * 将 TypeName 转换为 NodeType（兼容旧代码）
 * @param typeName 类型名称
 * @returns NodeType
 */
export function typeNameToNodeType(typeName: string | null): 'theory' | 'code' | 'project' | 'guide' | 'tutorial' | 'checklist' | 'resource' {
  if (!typeName) {
    return 'theory';
  }

  const normalized = typeName.toLowerCase();
  const validTypes: Array<'theory' | 'code' | 'project' | 'guide' | 'tutorial' | 'checklist' | 'resource'> = 
    ['theory', 'code', 'project', 'guide', 'tutorial', 'checklist', 'resource'];
  
  if (validTypes.includes(normalized as any)) {
    return normalized as 'theory' | 'code' | 'project' | 'guide' | 'tutorial' | 'checklist' | 'resource';
  }

  // 默认返回 theory
  return 'theory';
}

/**
 * 将 NodeType 转换为 TypeName
 * @param nodeType NodeType
 * @returns 类型名称
 */
export function nodeTypeToTypeName(nodeType: 'theory' | 'code' | 'project' | 'guide' | 'tutorial' | 'checklist' | 'resource'): string {
  return nodeType;
}

