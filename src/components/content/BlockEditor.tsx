'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, GripVertical, Image as ImageIcon, Video, Type, Plus, Trash2, Bold, Italic, Heading1, Heading2, Heading3, List, Link2, Code, Quote, Minus, Loader2, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import imageCompression from 'browser-image-compression';
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
  courseId?: string;
  nodeId?: string;
}

export default function BlockEditor({ blocks, onChange, courseId, nodeId }: BlockEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // 確保只有一個 block，如果沒有或有多個，則只保留第一個或創建一個
  const currentBlock = blocks.length > 0 ? blocks[0] : { type: 'markdown' as const, content: '' };
  
  // 如果 blocks 不是只有一個，更新為只有一個
  useEffect(() => {
    if (blocks.length !== 1 || blocks[0].type !== 'markdown') {
      onChange([currentBlock]);
    }
  }, []);

  const updateBlock = (block: ContentBlock) => {
    onChange([block]);
  };


  return (
    <div>
      {editingIndex === 0 ? (
        <MarkdownBlockEditor
          block={currentBlock}
          onUpdate={(content) => updateBlock({ ...currentBlock, content })}
          onBlur={() => setEditingIndex(null)}
          courseId={courseId}
          nodeId={nodeId}
        />
      ) : (
        <div
          onClick={() => setEditingIndex(0)}
          className="cursor-text p-3 rounded border border-transparent hover:border-slate-700 min-h-[100px]"
        >
          <div className="prose prose-invert prose-sm max-w-none">
            {currentBlock.content ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={{
                  // 自定義段落渲染，避免 p 標籤內部嵌套 div
                  p: ({ node, ...props }) => {
                    return <div className="mb-4" {...props} />;
                  },
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
                {currentBlock.content}
              </ReactMarkdown>
            ) : (
              <p className="text-slate-500 italic">點擊編輯 Markdown 內容...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// Markdown Block Editor with Toolbar
function MarkdownBlockEditor({ 
  block, 
  onUpdate, 
  onBlur,
  courseId,
  nodeId
}: { 
  block: { type: 'markdown'; content: string }; 
  onUpdate: (content: string) => void;
  onBlur: () => void;
  courseId?: string;
  nodeId?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isToolbarClickRef = useRef(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);

  // 自動調整 textarea 高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [block.content]);

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
          courseId={courseId || undefined}
          nodeId={nodeId || undefined}
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
        className="w-full bg-slate-950 text-slate-200 font-mono text-sm p-3 rounded-b-lg border border-slate-700 border-t-0 focus:outline-none focus:border-emerald-500 resize-none"
        placeholder="輸入 Markdown 內容..."
        autoFocus
        style={{ minHeight: '200px', height: 'auto' }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }}
      />
    </div>
  );
}

// Markdown Image Dialog
function MarkdownImageDialog({ 
  onClose, 
  onSubmit,
  courseId,
  nodeId
}: { 
  onClose: () => void; 
  onSubmit: (url: string, alt?: string, caption?: string) => void;
  courseId?: string;
  nodeId?: string;
}) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 當對話框關閉時重置狀態
  const handleClose = () => {
    setUrl('');
    setAlt('');
    setCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  // 調試：檢查 courseId 和 nodeId 是否正確傳遞
  useEffect(() => {
    if (!courseId || !nodeId) {
      console.warn('MarkdownImageDialog: Missing courseId or nodeId', { courseId, nodeId });
    }
  }, [courseId, nodeId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 清除舊的 URL 和 alt，準備上傳新文件
    setUrl('');
    setAlt('');

    // 驗證文件類型（支援多種圖片格式和 PDF）
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf'
    ];
    
    // 也檢查文件擴展名（因為某些瀏覽器可能無法正確識別 HEIC 的 MIME type）
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'pdf'];
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt || '')) {
      alert('不支援的檔案類型。支援的格式：JPEG、PNG、GIF、WebP、HEIC、HEIF、PDF');
      return;
    }

    // 檢查 courseId 和 nodeId
    if (!courseId || !nodeId) {
      console.error('Missing courseId or nodeId:', { courseId, nodeId });
      alert('無法上傳：缺少課程或節點資訊。請確認您正在編輯課程內容頁面。');
      return;
    }

    setUploading(true);
    try {
      // 只對圖片進行壓縮（PDF 和 HEIC 不壓縮）
      const isImage = file.type.startsWith('image/') && 
                     !file.type.includes('heic') && 
                     !file.type.includes('heif') &&
                     fileExt !== 'heic' && 
                     fileExt !== 'heif' &&
                     fileExt !== 'pdf';
      
      let fileToUpload = file;
      
      if (isImage) {
        // 根據原始文件大小動態調整壓縮參數（平衡品質和大小）
        const originalSizeMB = file.size / 1024 / 1024;
        
        // 如果原始文件已經很小（< 0.8MB），不壓縮
        if (originalSizeMB < 0.8) {
          console.log('原始文件已小於 0.8MB，跳過壓縮');
          fileToUpload = file;
        } else {
          // 動態設置壓縮參數（更注重品質）
          let maxSizeMB = 0.8;
          let maxDimension = 1920;
          let quality = 0.85;
          
          // 如果文件很大，使用適度壓縮
          if (originalSizeMB > 3) {
            maxSizeMB = 0.6;
            maxDimension = 1600;
            quality = 0.8;
          } else if (originalSizeMB > 2) {
            maxSizeMB = 0.7;
            maxDimension = 1800;
            quality = 0.82;
          } else if (originalSizeMB > 1) {
            maxSizeMB = 0.75;
            maxDimension = 1920;
            quality = 0.85;
          }
          
          // 壓縮圖片選項
          const options = {
            maxSizeMB, // 壓縮後最大大小
            maxWidthOrHeight: maxDimension, // 最大寬度或高度
            useWebWorker: true, // 使用 Web Worker 進行壓縮（不阻塞 UI）
            fileType: file.type, // 保持原始文件類型
            initialQuality: quality, // 初始品質（提高品質）
            alwaysKeepResolution: false, // 允許降低解析度
          };

          // 壓縮圖片
          let compressedFile = await imageCompression(file, options);
          
          // 只有在壓縮後仍然明顯超過目標大小時才進行二次壓縮
          if (compressedFile.size > maxSizeMB * 1024 * 1024 * 1.5) {
            console.log('第一次壓縮後仍明顯超過目標大小，進行二次壓縮...');
            const secondPassOptions = {
              maxSizeMB: maxSizeMB * 0.9,
              maxWidthOrHeight: maxDimension * 0.95,
              useWebWorker: true,
              fileType: file.type,
              initialQuality: quality * 0.95,
              alwaysKeepResolution: false,
            };
            compressedFile = await imageCompression(compressedFile, secondPassOptions);
          }
          
          // 顯示壓縮結果
          const originalSize = (file.size / 1024 / 1024).toFixed(2);
          const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
          const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
          console.log(`圖片壓縮：${originalSize}MB → ${compressedSize}MB (減少 ${compressionRatio}%)`);
          
          fileToUpload = compressedFile;
        }
      } else {
        // PDF 和 HEIC 不壓縮，直接使用原文件
        console.log(`上傳 ${fileExt?.toUpperCase()} 檔案（不壓縮）`);
      }
      
      // 驗證文件大小（5MB）
      if (fileToUpload.size > 5 * 1024 * 1024) {
        alert('檔案太大。最大大小為 5MB。');
        setUploading(false);
        return;
      }

      // 上傳文件
      const formData = new FormData();
      formData.append('file', fileToUpload, file.name); // 使用原始文件名

      const response = await fetch(`/api/courses/${courseId}/nodes/${nodeId}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.details 
          ? `${error.error}: ${error.details}`
          : error.error || '上傳失敗';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setUrl(data.url);
      // 自動使用文件名作為 alt（如果沒有設置）
      if (!alt && file.name) {
        setAlt(file.name.replace(/\.[^/.]+$/, '')); // 移除副檔名
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof Error && error.message.includes('compression')) {
        alert('圖片壓縮失敗，請稍後再試');
      } else {
        alert(error instanceof Error ? error.message : '上傳失敗，請稍後再試');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (url.trim()) {
      onSubmit(url.trim(), alt.trim() || undefined, caption.trim() || undefined);
      // 提交後重置狀態
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <ImageIcon size={20} /> 插入圖片
        </h3>
        
        {/* 模式切換 */}
        <div className="flex gap-2 mb-4 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setUploadMode('upload')}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              uploadMode === 'upload'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            上傳圖片
          </button>
          <button
            onClick={() => setUploadMode('url')}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              uploadMode === 'url'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            使用 URL
          </button>
        </div>

        <div className="space-y-3">
          {uploadMode === 'upload' ? (
            <div>
              <label className="block text-xs text-slate-400 mb-1">選擇圖片 *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif,application/pdf,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> 上傳中...
                  </>
                ) : (
                  <>
                    <ImageIcon size={16} /> 選擇檔案
                  </>
                )}
              </button>
              {url && (
                <div className="mt-3">
                  <div className="mb-2 text-xs text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 size={12} /> 已上傳
                  </div>
                  {/* 文件預覽 */}
                  <div className="relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                    {(() => {
                      const lowerUrl = url.toLowerCase();
                      const isPdf = lowerUrl.includes('.pdf');
                      const isHeic = lowerUrl.includes('.heic') || lowerUrl.includes('.heif');
                      
                      // PDF 預覽
                      if (isPdf) {
                        return (
                          <iframe
                            src={url}
                            title="PDF 預覽"
                            className="w-full h-64 border-none"
                            style={{ minHeight: '256px' }}
                          />
                        );
                      }
                      
                      // HEIC 預覽（瀏覽器不支援，顯示下載連結）
                      if (isHeic) {
                        return (
                          <div className="p-6 text-center">
                            <ImageIcon className="mx-auto text-slate-500 mb-2" size={32} />
                            <p className="text-slate-400 text-sm mb-2">HEIC 格式</p>
                            <p className="text-slate-500 text-xs mb-3">瀏覽器無法預覽，請下載查看</p>
                            <a
                              href={url}
                              download
                              className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
                            >
                              下載檔案
                            </a>
                          </div>
                        );
                      }
                      
                      // 一般圖片預覽
                      return (
                        <img
                          src={url}
                          alt={alt || '上傳的圖片'}
                          className="w-full h-auto max-h-64 object-contain"
                          onError={(e) => {
                            // 如果圖片載入失敗，顯示錯誤訊息
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="p-4 text-center">
                                  <p class="text-red-400 text-sm mb-1">無法預覽圖片</p>
                                  <p class="text-slate-500 text-xs break-all">${url}</p>
                                </div>
                              `;
                            }
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}
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

