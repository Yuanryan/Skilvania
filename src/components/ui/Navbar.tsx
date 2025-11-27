"use client";

import Link from "next/link";
import { Sparkles, Layout, Map, User as UserIcon, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Navbar() {
  return (
    <nav className="relative border-b border-white/5 bg-black/20 backdrop-blur-md z-50 h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
            <div className="bg-emerald-600/20 p-1.5 rounded-lg border border-emerald-500/30">
            <Sparkles className="text-emerald-400" size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-200">
            Skil<span className="text-emerald-500">vania</span>
            </span>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <Link 
            href="/dashboard" 
            className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
        >
            <Layout size={16} /> Dashboard
        </Link>
        <Link 
            href="/courses" 
            className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
        >
            <Map size={16} /> Explore
        </Link>
        <Link 
            href="/creator" 
            className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
        >
            <PlusCircle size={16} /> Create
        </Link>
        <Link href="/profile/ForestWalker" className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-500 hover:border-emerald-500 transition-colors">
            <UserIcon size={16} />
        </Link>
      </div>
    </nav>
  );
}
