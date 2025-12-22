"use client";

import Link from "next/link";
import { Sparkles, Layout, Map, User as UserIcon, PlusCircle, LogOut, BarChart3, Users, MessageCircle, UserPlus } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logUserActivity } from "@/lib/utils/activityLogger";

export function Navbar() {
  const { data: session, status } = useSession();
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0);
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

    const checkAdminStatus = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/admin/check');
          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.isAdmin || false);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    fetchUsername();
    checkAdminStatus();
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      
      // Poll for notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchNotifications = async () => {
    try {
      // Fetch unread messages count
      const messagesRes = await fetch('/api/community/messages');
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setUnreadMessages(messagesData.unreadCount || 0);
      }

      // Fetch pending connections count
      const connectionsRes = await fetch('/api/community/connections');
      if (connectionsRes.ok) {
        const connectionsData = await connectionsRes.json();
        setPendingConnections(connectionsData.counts.pendingReceived || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogout = async () => {
    // 在登出前記錄登出活動（在 session 清除之前）
    try {
      console.log('📝 開始記錄登出活動...');
      await logUserActivity('logout', {});
      console.log('✅ 登出活動記錄完成');
    } catch (error) {
      console.error('❌ 記錄登出活動失敗:', error);
      // 繼續登出流程，不因記錄失敗而中斷
    }
    
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
                    href="/community" 
                    className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <Users size={16} /> Community
                </Link>
                <Link 
                    href="/community/connections" 
                    className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors relative"
                >
                    <UserPlus size={16} /> Connections
                    {pendingConnections > 0 && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {pendingConnections}
                      </span>
                    )}
                </Link>
                <Link 
                    href="/community/messages" 
                    className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors relative"
                >
                    <MessageCircle size={16} /> Messages
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                </Link>
                <Link 
                    href="/creator" 
                    className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <PlusCircle size={16} /> Create
                </Link>
                {isAdmin && (
                    <Link 
                        href="/analytics" 
                        className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <BarChart3 size={16} /> Analytics
                    </Link>
                )}
                
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
