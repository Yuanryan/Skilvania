// Admin Supabase client - 使用 service role key 繞過 RLS
// ⚠️ 警告：這個 client 會繞過所有 RLS 政策，只能在伺服器端使用
// 必須確保在 API 路由中已經進行了權限檢查

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 單例模式：緩存 admin client 實例，避免每次調用都創建新的
let adminClient: SupabaseClient | null = null;

export function createAdminClient() {
  // 如果已經存在 admin client 實例，直接返回
  if (adminClient) {
    return adminClient;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  // 只在第一次調用時創建 admin client
  adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  return adminClient;
}

