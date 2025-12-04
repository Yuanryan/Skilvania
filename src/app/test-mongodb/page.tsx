'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { useSession } from 'next-auth/react';

export default function TestMongoDBPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-mongodb/basic');
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || '測試失敗');
    } finally {
      setLoading(false);
    }
  };

  const testInsert = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-mongodb/insert', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || '插入測試失敗');
    } finally {
      setLoading(false);
    }
  };

  const testLogout = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityType: 'logout',
          metadata: { test: true, source: 'test_page' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(`API 錯誤: ${errorData.error || response.statusText}`);
        setResult({
          success: false,
          message: '測試失敗',
          details: errorData,
        });
      } else {
        const data = await response.json();
        setResult({
          success: true,
          message: '✅ 登出活動記錄測試成功！請檢查 MongoDB 集合',
          details: data,
        });
      }
    } catch (err: any) {
      setError(err.message || '測試失敗');
    } finally {
      setLoading(false);
    }
  };

  const testVerifyInsert = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-mongodb/verify-insert', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
      if (!data.success) {
        setError(data.message || '驗證失敗');
      }
    } catch (err: any) {
      setError(err.message || '驗證測試失敗');
    } finally {
      setLoading(false);
    }
  };

  const testLoginLog = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 先嘗試 GET（不需要登入），如果失敗再嘗試 POST（需要登入）
      let response = await fetch('/api/test-login-log', {
        method: 'GET',
      });
      
      if (!response.ok && status === 'authenticated') {
        // 如果 GET 失敗且已登入，嘗試 POST
        response = await fetch('/api/test-login-log', {
          method: 'POST',
        });
      }
      
      const data = await response.json();
      setResult(data);
      if (!data.success) {
        setError(data.message || '測試失敗');
      }
    } catch (err: any) {
      setError(err.message || '測試失敗');
    } finally {
      setLoading(false);
    }
  };

  const testDebugLogin = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 使用 GET 方法，不需要登入
      const response = await fetch('/api/debug-login', {
        method: 'GET',
      });
      const data = await response.json();
      setResult(data);
      if (!data.success) {
        setError(data.message || '調試失敗');
      }
    } catch (err: any) {
      setError(err.message || '調試失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6 py-10">
        <h1 className="text-3xl font-bold mb-6">MongoDB 連接測試</h1>
        
        {/* 登入狀態提示 */}
        <div className={`mb-6 p-4 rounded-lg border ${
          status === 'authenticated' 
            ? 'bg-emerald-900/20 border-emerald-700' 
            : 'bg-yellow-900/20 border-yellow-700'
        }`}>
          <div className="flex items-center gap-2">
            {status === 'authenticated' ? (
              <>
                <span className="text-emerald-400">✅</span>
                <span>已登入: {session?.user?.email || session?.user?.name}</span>
              </>
            ) : status === 'loading' ? (
              <>
                <span className="text-yellow-400">⏳</span>
                <span>檢查登入狀態...</span>
              </>
            ) : (
              <>
                <span className="text-yellow-400">⚠️</span>
                <span>未登入 - "測試插入數據"功能需要登入</span>
              </>
            )}
          </div>
        </div>
        
        <div className="mb-6 flex gap-4">
          <button
            onClick={runTest}
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {loading ? '測試中...' : '測試連接'}
          </button>
          
          <button
            onClick={testInsert}
            disabled={loading || status !== 'authenticated'}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            title={status !== 'authenticated' ? '需要登入才能測試插入' : ''}
          >
            {loading ? '測試中...' : '測試插入數據 (需登入)'}
          </button>
          
          <button
            onClick={testLogout}
            disabled={loading || status !== 'authenticated'}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            title={status !== 'authenticated' ? '需要登入才能測試登出活動記錄' : ''}
          >
            {loading ? '測試中...' : '測試登出活動記錄'}
          </button>
          
          <button
            onClick={testVerifyInsert}
            disabled={loading || status !== 'authenticated'}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            title={status !== 'authenticated' ? '需要登入才能驗證插入操作' : ''}
          >
            {loading ? '驗證中...' : '驗證插入操作'}
          </button>
          
          <button
            onClick={testLoginLog}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            title="測試 MongoDB 連接和登入活動記錄（不需要登入）"
          >
            {loading ? '測試中...' : '測試登入活動記錄'}
          </button>
          
          <button
            onClick={testDebugLogin}
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            title="調試 logActivity 函數（不需要登入）"
          >
            {loading ? '調試中...' : '調試登入流程'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <h2 className="text-xl font-semibold text-red-400 mb-2">錯誤</h2>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-emerald-900/30 border-emerald-700' 
                : 'bg-yellow-900/30 border-yellow-700'
            }`}>
              <h2 className="text-xl font-semibold mb-2">
                {result.success ? '✅ 測試成功' : '⚠️ 測試失敗'}
              </h2>
              {result.message && (
                <p className="text-sm">{result.message}</p>
              )}
            </div>

            {result.details && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">詳細信息</h3>
                <pre className="bg-slate-950 p-4 rounded text-xs overflow-x-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </div>
            )}

            {result.tests && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">測試結果</h3>
                <div className="space-y-3">
                  {result.tests.map((test: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded border ${
                        test.passed
                          ? 'bg-emerald-900/20 border-emerald-800'
                          : 'bg-red-900/20 border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={test.passed ? 'text-emerald-400' : 'text-red-400'}>
                          {test.passed ? '✅' : '❌'}
                        </span>
                        <span className="font-medium">{test.name}</span>
                      </div>
                      <p className="text-sm text-slate-300 ml-6">{test.message}</p>
                      {test.error && (
                        <p className="text-sm text-red-400 ml-6 mt-1">錯誤: {test.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 space-y-4">
          <div className="p-4 bg-slate-900 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">測試登入活動記錄</h3>
            <p className="text-sm text-slate-300 mb-4">
              要測試實際登入時的活動記錄，請使用專門的測試登入頁面：
            </p>
            <a
              href="/test-login"
              className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
            >
              前往測試登入頁面 →
            </a>
            <p className="text-xs text-slate-400 mt-2">
              該頁面登入後不會自動跳轉，方便查看日誌和測試結果
            </p>
          </div>

          <div className="p-4 bg-slate-900 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">其他測試步驟</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">
              <li><strong>"測試連接"</strong> - 不需登入，檢查 MongoDB 配置和連接</li>
              <li><strong>"測試登入活動記錄"</strong> - 不需登入，測試 MongoDB 插入功能</li>
              <li><strong>"調試登入流程"</strong> - 不需登入，調試 logActivity 函數</li>
              <li><strong>"測試插入數據"</strong> - 需要登入，測試實際數據插入</li>
            </ol>
          </div>

          <div className="p-4 bg-slate-900 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">常見問題</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
              <li>如果連接失敗：檢查 .env.local 中的 MONGODB_URI 是否正確</li>
              <li>如果網絡錯誤：在 MongoDB Atlas 添加您的 IP 到網絡訪問列表</li>
              <li>如果認證失敗：確認數據庫用戶名和密碼正確</li>
              <li>修改 .env.local 後：需要重啟開發服務器（Ctrl+C 然後 npm run dev）</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

