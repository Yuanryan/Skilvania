'use client';

import React, { useState } from 'react';
import { ImageIcon, AlertCircle, FileText, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

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

  // 一般圖片顯示（帶縮放功能）
  return <ImageWithZoom url={url} alt={alt} caption={caption} loading={loading} onLoad={handleLoad} onError={handleError} />;
}

/**
 * 帶縮放功能的圖片組件
 */
function ImageWithZoom({ 
  url, 
  alt, 
  caption, 
  loading, 
  onLoad, 
  onError 
}: { 
  url: string; 
  alt?: string; 
  caption?: string; 
  loading: boolean;
  onLoad: () => void;
  onError: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isModalOpen) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  return (
    <>
      <figure className="my-6">
        <div className="relative bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden group cursor-pointer" onClick={() => setIsModalOpen(true)}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
              <div className="text-center">
                <ImageIcon className="animate-pulse mx-auto text-slate-500 mb-2" size={32} />
                <p className="text-slate-500 text-sm">載入圖片中...</p>
              </div>
            </div>
          )}
          <div className="relative">
            <img
              src={url}
              alt={alt || caption || '圖片'}
              onError={onError}
              onLoad={onLoad}
              className={`w-full h-auto ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            />
            {/* 懸停時顯示放大圖標 */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ZoomIn className="text-white" size={32} />
            </div>
          </div>
        </div>
        {caption && (
          <figcaption className="mt-2 text-center text-slate-400 text-sm italic">
            {caption}
          </figcaption>
        )}
      </figure>

      {/* 放大 Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={handleReset}
          onWheel={handleWheel}
        >
          {/* 工具欄 */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-slate-800/90 rounded-lg p-2 border border-slate-700 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoomOut();
              }}
              className="p-2 hover:bg-slate-700 rounded transition-colors"
              title="縮小"
            >
              <ZoomOut className="text-white" size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleZoomIn();
              }}
              className="p-2 hover:bg-slate-700 rounded transition-colors"
              title="放大"
            >
              <ZoomIn className="text-white" size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRotate();
              }}
              className="p-2 hover:bg-slate-700 rounded transition-colors"
              title="旋轉"
            >
              <RotateCw className="text-white" size={20} />
            </button>
            <div className="px-3 py-2 text-white text-sm flex items-center">
              {Math.round(scale * 100)}%
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="p-2 hover:bg-slate-700 rounded transition-colors"
              title="重置"
            >
              <span className="text-white text-sm">重置</span>
            </button>
          </div>

          {/* 關閉按鈕 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(false);
              handleReset();
            }}
            className="absolute top-4 right-4 p-2 bg-slate-800/90 hover:bg-slate-700 rounded-lg border border-slate-700 z-10 transition-colors"
            title="關閉"
          >
            <X className="text-white" size={24} />
          </button>

          {/* 圖片容器 */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            <img
              src={url}
              alt={alt || caption || '圖片'}
              className="max-w-full max-h-[90vh] object-contain transition-transform duration-200"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transformOrigin: 'center center'
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}



