/**
 * 客戶端活動記錄工具
 * 用於在客戶端組件中記錄用戶活動
 */

import { EventType } from '@/types';

/**
 * 記錄用戶活動（客戶端使用，最小必要格式）
 */
export async function logUserActivity(
  event: EventType,
  data: {
    courseId?: number;
    nodeId?: number;
    xpGained?: number;
  } = {}
): Promise<void> {
  try {
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        ...data,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ 活動記錄 API 失敗:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error,
        event,
      });
    } else {
      console.log('✅ 活動記錄成功 (客戶端):', event);
    }
  } catch (error) {
    console.error('❌ 記錄活動時發生錯誤:', error);
    // 不拋出錯誤，避免影響主要功能
  }
}

/**
 * 記錄頁面瀏覽
 */
export function logPageView(page: string) {
  return logUserActivity('page_view');
}

/**
 * 記錄節點查看
 */
export function logNodeView(
  nodeId: number,
  courseId: number
) {
  return logUserActivity('node_view', {
    nodeId,
    courseId,
  });
}

/**
 * 記錄節點完成
 */
export function logNodeComplete(
  nodeId: number,
  courseId: number,
  xpGained: number
) {
  return logUserActivity('node_complete', {
    nodeId,
    courseId,
    xpGained,
  });
}

/**
 * 記錄搜尋活動
 */
export function logSearch(query: string, resultsCount?: number) {
  return logUserActivity('search');
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
