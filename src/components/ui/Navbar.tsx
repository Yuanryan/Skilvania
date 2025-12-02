"use client";

import Link from "next/link";
import { Sparkles, Layout, Map, User as UserIcon, PlusCircle, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const { data: session, status } = useSession();
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();
  const loading = status === "loading";

  useEffect(() => {
    const fetchUsername = async () => {
      if (session?.user?.email) {
        try {
          const supabase = createClient();
          const { data: userData } = await supabase
            .from('USER')
            .select('Username')
            .eq('Email', session.user.email)
            .single();

          if (userData) {
            setUsername(userData.Username);
          }
        } catch (error) {
          console.error("Error fetching username:", error);
        }
      }
    };

    fetchUsername();
  }, [session]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

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
            href="/courses" 
            className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
        >
            <Map size={16} /> Explore
        </Link>
        
        {loading ? (
             <div className="w-8 h-8 rounded-full bg-slate-800/50 animate-pulse"></div>
        ) : session?.user ? (
            <>
                <Link 
                    href="/dashboard" 
                    className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <Layout size={16} /> Dashboard
                </Link>
                <Link 
                    href="/creator" 
                    className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <PlusCircle size={16} /> Create
                </Link>
                
                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                    <Link 
                      href={`/profile/${username || session.user.email?.split('@')[0]}`} 
                      className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-500 hover:border-emerald-500 transition-colors" 
                      title="Profile"
                    >
                        {session.user.image ? (
                            <img src={session.user.image} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <UserIcon size={16} />
                        )}
                    </Link>
                    <button 
                        onClick={handleLogout}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </>
        ) : (
            <div className="flex items-center gap-4">
                <Link 
                    href="/login" 
                    className="text-slate-300 hover:text-white font-bold text-sm transition-colors"
                >
                    Login
                </Link>
                <Link 
                    href="/register" 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-all"
                >
                    Join Guild
                </Link>
            </div>
        )}
      </div>
    </nav>
  );
}
