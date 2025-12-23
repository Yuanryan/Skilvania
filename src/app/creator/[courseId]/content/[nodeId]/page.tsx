"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Eye, Loader2, Edit3, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { parseContent } from '@/types/content';
import { ContentBlock } from '@/types/content';
import BlockEditor from '@/components/content/BlockEditor';
import BlockRenderer from '@/lib/content/blockRenderer';

export default function ContentEditorPage() {
  const params = useParams();
  // 確保 courseId 和 nodeId 是字符串
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [nodeTitle, setNodeTitle] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (courseId && nodeId) {
      loadContent();
    }
  }, [courseId, nodeId]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}/nodes/${nodeId}/content`);
      if (!response.ok) {
        throw new Error('Failed to load content');
      }
      const data = await response.json();
      const loadedContent = data.content || '';
      
      // 始終解析為 Blocks（向後兼容：舊的 Markdown 內容會自動轉換）
      const parsedBlocks = parseContent(loadedContent);
      setBlocks(parsedBlocks);
      
      // 記錄初始內容，用於比較是否有變更
      lastSavedContentRef.current = JSON.stringify(parsedBlocks);
      isInitialLoadRef.current = true;
      setSaved(true);
      
      setNodeTitle(data.title || 'Node Content');
    } catch (error) {
      console.error('Error loading content:', error);
      alert('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const saveContent = useCallback(async (blocksToSave: ContentBlock[]) => {
    try {
      setSaving(true);
      setSaved(false);
      
      // 始終使用 Block 格式儲存
      const body = JSON.stringify({ blocks: blocksToSave });

      const response = await fetch(`/api/courses/${courseId}/nodes/${nodeId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (!response.ok) {
        throw new Error('Failed to save content');
      }

      // 記錄已保存的內容
      lastSavedContentRef.current = JSON.stringify(blocksToSave);
      setSaved(true);
      
      // 3秒後隱藏保存成功提示
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving content:', error);
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }, [courseId, nodeId]);

  // 自動保存：監聽 blocks 變化
  useEffect(() => {
    // 跳過初始載入
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // 檢查內容是否有變更
    const currentContent = JSON.stringify(blocks);
    if (currentContent === lastSavedContentRef.current) {
      return; // 沒有變更，不需要保存
    }

    // 清除之前的計時器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 設置新的防抖計時器（2秒後保存）
    saveTimerRef.current = setTimeout(() => {
      saveContent(blocks);
    }, 2000);

    // 清理函數
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [blocks, saveContent]);

  // 手動保存（保留原有功能）
  const handleSave = async () => {
    // 清除自動保存計時器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await saveContent(blocks);
  };

  // 清理計時器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

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
            <h1 className="text-lg font-bold text-white">Node: {nodeTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 size={14} className="inline mr-1" /> Edit
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  viewMode === 'split'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={14} className="inline mr-1" /> Preview
            </button>
            </div>
            {/* Auto-save Status */}
            {(saving || saved) && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-500" /> Saved
                  </>
                ) : null}
              </div>
            )}
            <button 
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-bold shadow-lg shadow-emerald-900/20"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                <Save size={16} /> Save Content
                </>
              )}
            </button>
        </div>
      </header>

      <div className="flex-1 flex">
        
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/50 border-r border-white/5 p-4 flex flex-col gap-4">
          <div className="space-y-2">
            <h3 className="text-xs text-slate-500 font-bold uppercase mb-2">Blocks</h3>
            <p className="text-xs text-slate-500 mb-4">
              在編輯區域點擊「新增」按鈕來新增 Block
            </p>
          </div>
          
          <div className="mt-auto p-4 rounded-xl bg-amber-900/10 border border-amber-500/20">
            <h4 className="text-amber-500 font-bold text-xs mb-1">Pro Tip</h4>
            <p className="text-amber-200/60 text-xs leading-relaxed">
              Keep lessons short. Break complex topics into multiple nodes for better retention.
            </p>
          </div>
        </aside>

        {/* Block Editor Area */}
        <main className="flex-1 bg-slate-950 overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="animate-spin mx-auto text-slate-400 mb-4" size={32} />
                  <p className="text-slate-500">Loading content...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-auto">
                {/* Editor Panel */}
                {(viewMode === 'edit' || viewMode === 'split') && (
                  <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} border-r border-white/5 flex flex-col`}>
                    <div className="bg-slate-900/50 border-b border-white/5 px-4 py-2 flex-shrink-0">
                      <h3 className="text-xs text-slate-400 font-bold uppercase">
                        Block Editor
                      </h3>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <BlockEditor 
                        blocks={blocks} 
                        onChange={setBlocks} 
                        courseId={courseId || undefined} 
                        nodeId={nodeId || undefined} 
                      />
                    </div>
                  </div>
                )}

                {/* Preview Panel */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                  <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col`}>
                    <div className="bg-slate-900/50 border-b border-white/5 px-4 py-2 flex-shrink-0">
                      <h3 className="text-xs text-slate-400 font-bold uppercase">Preview</h3>
                    </div>
                    <div className="flex-1 p-6 markdown-content overflow-y-auto custom-scrollbar">
                      <BlockRenderer blocks={blocks} />
                    </div>
                  </div>
                )}
              </div>
            )}
        </main>

      </div>
    </div>
  );
}



