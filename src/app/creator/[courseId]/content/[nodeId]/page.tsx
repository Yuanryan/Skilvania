"use client";

import React, { useState } from 'react';
import { ArrowLeft, Save, Image as ImageIcon, Type, Video, Eye } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ContentEditorPage() {
  const params = useParams();
  const [content, setContent] = useState(`
<h2>What is the DOM?</h2>
<p>The Document Object Model (DOM) is a programming interface for web documents...</p>
  `.trim());

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      
      {/* Editor Header */}
      <header className="h-16 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link 
            href={`/creator/${params.courseId}/editor`} 
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Editing Content</div>
            <h1 className="text-lg font-bold text-white">Node: HTML Roots</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-bold">
                <Eye size={16} /> Preview
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm font-bold shadow-lg shadow-emerald-900/20">
                <Save size={16} /> Save Content
            </button>
        </div>
      </header>

      <div className="flex-1 flex">
        
        {/* Formatting Sidebar */}
        <aside className="w-64 bg-slate-900/50 border-r border-white/5 p-4 flex flex-col gap-4">
            <div className="space-y-2">
                <h3 className="text-xs text-slate-500 font-bold uppercase mb-2">Blocks</h3>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent hover:border-slate-600 transition-all text-sm">
                    <Type size={18} /> Text Block
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent hover:border-slate-600 transition-all text-sm">
                    <ImageIcon size={18} /> Image
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent hover:border-slate-600 transition-all text-sm">
                    <Video size={18} /> Video Embed
                </button>
            </div>
            
            <div className="mt-auto p-4 rounded-xl bg-amber-900/10 border border-amber-500/20">
                <h4 className="text-amber-500 font-bold text-xs mb-1">Pro Tip</h4>
                <p className="text-amber-200/60 text-xs leading-relaxed">
                    Keep lessons short. Break complex topics into multiple nodes for better retention.
                </p>
            </div>
        </aside>

        {/* WYSIWYG Editor Area (Mocked) */}
        <main className="flex-1 p-8 bg-slate-950 overflow-y-auto">
            <div className="max-w-3xl mx-auto bg-slate-900 border border-white/10 rounded-xl min-h-[600px] shadow-2xl p-8 relative">
                <textarea 
                    className="w-full h-full bg-transparent text-slate-200 font-mono text-sm focus:outline-none resize-none"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    spellCheck={false}
                />
                <div className="absolute bottom-4 right-4 text-xs text-slate-500">
                    HTML Mode
                </div>
            </div>
        </main>

      </div>
    </div>
  );
}



