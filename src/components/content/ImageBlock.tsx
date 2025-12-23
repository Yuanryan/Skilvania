'use client';

import React, { useState } from 'react';
import { ImageIcon, AlertCircle, FileText } from 'lucide-react';

interface ImageBlockProps {
  url: string;
  alt?: string;
  caption?: string;
}

// 檢測文件類型
function getFileType(url: string): 'image' | 'pdf' | 'heic' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.pdf')) return 'pdf';
  if (lowerUrl.includes('.heic') || lowerUrl.includes('.heif')) return 'heic';
  return 'image';
}

export default function ImageBlock({ url, alt, caption }: ImageBlockProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileType = getFileType(url);

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  if (error) {
    return (
      <div className="bg-slate-900/50 border border-red-500/20 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <AlertCircle className="text-red-500 mb-2" size={32} />
        <p className="text-red-400 text-sm mb-1">無法載入檔案</p>
        <p className="text-slate-500 text-xs break-all">{url}</p>
      </div>
    );
  }

  // PDF 顯示
  if (fileType === 'pdf') {
    return (
      <figure className="my-6">
        <div className="relative bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
              <div className="text-center">
                <FileText className="animate-pulse mx-auto text-slate-500 mb-2" size={32} />
                <p className="text-slate-500 text-sm">載入 PDF 中...</p>
              </div>
            </div>
          )}
          <iframe
            src={url}
            title={alt || caption || 'PDF 文件'}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full min-h-[600px] ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            style={{ border: 'none' }}
          />
        </div>
        {caption && (
          <figcaption className="mt-2 text-center text-slate-400 text-sm italic">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  // HEIC 顯示（瀏覽器原生不支援，提供下載連結）
  if (fileType === 'heic') {
    return (
      <figure className="my-6">
        <div className="relative bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden p-8 flex flex-col items-center justify-center min-h-[300px]">
          <ImageIcon className="text-slate-500 mb-4" size={48} />
          <p className="text-slate-400 text-sm mb-2">HEIC 格式圖片</p>
          <p className="text-slate-500 text-xs mb-4">瀏覽器無法直接預覽，請下載查看</p>
          <a
            href={url}
            download
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            下載圖片
          </a>
        </div>
        {caption && (
          <figcaption className="mt-2 text-center text-slate-400 text-sm italic">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  // 一般圖片顯示
  return (
    <figure className="my-6">
      <div className="relative bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <div className="text-center">
              <ImageIcon className="animate-pulse mx-auto text-slate-500 mb-2" size={32} />
              <p className="text-slate-500 text-sm">載入圖片中...</p>
            </div>
          </div>
        )}
        <img
          src={url}
          alt={alt || caption || '圖片'}
          onError={handleError}
          onLoad={handleLoad}
          className={`w-full h-auto ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-slate-400 text-sm italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}



