/**
 * 客戶端活動記錄工具
 * 用於在客戶端組件中記錄用戶活動
 */

import { ActivityType } from '@/types';

/**
 * 記錄用戶活動（客戶端使用）
 */
export async function logUserActivity(
  activityType: ActivityType,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // 生成或獲取會話 ID
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }

    // 添加額外的客戶端元數據
    const enhancedMetadata = {
      ...metadata,
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    await fetch('/api/activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activityType,
        metadata: enhancedMetadata,
        sessionId,
      }),
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // 不拋出錯誤，避免影響主要功能
  }
}

/**
 * 記錄頁面瀏覽
 */
export function logPageView(page: string, metadata?: Record<string, any>) {
  return logUserActivity('page_view', {
    page,
    ...metadata,
  });
}

/**
 * 記錄節點查看
 */
export function logNodeView(
  nodeId: number,
  courseId: number,
  metadata?: Record<string, any>
) {
  return logUserActivity('node_view', {
    nodeId,
    courseId,
    ...metadata,
  });
}

/**
 * 記錄節點完成
 */
export function logNodeComplete(
  nodeId: number,
  courseId: number,
  xpGained: number,
  metadata?: Record<string, any>
) {
  return logUserActivity('node_complete', {
    nodeId,
    courseId,
    xpGained,
    ...metadata,
  });
}

/**
 * 記錄搜尋活動
 */
export function logSearch(query: string, resultsCount?: number) {
  return logUserActivity('search', {
    searchQuery: query,
    resultsCount,
  });
}

/**
 * React Hook 用於自動記錄頁面瀏覽
 */
export function usePageView(page: string) {
  if (typeof window !== 'undefined') {
    // 只在客戶端執行
    logPageView(page);
  }
}

