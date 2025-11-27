"use client";

import React, { useState } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { ArrowLeft, BookOpen, CheckCircle, PlayCircle, FileText, Award } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function LessonContentPage() {
  const params = useParams();
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);

  // Mock Content Data
  const lesson = {
    title: "Understanding the DOM",
    type: "theory",
    xp: 100,
    content: `
      <h2>What is the DOM?</h2>
      <p>The Document Object Model (DOM) is a programming interface for web documents. It represents the page so that programs can change the document structure, style, and content. The DOM represents the document as nodes and objects; that way, programming languages can connect to the page.</p>
      
      <h3>Why is it important?</h3>
      <p>JavaScript can use the DOM to:</p>
      <ul>
        <li>Change all the HTML elements in the page</li>
        <li>Change all the HTML attributes in the page</li>
        <li>Change all the CSS styles in the page</li>
        <li>Remove existing HTML elements and attributes</li>
        <li>Add new HTML elements and attributes</li>
      </ul>
    `
  };

  const handleComplete = () => {
    setIsCompleted(true);
    // In a real app, this would trigger an API call
    setTimeout(() => {
      router.push(`/courses/${params.courseId}/tree`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 py-10">
        
        {/* Navigation Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href={`/courses/${params.courseId}/tree`} 
            className="p-2 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-1">Module 1: HTML Roots</div>
            <h1 className="text-2xl font-bold text-white">{lesson.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Video Placeholder */}
            <div className="aspect-video bg-black rounded-2xl border border-white/10 relative overflow-hidden group cursor-pointer">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-600/90 flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform">
                  <PlayCircle size={32} fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="text-white font-bold text-sm">Video Lecture: DOM Manipulation Basics</div>
                <div className="text-slate-400 text-xs">12:45</div>
              </div>
            </div>

            {/* Text Content */}
            <div className="prose prose-invert prose-emerald max-w-none">
              <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
            </div>

            {/* Quiz Section */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Award className="text-amber-500" size={20} /> Knowledge Check
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-colors flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border border-slate-600"></div>
                  <span className="text-slate-300 text-sm">The DOM is a programming language.</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500 cursor-pointer transition-colors flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-[5px] border-emerald-500 bg-transparent"></div>
                  <span className="text-white text-sm">The DOM is an interface for web documents.</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-colors flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border border-slate-600"></div>
                  <span className="text-slate-300 text-sm">The DOM is a database.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <span className="text-slate-400 text-sm font-medium">XP Reward</span>
                <span className="text-amber-400 font-bold">{lesson.xp} XP</span>
              </div>
              
              <button 
                onClick={handleComplete}
                disabled={isCompleted}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isCompleted 
                    ? 'bg-emerald-900/30 text-emerald-500 border border-emerald-500/30 cursor-default' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-900/20'
                }`}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle size={20} /> Completed
                  </>
                ) : (
                  "Complete Lesson"
                )}
              </button>

              <div className="mt-6 pt-6 border-t border-white/5">
                <h4 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                  <FileText size={16} /> Resources
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-emerald-400 text-sm hover:underline">MDN Web Docs: DOM</a>
                  </li>
                  <li>
                    <a href="#" className="text-emerald-400 text-sm hover:underline">JavaScript.info</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

