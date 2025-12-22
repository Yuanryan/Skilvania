'use client';

import React, { useState } from 'react';
import { Video, AlertCircle, ExternalLink } from 'lucide-react';

interface VideoBlockProps {
  url: string;
  provider?: 'youtube' | 'vimeo' | 'other';
  title?: string;
}

/**
 * 從 URL 提取 YouTube 影片 ID
 */
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * 從 URL 提取 Vimeo 影片 ID
 */
function getVimeoVideoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/video\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * 檢測 URL 的影片提供者
 */
function detectProvider(url: string): 'youtube' | 'vimeo' | 'other' {
  if (getYouTubeVideoId(url)) return 'youtube';
  if (getVimeoVideoId(url)) return 'vimeo';
  return 'other';
}

export default function VideoBlock({ url, provider, title }: VideoBlockProps) {
  const [error, setError] = useState(false);
  const detectedProvider = provider || detectProvider(url);
  const youtubeId = getYouTubeVideoId(url);
  const vimeoId = getVimeoVideoId(url);

  // YouTube 嵌入
  if (detectedProvider === 'youtube' && youtubeId) {
    const embedUrl = `https://www.youtube.com/embed/${youtubeId}`;
    
    return (
      <div className="my-6">
        <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
          <div className="relative pb-[56.25%] h-0 overflow-hidden">
            <iframe
              src={embedUrl}
              title={title || 'YouTube 影片'}
              className="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
        {title && (
          <p className="mt-2 text-center text-slate-400 text-sm">{title}</p>
        )}
      </div>
    );
  }

  // Vimeo 嵌入
  if (detectedProvider === 'vimeo' && vimeoId) {
    const embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
    
    return (
      <div className="my-6">
        <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
          <div className="relative pb-[56.25%] h-0 overflow-hidden">
            <iframe
              src={embedUrl}
              title={title || 'Vimeo 影片'}
              className="absolute top-0 left-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
        {title && (
          <p className="mt-2 text-center text-slate-400 text-sm">{title}</p>
        )}
      </div>
    );
  }

  // 其他影片或無法嵌入的 URL
  return (
    <div className="my-6">
      <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Video className="text-emerald-500" size={24} />
          <div className="flex-1">
            {title && (
              <h4 className="text-white font-semibold mb-1">{title}</h4>
            )}
            <p className="text-slate-400 text-sm break-all">{url}</p>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <ExternalLink size={16} />
          在新視窗開啟影片
        </a>
      </div>
    </div>
  );
}

