"use client";

import { Navbar } from '@/components/ui/Navbar';
import { User, Bell, Lock, LogOut, Moon, Globe, Upload, X, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  username: string;
  email: string;
  avatarUrl: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserProfile();
  }, [session]);

  const fetchUserProfile = async () => {
    if (!session?.user?.email) return;

    try {
      const supabase = createClient();
      const { data: userData } = await supabase
        .from('USER')
        .select('Username, Email, AvatarURL')
        .eq('Email', session.user.email)
        .single();

      if (userData) {
        setUserProfile({
          username: userData.Username,
          email: userData.Email,
          avatarUrl: userData.AvatarURL
        });
        setAvatarUrl(userData.AvatarURL || session.user.image || null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, PNG, and WebP are allowed.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File too large. Maximum size is 2MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to upload avatar';
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setAvatarUrl(data.avatarUrl);
      await fetchUserProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your avatar?')) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove avatar');
      }

      setAvatarUrl(null);
      await fetchUserProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-2xl mx-auto w-full p-6 py-10">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        <div className="space-y-6">
            
            {/* Account Section */}
            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                    <User size={14} /> Account
                </h2>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl overflow-hidden border-2 border-slate-700">
                                {avatarUrl ? (
                                    <img 
                                        src={avatarUrl} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : userProfile?.username ? (
                                    userProfile.username.charAt(0).toUpperCase()
                                ) : (
                                    '🌳'
                                )}
                            </div>
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="avatar-upload"
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor="avatar-upload"
                                    className="text-emerald-400 text-sm font-bold hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Upload size={14} />
                                    {avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
                                </label>
                                {avatarUrl && (
                                    <button
                                        onClick={handleRemoveAvatar}
                                        disabled={isUploading}
                                        className="text-red-400 text-sm font-bold hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <X size={14} />
                                        Remove
                                    </button>
                                )}
                            </div>
                            <p className="text-slate-500 text-xs mt-1">JPG, PNG, WebP max 2MB</p>
                            {error && (
                                <p className="text-red-400 text-xs mt-1">{error}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-1">Display Name</label>
                        <input 
                            type="text" 
                            defaultValue={userProfile?.username || ''}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            disabled
                        />
                        <p className="text-slate-500 text-xs mt-1">Username cannot be changed</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-1">Email</label>
                        <input 
                            type="email" 
                            defaultValue={userProfile?.email || session?.user?.email || ''}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-slate-400 focus:outline-none focus:border-emerald-500 transition-colors cursor-not-allowed"
                            disabled
                        />
                    </div>
                </div>
            </section>

            {/* Preferences Section */}
            <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Lock size={14} /> Preferences
                </h2>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Bell size={18} /></div>
                            <div>
                                <div className="text-white font-medium text-sm">Email Notifications</div>
                                <div className="text-slate-500 text-xs">Updates about your progress</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setNotifications(!notifications)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-emerald-600' : 'bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${notifications ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Globe size={18} /></div>
                            <div>
                                <div className="text-white font-medium text-sm">Public Profile</div>
                                <div className="text-slate-500 text-xs">Allow others to see your garden</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setPublicProfile(!publicProfile)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${publicProfile ? 'bg-emerald-600' : 'bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${publicProfile ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>
                    
                     <div className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Moon size={18} /></div>
                            <div>
                                <div className="text-white font-medium text-sm">Dark Mode</div>
                                <div className="text-slate-500 text-xs">Always on in Skilvania</div>
                            </div>
                        </div>
                        <div className="text-xs text-emerald-500 font-bold">Active</div>
                    </div>
                </div>
            </section>

            <button className="w-full py-4 rounded-xl border border-red-500/30 text-red-400 font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
                <LogOut size={18} /> Log Out
            </button>

        </div>
      </main>
    </div>
  );
}



