import { createBrowserClient } from '@supabase/ssr'

// 單例模式：緩存 client 實例，避免每次調用都創建新的
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // 如果已經存在 client 實例，直接返回
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error('Supabase credentials missing:', { url: !!url, key: !!key });
    throw new Error('Missing Supabase environment variables');
  }
  
  // 只在第一次調用時創建 client
  supabaseClient = createBrowserClient(url, key);
  
  return supabaseClient;
}

