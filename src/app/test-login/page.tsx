'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';

/**
 * 測試登入頁面內容組件
 */
function TestLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      console.log('🧪 [Test Login] 開始登入測試...');
      
      const result = await signIn('credentials', {
        email,
        password,
        isSignUp: 'false',
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        console.error('❌ [Test Login] 登入失敗:', result.error);
      } else {
        setSuccess(true);
        console.log('✅ [Test Login] 登入成功！');
        console.log('✅ [Test Login] 請檢查服務器終端日誌，應該能看到 logActivity 的日誌');
        
        // 不自動跳轉，讓用戶可以查看結果
        // 可以手動點擊按鈕返回
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('❌ [Test Login] 登入錯誤:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <main className="max-w-2xl mx-auto p-6 py-10">
        <h1 className="text-3xl font-bold mb-6">測試登入活動記錄</h1>
        
        <div className="bg-slate-900 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">使用說明</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
            <li>打開服務器終端，準備查看日誌</li>
            <li>在此頁面輸入帳號密碼登入</li>
            <li>登入成功後，查看服務器終端日誌</li>
            <li>應該能看到 <code className="bg-slate-800 px-2 py-1 rounded">🔐 [Login] 準備記錄登入活動</code> 等日誌</li>
            <li>檢查 MongoDB Atlas 中是否有新記錄</li>
          </ol>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg">
            <h3 className="text-xl font-semibold text-emerald-400 mb-2">✅ 登入成功！</h3>
            <p className="text-sm text-slate-300 mb-4">
              請查看服務器終端日誌，應該能看到登入活動記錄的日誌。
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/test-mongodb')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
              >
                返回測試頁面
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
              >
                前往主畫面
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <h3 className="text-xl font-semibold text-red-400 mb-2">❌ 登入失敗</h3>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="bg-slate-900 rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all"
            >
              {isLoading ? '登入中...' : '測試登入'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

/**
 * 測試登入頁面
 * 登入後不會跳轉，方便測試登入活動記錄
 */
export default function TestLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <Navbar />
        <main className="max-w-2xl mx-auto p-6 py-10">
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-400">載入中...</div>
          </div>
        </main>
      </div>
    }>
      <TestLoginContent />
    </Suspense>
  );
}

