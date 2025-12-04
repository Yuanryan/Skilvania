import { NextResponse } from 'next/server';

/**
 * 檢查環境變量配置（用於診斷生產環境問題）
 * 這個 API 可以幫助確認 Vercel 環境變量是否正確配置
 */
export async function GET() {
  const env = process.env.NODE_ENV || 'unknown';
  const checks: any[] = [];

  // 檢查 MongoDB 配置
  const hasMongoUri = !!process.env.MONGODB_URI;
  const hasMongoDbName = !!process.env.MONGODB_DB_NAME;
  
  checks.push({
    name: 'MONGODB_URI',
    configured: hasMongoUri,
    value: hasMongoUri ? `${process.env.MONGODB_URI?.substring(0, 30)}...` : '未配置',
    note: hasMongoUri ? '✅ 已配置' : '❌ 未配置 - 請在 Vercel Dashboard 中設置',
  });

  checks.push({
    name: 'MONGODB_DB_NAME',
    configured: hasMongoDbName,
    value: process.env.MONGODB_DB_NAME || 'skilvania (默認)',
    note: hasMongoDbName ? '✅ 已配置' : 'ℹ️ 使用默認值',
  });

  // 檢查 NextAuth 配置
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
  const hasNextAuthUrl = !!process.env.NEXTAUTH_URL;
  
  checks.push({
    name: 'NEXTAUTH_SECRET',
    configured: hasNextAuthSecret,
    value: hasNextAuthSecret ? '已配置（隱藏）' : '未配置',
    note: hasNextAuthSecret ? '✅ 已配置' : '❌ 未配置',
  });

  checks.push({
    name: 'NEXTAUTH_URL',
    configured: hasNextAuthUrl,
    value: process.env.NEXTAUTH_URL || '未配置',
    note: hasNextAuthUrl ? '✅ 已配置' : '❌ 未配置',
  });

  // 檢查 Supabase 配置
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  checks.push({
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    configured: hasSupabaseUrl,
    value: hasSupabaseUrl ? '已配置' : '未配置',
    note: hasSupabaseUrl ? '✅ 已配置' : '❌ 未配置',
  });

  checks.push({
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    configured: hasSupabaseKey,
    value: hasSupabaseKey ? '已配置（隱藏）' : '未配置',
    note: hasSupabaseKey ? '✅ 已配置' : '❌ 未配置',
  });

  const allConfigured = checks.every(c => c.configured || c.name === 'MONGODB_DB_NAME');
  const mongoConfigured = hasMongoUri;

  return NextResponse.json({
    environment: env,
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      allConfigured,
      mongoConfigured,
      message: mongoConfigured 
        ? '✅ MongoDB 已配置，活動記錄功能可用'
        : '❌ MongoDB 未配置，活動記錄功能不可用',
      instructions: !mongoConfigured && env === 'production' 
        ? [
            '1. 登入 Vercel Dashboard',
            '2. 選擇項目 → Settings → Environment Variables',
            '3. 添加 MONGODB_URI 和 MONGODB_DB_NAME',
            '4. 選擇 Production 環境',
            '5. 重新部署應用',
          ]
        : [],
    },
  });
}

