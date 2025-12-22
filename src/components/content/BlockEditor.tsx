'use client';

import React, { useState, useRef } from 'react';
import { X, GripVertical, Image as ImageIcon, Video, Type, Plus, Trash2, Bold, Italic, Heading1, Heading2, Heading3, List, Link2, Code, Quote, Minus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { ContentBlock } from '@/types/content';
import BlockRenderer from '@/lib/content/blockRenderer';
import ImageBlockComponent from '@/components/content/ImageBlock';
import VideoBlockComponent from '@/components/content/VideoBlock';
import 'highlight.js/styles/github-dark.css';

/**
 * 檢測是否為影片 URL
 */
function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /youtube\.com\/watch/,
    /youtu\.be\//,
    /youtube\.com\/embed/,
    /vimeo\.com/,
    /\.mp4$/i,
    /\.webm$/i,
    /\.mov$/i,
    /\.avi$/i,
  ];
  return videoPatterns.some(pattern => pattern.test(url));
}

interface BlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

export default function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addBlock = (index?: number) => {
    const newBlock: ContentBlock = { type: 'markdown', content: '' };
    
    const newBlocks = [...blocks];
    if (index !== undefined) {
      newBlocks.splice(index + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    onChange(newBlocks);
    setEditingIndex(index !== undefined ? index + 1 : newBlocks.length - 1);
  };

  const updateBlock = (index: number, block: ContentBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = block;
    onChange(newBlocks);
  };

  const deleteBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
    if (editingIndex === index) {
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };


  return (
    <div className="space-y-4">
      {blocks.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="mb-4">還沒有內容，點擊下方按鈕新增 Block</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => addBlock()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Type size={16} /> 新增內容
            </button>
          </div>
        </div>
      )}

      {blocks.map((block, index) => (
        <div key={index} className="group relative border border-slate-700 rounded-lg p-4 bg-slate-900/50 hover:bg-slate-900 transition-colors">
          {/* Block Header */}
          <div className="flex items-center gap-2 mb-2">
            <GripVertical className="text-slate-500 cursor-move" size={16} />
            <span className="text-xs text-slate-500 font-bold uppercase">
              Markdown
            </span>
            <div className="flex-1" />
            <button
              onClick={() => deleteBlock(index)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Block Content */}
          <div>
            {editingIndex === index ? (
              <MarkdownBlockEditor
                block={block}
                onUpdate={(content) => updateBlock(index, { ...block, content })}
                onBlur={() => setEditingIndex(null)}
              />
            ) : (
              <div
                onClick={() => setEditingIndex(index)}
                className="cursor-text p-3 rounded border border-transparent hover:border-slate-700 min-h-[100px]"
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  {block.content ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeHighlight, rehypeRaw]}
                      components={{
                        // 自定義圖片渲染，使用 ImageBlock 組件
                        img: ({ node, ...props }) => {
                          const { src, alt } = props as { src?: string; alt?: string };
                          if (!src) return null;
                          
                          // 從 alt 文字中提取 caption（如果格式為 "alt|caption"）
                          const [imageAlt, caption] = (alt || '').split('|');
                          
                          return (
                            <ImageBlockComponent 
                              url={src} 
                              alt={imageAlt || undefined} 
                              caption={caption || undefined} 
                            />
                          );
                        },
                        // 自定義連結渲染，檢測影片 URL
                        a: ({ node, ...props }) => {
                          const { href, children } = props as { href?: string; children?: React.ReactNode };
                          if (!href) return <a {...props} />;
                          
                          // 如果是影片 URL，使用 VideoBlock 渲染
                          if (isVideoUrl(href)) {
                            const title = typeof children === 'string' ? children : undefined;
                            return <VideoBlockComponent url={href} title={title} />;
                          }
                          
                          // 否則使用普通連結
                          return (
                            <a 
                              href={href} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 underline"
                              {...props}
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {block.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-slate-500 italic">點擊編輯 Markdown 內容...</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Add Block Buttons */}
          <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => addBlock(index)}
              className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1"
            >
              <Plus size={12} /> 新增內容
            </button>
          </div>
        </div>
      ))}

      {/* Add Block at End */}
      {blocks.length > 0 && (
        <div className="flex gap-2 justify-center pt-4 border-t border-slate-700">
          <button
            onClick={() => addBlock()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Type size={16} /> 新增內容
          </button>
        </div>
      )}
    </div>
  );
}


// Markdown Block Editor with Toolbar
function MarkdownBlockEditor({ 
  block, 
  onUpdate, 
  onBlur 
}: { 
  block: { type: 'markdown'; content: string }; 
  onUpdate: (content: string) => void;
  onBlur: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isToolbarClickRef = useRef(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);

  const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = block.content.substring(start, end);
    const textBefore = block.content.substring(0, start);
    const textAfter = block.content.substring(end);

    let newContent: string;
    if (selectedText) {
      // 如果有選取文字，用標記包圍它
      newContent = textBefore + before + selectedText + after + textAfter;
    } else {
      // 如果沒有選取，插入標記和 placeholder
      newContent = textBefore + before + placeholder + after + textAfter;
    }

    onUpdate(newContent);

    // 設定游標位置
    setTimeout(() => {
      if (textarea) {
        const cursorPos = start + before.length + (selectedText || placeholder).length;
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  };

  const insertHeading = (level: 1 | 2 | 3) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = block.content.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = block.content.indexOf('\n', end);
    const lineEndPos = lineEnd === -1 ? block.content.length : lineEnd;
    const currentLine = block.content.substring(lineStart, lineEndPos);
    
    // 檢查是否已經是標題
    const headingMatch = currentLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && parseInt(headingMatch[1]) === level) {
      // 移除標題標記
      const newContent = 
        block.content.substring(0, lineStart) + 
        headingMatch[2] + 
        block.content.substring(lineEndPos);
      onUpdate(newContent);
    } else {
      // 添加標題標記
      const headingMark = '#'.repeat(level);
      const newContent = 
        block.content.substring(0, lineStart) + 
        headingMark + ' ' + currentLine.trim() + 
        block.content.substring(lineEndPos);
      onUpdate(newContent);
    }
  };

  const insertList = (ordered: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = block.content.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = block.content.indexOf('\n', start);
    const lineEndPos = lineEnd === -1 ? block.content.length : lineEnd;
    const currentLine = block.content.substring(lineStart, lineEndPos);
    
    // 檢查是否已經是列表
    const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      // 移除列表標記
      const newContent = 
        block.content.substring(0, lineStart) + 
        listMatch[1] + listMatch[3] + 
        block.content.substring(lineEndPos);
      onUpdate(newContent);
    } else {
      // 添加列表標記
      const indent = currentLine.match(/^(\s*)/)?.[1] || '';
      const marker = ordered ? '1. ' : '- ';
      const newContent = 
        block.content.substring(0, lineStart) + 
        indent + marker + currentLine.trim() + 
        block.content.substring(lineEndPos);
      onUpdate(newContent);
    }
  };

  const insertCodeBlock = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = block.content.substring(start, end);
    
    if (selectedText.includes('\n')) {
      // 多行：使用程式碼區塊
      insertMarkdown('```\n', '\n```', selectedText || 'code');
    } else {
      // 單行：使用行內程式碼
      insertMarkdown('`', '`', selectedText || 'code');
    }
  };

  const insertImage = (url: string, alt?: string, caption?: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !url.trim()) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = block.content.substring(0, start);
    const textAfter = block.content.substring(end);
    
    // 構建 Markdown 圖片語法
    let imageMarkdown = '![';
    if (alt && caption) {
      imageMarkdown += `${alt}|${caption}`;
    } else if (alt) {
      imageMarkdown += alt;
    } else if (caption) {
      imageMarkdown += `|${caption}`;
    }
    imageMarkdown += `](${url.trim()})`;
    
    const newContent = textBefore + imageMarkdown + textAfter;
    onUpdate(newContent);
    
    setTimeout(() => {
      if (textarea) {
        const cursorPos = start + imageMarkdown.length;
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  };

  const insertVideo = (url: string, title?: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !url.trim()) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = block.content.substring(0, start);
    const textAfter = block.content.substring(end);
    
    // 構建 Markdown 連結語法（影片會自動被識別為影片 URL）
    const videoMarkdown = title 
      ? `[${title}](${url.trim()})`
      : url.trim();
    
    const newContent = textBefore + videoMarkdown + textAfter;
    onUpdate(newContent);
    
    setTimeout(() => {
      if (textarea) {
        const cursorPos = start + videoMarkdown.length;
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  };

  const handleToolbarClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    isToolbarClickRef.current = true;
    action();
    // 確保 textarea 保持焦點
    setTimeout(() => {
      textareaRef.current?.focus();
      // 重置標記
      setTimeout(() => {
        isToolbarClickRef.current = false;
      }, 100);
    }, 0);
  };

  return (
    <div>
      {/* Toolbar */}
      <div 
        className="toolbar-container flex items-center gap-1 p-2 bg-slate-800/50 border-b border-slate-700 rounded-t-lg flex-wrap"
        onMouseDown={(e) => {
          // 防止點擊工具欄時 textarea 失去焦點
          e.preventDefault();
        }}
      >
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, () => insertMarkdown('**', '**', '粗體文字'))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="粗體 (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, () => insertMarkdown('*', '*', '斜體文字'))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="斜體 (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <div className="w-px h-6 bg-slate-600 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, () => insertHeading(1))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="標題 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, () => insertHeading(2))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="標題 2"
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, () => insertHeading(3))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="標題 3"
        >
          <Heading3 size={16} />
        </button>
        <div className="w-px h-6 bg-slate-600 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, () => insertList(false))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="無序列表"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, () => insertList(true))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="有序列表"
        >
          <List size={16} className="transform rotate-90" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, () => insertMarkdown('> ', '', '引用文字'))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="引用"
        >
          <Quote size={16} />
        </button>
        <div className="w-px h-6 bg-slate-600 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, insertCodeBlock)}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="程式碼"
        >
          <Code size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, () => insertMarkdown('[', '](url)', '連結文字'))}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="連結"
        >
          <Link2 size={16} />
        </button>
        <div className="w-px h-6 bg-slate-600 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            isToolbarClickRef.current = true;
            setShowImageDialog(true);
            // 不立即重置標記，讓對話框打開期間保持標記
          }}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="插入圖片"
        >
          <ImageIcon size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            isToolbarClickRef.current = true;
            setShowVideoDialog(true);
            // 不立即重置標記，讓對話框打開期間保持標記
          }}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="插入影片"
        >
          <Video size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => handleToolbarClick(e, () => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const start = textarea.selectionStart;
            const newContent = 
              block.content.substring(0, start) + 
              '\n---\n' + 
              block.content.substring(start);
            onUpdate(newContent);
            setTimeout(() => {
              if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(start + 5, start + 5);
              }
            }, 0);
          })}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          title="水平線"
        >
          <Minus size={16} />
        </button>
      </div>
      
      {/* Image Dialog */}
      {showImageDialog && (
        <MarkdownImageDialog
          onClose={() => {
            setShowImageDialog(false);
            // 對話框關閉後，重置標記並恢復焦點
            setTimeout(() => {
              isToolbarClickRef.current = false;
              textareaRef.current?.focus();
            }, 100);
          }}
          onSubmit={(url, alt, caption) => {
            insertImage(url, alt, caption);
            setShowImageDialog(false);
            // 插入後恢復焦點
            setTimeout(() => {
              isToolbarClickRef.current = false;
              textareaRef.current?.focus();
            }, 100);
          }}
        />
      )}
      
      {/* Video Dialog */}
      {showVideoDialog && (
        <MarkdownVideoDialog
          onClose={() => {
            setShowVideoDialog(false);
            // 對話框關閉後，重置標記並恢復焦點
            setTimeout(() => {
              isToolbarClickRef.current = false;
              textareaRef.current?.focus();
            }, 100);
          }}
          onSubmit={(url, title) => {
            insertVideo(url, title);
            setShowVideoDialog(false);
            // 插入後恢復焦點
            setTimeout(() => {
              isToolbarClickRef.current = false;
              textareaRef.current?.focus();
            }, 100);
          }}
        />
      )}
      
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={block.content}
        onChange={(e) => onUpdate(e.target.value)}
        onBlur={(e) => {
          // 清除之前的 timeout
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
          }
          
          // 延遲執行 onBlur，檢查是否是因為工具欄點擊或對話框打開
          blurTimeoutRef.current = setTimeout(() => {
            // 如果焦點還在 textarea 或工具欄上，或對話框正在顯示，不觸發 onBlur
            const activeElement = document.activeElement;
            if (activeElement === textareaRef.current || 
                activeElement?.closest('.toolbar-container') ||
                activeElement?.closest('.fixed') || // 對話框是 fixed 定位
                isToolbarClickRef.current ||
                showImageDialog ||
                showVideoDialog) {
              return;
            }
            onBlur();
          }, 150);
        }}
        className="w-full min-h-[200px] bg-slate-950 text-slate-200 font-mono text-sm p-3 rounded-b-lg border border-slate-700 border-t-0 focus:outline-none focus:border-emerald-500 resize-none"
        placeholder="輸入 Markdown 內容..."
        autoFocus
      />
    </div>
  );
}

// Markdown Image Dialog
function MarkdownImageDialog({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void; 
  onSubmit: (url: string, alt?: string, caption?: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');

  const handleSubmit = () => {
    if (url.trim()) {
      onSubmit(url.trim(), alt.trim() || undefined, caption.trim() || undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <ImageIcon size={20} /> 插入圖片
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">圖片 URL *</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url.trim()) {
                  handleSubmit();
                }
              }}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">替代文字 (Alt) - 選填</label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="圖片描述"
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">說明文字 (Caption) - 選填</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="圖片下方的說明"
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium"
          >
            插入
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

// Markdown Video Dialog
function MarkdownVideoDialog({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void; 
  onSubmit: (url: string, title?: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (url.trim()) {
      onSubmit(url.trim(), title.trim() || undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Video size={20} /> 插入影片
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">影片 URL *</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url.trim()) {
                  handleSubmit();
                }
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1">支援 YouTube、Vimeo 或其他影片連結</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">標題 (選填)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="影片標題"
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium"
          >
            插入
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

