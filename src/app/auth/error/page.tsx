"use client";

import Link from "next/link";
import { Sparkles, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "伺服器認證設定有問題（請檢查 .env.local / NextAuth / Supabase 設定）。";
      case "AccessDenied":
        return "你沒有權限登入（通常是後端拒絕寫入/讀取資料或權限設定問題）。";
      case "Verification":
        return "驗證 token 已過期或已被使用。";
      case "OAuthAccountNotLinked":
        return "為確認身分，請使用你一開始註冊/登入時使用的同一個帳號。";
      case "OAuthSignin":
        return "建立 OAuth 授權網址時發生錯誤。";
      case "OAuthCallback":
        return "處理 OAuth 回傳結果時發生錯誤。";
      case "CredentialsSignin":
        return "登入失敗，請檢查帳號或密碼。";
      case "SupabaseNotConfigured":
        return "Supabase 設定不完整：缺少 `SUPABASE_SERVICE_ROLE_KEY`（註冊/Google OAuth 需要用它寫入 USER 表）。";
      case "DatabaseWriteFailed":
        return "寫入使用者資料失敗（多半是 Supabase RLS/權限或資料表約束問題）。";
      case "EmailMissingFromProvider":
        return "Google 沒有回傳 email（請確認 Google OAuth scope/帳號類型與同意畫面設定）。";
      default:
        return "認證過程發生錯誤。";
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 shadow-2xl">
      <div className="flex items-center justify-center mb-4">
        <div className="bg-red-500/10 p-3 rounded-full">
          <AlertCircle className="text-red-400" size={32} />
        </div>
      </div>
      
      <h1 className="text-2xl font-bold text-white mb-2 text-center">
        認證錯誤
      </h1>
      <p className="text-slate-400 text-center mb-6">
        {getErrorMessage(error)}
      </p>

      <Link
        href="/login"
        className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-lg transition-all text-center"
      >
        Try Again
      </Link>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-emerald-600/20 p-2 rounded-lg border border-emerald-500/30">
            <Sparkles className="text-emerald-400" size={28} />
          </div>
          <span className="font-bold text-2xl tracking-tight text-slate-200">
            Skil<span className="text-emerald-500">vania</span>
          </span>
        </Link>

        {/* Error Card */}
        <Suspense fallback={
          <div className="bg-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 shadow-2xl">
            <div className="text-center text-slate-400">Loading...</div>
          </div>
        }>
          <ErrorContent />
        </Suspense>
      </div>
    </div>
  );
}

