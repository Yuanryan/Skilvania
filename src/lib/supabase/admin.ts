// Admin Supabase client - 使用 service role key 繞過 RLS
// ⚠️ 警告：這個 client 會繞過所有 RLS 政策，只能在伺服器端使用
// 必須確保在 API 路由中已經進行了權限檢查

import { createClient } from '@supabase/supabase-js'

function validateSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  // 驗證 URL 格式
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must start with http:// or https://');
  }

  return { url, serviceRoleKey };
}

export function createAdminClient() {
  const { url, serviceRoleKey } = validateSupabaseConfig();
  
  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-client-info': 'skilvania-admin-client'
        }
      }
    }
  )
}

