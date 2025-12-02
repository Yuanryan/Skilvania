"use client";

import Link from "next/link";
import { Sparkles, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "You do not have permission to sign in.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      default:
        return "An error occurred during authentication.";
    }
  };

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
        <div className="bg-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-500/10 p-3 rounded-full">
              <AlertCircle className="text-red-400" size={32} />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Authentication Error
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
      </div>
    </div>
  );
}

