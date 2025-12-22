'use client';

import React, { useState } from 'react';
import { X, GripVertical, Image as ImageIcon, Video, Type, Plus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { ContentBlock, ImageBlock, VideoBlock } from '@/types/content';
import BlockRenderer from '@/lib/content/blockRenderer';
import 'highlight.js/styles/github-dark.css';

interface BlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

export default function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);

  const addBlock = (type: 'markdown' | 'image' | 'video', index?: number) => {
    const newBlock: ContentBlock = 
      type === 'markdown' 
        ? { type: 'markdown', content: '' }
        : type === 'image'
        ? { type: 'image', url: '' }
        : { type: 'video', url: '' };
    
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

  const handleImageSubmit = (url: string, alt?: string, caption?: string) => {
    if (!url.trim()) return;
    const newBlock: ImageBlock = { type: 'image', url: url.trim(), alt, caption };
    const newBlocks = [...blocks];
    if (insertAfterIndex !== null) {
      newBlocks.splice(insertAfterIndex + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    onChange(newBlocks);
    setShowImageDialog(false);
    setInsertAfterIndex(null);
  };

  const handleVideoSubmit = (url: string, title?: string) => {
    if (!url.trim()) return;
    const newBlock: VideoBlock = { type: 'video', url: url.trim(), title };
    const newBlocks = [...blocks];
    if (insertAfterIndex !== null) {
      newBlocks.splice(insertAfterIndex + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    onChange(newBlocks);
    setShowVideoDialog(false);
    setInsertAfterIndex(null);
  };

  return (
    <div className="space-y-4">
      {blocks.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="mb-4">還沒有內容，點擊下方按鈕新增 Block</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => addBlock('markdown')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Type size={16} /> 新增文字
            </button>
            <button
              onClick={() => setShowImageDialog(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <ImageIcon size={16} /> 新增圖片
            </button>
            <button
              onClick={() => setShowVideoDialog(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Video size={16} /> 新增影片
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
              {block.type === 'markdown' ? 'Markdown' : block.type === 'image' ? 'Image' : 'Video'}
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
          {block.type === 'markdown' && (
            <div>
              {editingIndex === index ? (
                <div>
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlock(index, { ...block, content: e.target.value })}
                    onBlur={() => setEditingIndex(null)}
                    className="w-full min-h-[200px] bg-slate-950 text-slate-200 font-mono text-sm p-3 rounded border border-slate-700 focus:outline-none focus:border-emerald-500 resize-none"
                    placeholder="輸入 Markdown 內容..."
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  onClick={() => setEditingIndex(index)}
                  className="cursor-text p-3 rounded border border-transparent hover:border-slate-700 min-h-[100px]"
                >
                  <div className="prose prose-invert prose-sm max-w-none">
                    {block.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                        {block.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-slate-500 italic">點擊編輯 Markdown 內容...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {block.type === 'image' && (
            <div>
              {editingIndex === index ? (
                <ImageBlockEditor
                  block={block}
                  onSave={(updated) => {
                    updateBlock(index, updated);
                    setEditingIndex(null);
                  }}
                  onCancel={() => setEditingIndex(null)}
                />
              ) : (
                <div onClick={() => setEditingIndex(index)} className="cursor-pointer">
                  <BlockRenderer blocks={[block]} />
                </div>
              )}
            </div>
          )}

          {block.type === 'video' && (
            <div>
              {editingIndex === index ? (
                <VideoBlockEditor
                  block={block}
                  onSave={(updated) => {
                    updateBlock(index, updated);
                    setEditingIndex(null);
                  }}
                  onCancel={() => setEditingIndex(null)}
                />
              ) : (
                <div onClick={() => setEditingIndex(index)} className="cursor-pointer">
                  <BlockRenderer blocks={[block]} />
                </div>
              )}
            </div>
          )}

          {/* Add Block Buttons */}
          <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => addBlock('markdown', index)}
              className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1"
            >
              <Plus size={12} /> 文字
            </button>
            <button
              onClick={() => {
                setInsertAfterIndex(index);
                setShowImageDialog(true);
              }}
              className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1"
            >
              <Plus size={12} /> 圖片
            </button>
            <button
              onClick={() => {
                setInsertAfterIndex(index);
                setShowVideoDialog(true);
              }}
              className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1"
            >
              <Plus size={12} /> 影片
            </button>
          </div>
        </div>
      ))}

      {/* Add Block at End */}
      {blocks.length > 0 && (
        <div className="flex gap-2 justify-center pt-4 border-t border-slate-700">
          <button
            onClick={() => addBlock('markdown')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Type size={16} /> 新增文字
          </button>
          <button
            onClick={() => {
              setInsertAfterIndex(null);
              setShowImageDialog(true);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <ImageIcon size={16} /> 新增圖片
          </button>
          <button
            onClick={() => {
              setInsertAfterIndex(null);
              setShowVideoDialog(true);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Video size={16} /> 新增影片
          </button>
        </div>
      )}

      {/* Image Dialog */}
      {showImageDialog && (
        <ImageDialog
          onClose={() => setShowImageDialog(false)}
          onSubmit={handleImageSubmit}
        />
      )}

      {/* Video Dialog */}
      {showVideoDialog && (
        <VideoDialog
          onClose={() => setShowVideoDialog(false)}
          onSubmit={handleVideoSubmit}
        />
      )}
    </div>
  );
}

// Image Block Editor
function ImageBlockEditor({ block, onSave, onCancel }: { block: ImageBlock; onSave: (block: ImageBlock) => void; onCancel: () => void }) {
  const [url, setUrl] = useState(block.url);
  const [alt, setAlt] = useState(block.alt || '');
  const [caption, setCaption] = useState(block.caption || '');

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-slate-400 mb-1">圖片 URL *</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">替代文字 (Alt)</label>
        <input
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="圖片描述"
          className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">說明文字 (Caption)</label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="圖片下方的說明"
          className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ type: 'image', url, alt: alt || undefined, caption: caption || undefined })}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium"
        >
          儲存
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium"
        >
          取消
        </button>
      </div>
    </div>
  );
}

// Video Block Editor
function VideoBlockEditor({ block, onSave, onCancel }: { block: VideoBlock; onSave: (block: VideoBlock) => void; onCancel: () => void }) {
  const [url, setUrl] = useState(block.url);
  const [title, setTitle] = useState(block.title || '');

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-slate-400 mb-1">影片 URL *</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
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
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ type: 'video', url, title: title || undefined })}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium"
        >
          儲存
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium"
        >
          取消
        </button>
      </div>
    </div>
  );
}

// Image Dialog
function ImageDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (url: string, alt?: string, caption?: string) => void }) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <ImageIcon size={20} /> 新增圖片
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">圖片 URL *</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">替代文字 (Alt)</label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="圖片描述"
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">說明文字 (Caption)</label>
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
            onClick={() => {
              if (url.trim()) {
                onSubmit(url.trim(), alt || undefined, caption || undefined);
              }
            }}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium"
          >
            新增
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

// Video Dialog
function VideoDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (url: string, title?: string) => void }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Video size={20} /> 新增影片
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">影片 URL *</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
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
            onClick={() => {
              if (url.trim()) {
                onSubmit(url.trim(), title || undefined);
              }
            }}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium"
          >
            新增
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

