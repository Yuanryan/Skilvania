'use client';

import React, { useState } from 'react';
import { ImageIcon, AlertCircle } from 'lucide-react';

interface ImageBlockProps {
  url: string;
  alt?: string;
  caption?: string;
}

export default function ImageBlock({ url, alt, caption }: ImageBlockProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

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
        <p className="text-red-400 text-sm mb-1">無法載入圖片</p>
        <p className="text-slate-500 text-xs">{url}</p>
      </div>
    );
  }

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

