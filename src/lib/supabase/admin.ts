// Admin Supabase client - 使用 service role key 繞過 RLS
// ⚠️ 警告：這個 client 會繞過所有 RLS 政策，只能在伺服器端使用
// 必須確保在 API 路由中已經進行了權限檢查

import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

