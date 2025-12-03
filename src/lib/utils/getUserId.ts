// 工具函數：從 session 獲取 UserID
// 支援兩種認證方式：
// 1. Google OAuth: session.user.id 是 UUID，需要查詢 auth_user_bridge
// 2. Credentials: session.user.id 是 USER.UserID（整數字串），直接使用

import { createClient } from '@/lib/supabase/server';
import { shouldUseMock } from '@/lib/mock/creatorData';
import { isNetworkError } from '@/lib/utils/timeout';

export async function getUserIdFromSession(sessionUserId: string): Promise<number | null> {
  // 檢查是否是 UUID 格式（包含連字號）
  const isUUID = sessionUserId.includes('-');
  
  if (isUUID) {
    // Google OAuth: 查詢 auth_user_bridge
    const supabase = await createClient();
    const { data: bridgeData, error: bridgeError } = await supabase
      .from('auth_user_bridge')
      .select('user_id')
      .eq('auth_user_id', sessionUserId)
      .single();

    // 如果資料庫表不存在或連接超時，返回 null（讓調用者處理 Mock 模式）
    if (bridgeError && (shouldUseMock(bridgeError) || isNetworkError(bridgeError))) {
      return null;
    }

    if (!bridgeData) {
      return null;
    }

    return bridgeData.user_id;
  } else {
    // Credentials provider: 直接使用 session.user.id
    const userId = parseInt(sessionUserId, 10);
    if (isNaN(userId)) {
      return null;
    }
    return userId;
  }
}

