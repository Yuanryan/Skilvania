"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowRight, Loader2, Save, Edit3, Eye, CheckCircle2 } from 'lucide-react';
import { parseContent, ContentBlock } from '@/types/content';
import { Node, NodeType } from '@/types';
import BlockEditor from '@/components/content/BlockEditor';
import BlockRenderer from '@/lib/content/blockRenderer';

interface LessonEditorDrawerProps {
  courseId: string;
  nodeId: string;
  isOpen: boolean;
  onClose: () => void;
  initialData?: Node;
  onUpdateNode: (id: string, updates: Partial<Node>) => void;
  // Dynamic resizing props
  width: number;
  onWidthChange: (width: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export function LessonEditorDrawer({
  courseId,
  nodeId,
  isOpen,
  onClose,
  initialData,
  onUpdateNode,
  width,
  onWidthChange,
  onResizeStart,
  onResizeEnd
}: LessonEditorDrawerProps) {
  // const [activeTab, setActiveTab] = useState<'settings' | 'content'>('settings'); // Removed tab state
  const isResizingRef = useRef(false);

  // --- Content Editor State ---
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [contentSaved, setContentSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const isInitialLoadRef = useRef(true);

  // --- Settings State ---
  // We keep local state for settings to avoid jitter, but sync with props
  const [localSettings, setLocalSettings] = useState<Partial<Node>>({});

  useEffect(() => {
    if (initialData) {
      setLocalSettings({
        title: initialData.title,
        type: initialData.type,
        xp: initialData.xp,
        iconName: initialData.iconName
      });
    }
  }, [initialData]);

  // Load Content when drawer opens or nodeId changes
  useEffect(() => {
    if (!isOpen || !courseId || !nodeId) return;

    const loadContent = async () => {
      try {
        setLoadingContent(true);
        // Reset state
        setBlocks([]);
        isInitialLoadRef.current = true;
        
        const response = await fetch(`/api/courses/${courseId}/nodes/${nodeId}/content`);
        if (!response.ok) throw new Error('Failed to load content');
        
        const data = await response.json();
        const loadedContent = data.content || '';
        
        const parsedBlocks = parseContent(loadedContent);
        setBlocks(parsedBlocks);
        lastSavedContentRef.current = JSON.stringify(parsedBlocks);
        isInitialLoadRef.current = true; // Mark as initial load done after setting blocks
        
        // Switch to content tab if we were editing content before? 
        // No, keep default or user choice. Maybe default to content if previously open?
        // For now default to settings unless user switches.
      } catch (err) {
        console.error('Error loading content:', err);
      } finally {
        setLoadingContent(false);
      }
    };

    loadContent();
  }, [courseId, nodeId, isOpen]);

  // --- Resizing Logic ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      if (newWidth > 30 && newWidth < 90) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        if (onResizeEnd) onResizeEnd();
      }
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, onWidthChange, onResizeEnd]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    if (onResizeStart) onResizeStart();
  };

  // --- Settings Handlers ---
  const handleSettingChange = (field: keyof Node, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    
    // Also update parent immediately (parent handles debouncing for API calls if needed)
    // Or we could debounce here. The parent implementation in `editor/page.tsx` has debouncing for title.
    if (field === 'type') {
       // Auto-set icon based on type
       const iconMap: Record<string, string> = {
        'theory': 'Book',
        'code': 'Code',
        'project': 'Rocket',
        'guide': 'Map',
        'tutorial': 'GraduationCap',
        'checklist': 'CheckSquare',
        'resource': 'FileText'
      };
      const newIconName = iconMap[value] || 'Code';
      onUpdateNode(nodeId, { [field]: value, iconName: newIconName });
    } else {
      onUpdateNode(nodeId, { [field]: value });
    }
  };

  // --- Content Handlers ---
  const saveContent = useCallback(async (blocksToSave: ContentBlock[]) => {
    if (!courseId || !nodeId) return;

    try {
      setSavingContent(true);
      setContentSaved(false);
      
      const body = JSON.stringify({ blocks: blocksToSave });

      const response = await fetch(`/api/courses/${courseId}/nodes/${nodeId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (!response.ok) throw new Error('Failed to save content');

      lastSavedContentRef.current = JSON.stringify(blocksToSave);
      setContentSaved(true);
      
      setTimeout(() => {
        setContentSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving content:', error);
    } finally {
      setSavingContent(false);
    }
  }, [courseId, nodeId]);

  // Auto-save content
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    const currentContent = JSON.stringify(blocks);
    if (currentContent === lastSavedContentRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      saveContent(blocks);
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [blocks, saveContent]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      className="absolute right-0 top-0 bottom-0 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col z-50 animate-slide-in"
      style={{ width: `${width}%` }}
    >
       {/* Resize Handle */}
       <div 
         className="absolute left-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-emerald-500/50 cursor-ew-resize transition-all z-50 flex items-center justify-center group -ml-[2px]"
         onMouseDown={handleResizeStart}
       >
          <div className="h-8 w-1 bg-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
       </div>

       {/* Header */}
       <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-4 flex-1 mr-4">
             <button 
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
             >
                <ArrowRight size={20} />
             </button>
             <div className="flex-1">
                <div className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-1">
                   Lesson Editor
                </div>
                <input 
                  value={localSettings.title || ''} 
                  onChange={(e) => handleSettingChange('title', e.target.value)}
                  className="bg-transparent text-lg font-bold text-white w-full border-none focus:outline-none focus:ring-0 p-0 placeholder-slate-600"
                  placeholder="Untitled Node"
                />
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={onClose} 
                className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
            >
                <X size={20} />
            </button>
          </div>
       </div>

       {/* Body */}
       <div className="flex-1 overflow-hidden flex flex-col relative">
          
          <div className="flex-1 flex flex-col h-full bg-slate-950">
               {/* Content Toolbar */}
               <div className="bg-slate-900 border-b border-white/5 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                      <button
                        onClick={() => setViewMode('edit')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                          viewMode === 'edit' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => setViewMode('split')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                          viewMode === 'split' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Split
                      </button>
                      <button
                        onClick={() => setViewMode('preview')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                          viewMode === 'preview' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Eye size={14} /> Preview
                      </button>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-700"></div>

                    {/* Properties Integration */}
                    <div className="flex items-center gap-2">
                       <select 
                          value={localSettings.type || 'theory'}
                          onChange={(e) => handleSettingChange('type', e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="theory">Theory</option>
                          <option value="code">Code</option>
                          <option value="project">Project</option>
                          <option value="guide">Guide</option>
                          <option value="tutorial">Tutorial</option>
                          <option value="checklist">Checklist</option>
                          <option value="resource">Resource</option>
                        </select>
                        
                        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5">
                           <span className="text-[10px] text-slate-400 font-bold uppercase">XP</span>
                           <input 
                              type="number"
                              value={localSettings.xp || 0} 
                              onChange={(e) => handleSettingChange('xp', parseInt(e.target.value) || 0)}
                              className="bg-transparent text-xs text-white w-12 focus:outline-none"
                            />
                        </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status */}
                    {(savingContent || contentSaved) && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {savingContent ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Saving...
                          </>
                        ) : contentSaved ? (
                          <>
                            <CheckCircle2 size={14} className="text-emerald-500" /> Saved
                          </>
                        ) : null}
                      </div>
                    )}
                    
                    <button 
                      onClick={() => saveContent(blocks)}
                      disabled={savingContent || loadingContent}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-bold"
                    >
                      <Save size={14} /> Save
                    </button>
                  </div>
               </div>

               {/* Editor Area */}
               {loadingContent ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="animate-spin mx-auto text-slate-400 mb-4" size={32} />
                      <p className="text-slate-500">Loading content...</p>
                    </div>
                  </div>
               ) : (
                  <div className="flex-1 flex overflow-hidden">
                    {/* Editor Panel */}
                    {(viewMode === 'edit' || viewMode === 'split') && (
                      <div className={`flex flex-col border-r border-white/5 bg-slate-900/30 ${
                        viewMode === 'split' ? 'w-1/2' : 'w-full'
                      }`}>
                         <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                           <BlockEditor blocks={blocks} onChange={setBlocks} />
                         </div>
                      </div>
                    )}

                    {/* Preview Panel */}
                    {(viewMode === 'preview' || viewMode === 'split') && (
                      <div className={`flex flex-col bg-slate-950 ${
                        viewMode === 'split' ? 'w-1/2' : 'w-full'
                      }`}>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                          <div className="prose prose-invert prose-lg max-w-none">
                             <BlockRenderer blocks={blocks} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
               )}
            </div>
          </div>

       </div>

  );
}

