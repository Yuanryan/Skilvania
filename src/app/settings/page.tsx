"use client";

import { Navbar } from '@/components/ui/Navbar';
import { User, Bell, Lock, LogOut, Moon, Globe } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

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
                        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">🌳</div>
                        <div>
                            <button className="text-emerald-400 text-sm font-bold hover:underline">Change Avatar</button>
                            <p className="text-slate-500 text-xs">JPG, PNG max 2MB</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-1">Display Name</label>
                        <input 
                            type="text" 
                            defaultValue="ForestWalker"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-1">Email</label>
                        <input 
                            type="email" 
                            defaultValue="druid@skilvania.com"
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


