"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Image as ImageIcon, Type, Video, Eye, Loader2, Edit3, Code2, Blocks } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { parseContent, markdownToBlocks, isBlockFormat } from '@/types/content';
import { ContentBlock } from '@/types/content';
import BlockEditor from '@/components/content/BlockEditor';
import BlockRenderer from '@/lib/content/blockRenderer';
import 'highlight.js/styles/github-dark.css';

export default function ContentEditorPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const nodeId = params.nodeId as string;
  
  const [content, setContent] = useState('');
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [nodeTitle, setNodeTitle] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [editMode, setEditMode] = useState<'markdown' | 'blocks'>('blocks'); // 新增：編輯模式
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (courseId && nodeId) {
      loadContent();
    }
  }, [courseId, nodeId]);

  // 同步滾動：編輯器 -> 預覽
  const handleEditorScroll = useCallback(() => {
    if (isScrollingRef.current === 'preview' || !editorRef.current || !previewRef.current) return;
    
    const editor = editorRef.current;
    const preview = previewRef.current;
    
    // 計算編輯器滾動比例
    const editorScrollTop = editor.scrollTop;
    const editorScrollHeight = editor.scrollHeight - editor.clientHeight;
    
    if (editorScrollHeight <= 0) return;
    
    const editorScrollRatio = editorScrollTop / editorScrollHeight;
    
    // 將比例應用到預覽區域
    const previewScrollHeight = preview.scrollHeight - preview.clientHeight;
    if (previewScrollHeight <= 0) return;
    
    const targetPreviewScroll = previewScrollHeight * editorScrollRatio;
    
    isScrollingRef.current = 'editor';
    preview.scrollTop = targetPreviewScroll;
    
    // 清除之前的 timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = null;
    }, 100);
  }, []);

  // 同步滾動：預覽 -> 編輯器
  const handlePreviewScroll = useCallback(() => {
    if (isScrollingRef.current === 'editor' || !editorRef.current || !previewRef.current) return;
    
    const editor = editorRef.current;
    const preview = previewRef.current;
    
    // 計算預覽滾動比例
    const previewScrollTop = preview.scrollTop;
    const previewScrollHeight = preview.scrollHeight - preview.clientHeight;
    
    if (previewScrollHeight <= 0) return;
    
    const previewScrollRatio = previewScrollTop / previewScrollHeight;
    
    // 將比例應用到編輯器
    const editorScrollHeight = editor.scrollHeight - editor.clientHeight;
    if (editorScrollHeight <= 0) return;
    
    const targetEditorScroll = editorScrollHeight * previewScrollRatio;
    
    isScrollingRef.current = 'preview';
    editor.scrollTop = targetEditorScroll;
    
    // 清除之前的 timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = null;
    }, 100);
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}/nodes/${nodeId}/content`);
      if (!response.ok) {
        throw new Error('Failed to load content');
      }
      const data = await response.json();
      const loadedContent = data.content || '';
      setContent(loadedContent);
      
      // 解析為 Blocks
      const parsedBlocks = parseContent(loadedContent);
      setBlocks(parsedBlocks);
      
      // 自動檢測格式並設定編輯模式
      if (isBlockFormat(loadedContent) || parsedBlocks.length > 1 || (parsedBlocks.length === 1 && parsedBlocks[0].type !== 'markdown')) {
        setEditMode('blocks');
      } else {
        setEditMode('markdown');
      }
      
      setNodeTitle(data.title || 'Node Content');
    } catch (error) {
      console.error('Error loading content:', error);
      alert('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let body;
      
      if (editMode === 'blocks') {
        // 使用 Block 格式儲存
        body = JSON.stringify({ blocks });
      } else {
        // 使用 Markdown 格式儲存
        body = JSON.stringify({ content });
      }

      const response = await fetch(`/api/courses/${courseId}/nodes/${nodeId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (!response.ok) {
        throw new Error('Failed to save content');
      }

      alert('Content saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  // 切換編輯模式
  const handleModeSwitch = (mode: 'markdown' | 'blocks') => {
    if (mode === 'markdown') {
      // 轉換 Blocks 為 Markdown
      const markdownContent = blocks
        .map(block => block.type === 'markdown' ? block.content : '')
        .join('\n\n');
      setContent(markdownContent);
      setEditMode('markdown');
    } else {
      // 轉換 Markdown 為 Blocks
      const newBlocks = markdownToBlocks(content);
      setBlocks(newBlocks);
      setEditMode('blocks');
    }
  };

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
            {/* Edit Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => handleModeSwitch('blocks')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  editMode === 'blocks'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Block 模式"
              >
                <Blocks size={14} className="inline mr-1" /> Blocks
              </button>
              <button
                onClick={() => handleModeSwitch('markdown')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  editMode === 'markdown'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Markdown 模式"
              >
                <Code2 size={14} className="inline mr-1" /> Markdown
              </button>
            </div>
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
        
        {/* Sidebar - 只在 Block 模式顯示 */}
        {editMode === 'blocks' && (
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
        )}

        {/* Markdown Editor Area */}
        <main className="flex-1 bg-slate-950 overflow-hidden flex flex-col">
            {loading ? (
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
                  <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} border-r border-white/5 flex flex-col overflow-hidden`}>
                    <div className="bg-slate-900/50 border-b border-white/5 px-4 py-2 flex-shrink-0">
                      <h3 className="text-xs text-slate-400 font-bold uppercase">
                        {editMode === 'blocks' ? 'Block Editor' : 'Markdown Editor'}
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      {editMode === 'blocks' ? (
                        <BlockEditor blocks={blocks} onChange={setBlocks} />
                      ) : (
                        <textarea 
                          ref={editorRef}
                          onScroll={handleEditorScroll}
                          className="w-full h-full bg-slate-950 text-slate-200 font-mono text-sm focus:outline-none resize-none overflow-y-auto custom-scrollbar"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          spellCheck={false}
                          placeholder="# Enter your lesson content here...

Use **Markdown** syntax to format your content:

## Headings
- **Bold text**
- *Italic text*
- `Code blocks`
- [Links](https://example.com)
- Lists
  - Item 1
  - Item 2

```javascript
// Code examples
function hello() {
  console.log('Hello!');
}
```"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Preview Panel */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                  <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden`}>
                    <div className="bg-slate-900/50 border-b border-white/5 px-4 py-2 flex-shrink-0">
                      <h3 className="text-xs text-slate-400 font-bold uppercase">Preview</h3>
                    </div>
                    <div 
                      ref={previewRef}
                      onScroll={handlePreviewScroll}
                      className="flex-1 overflow-y-auto p-6 markdown-content custom-scrollbar"
                    >
                      {editMode === 'blocks' ? (
                        <BlockRenderer blocks={blocks} />
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight, rehypeRaw]}
                        >
                          {content || '*No content yet. Start typing in the editor...*'}
                        </ReactMarkdown>
                      )}
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



