// Block 渲染工具

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { ContentBlock } from '@/types/content';
import ImageBlock from '@/components/content/ImageBlock';
import VideoBlock from '@/components/content/VideoBlock';
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

interface BlockRendererProps {
  blocks: ContentBlock[];
  className?: string;
}

/**
 * 渲染 Block 陣列
 */
export default function BlockRenderer({ blocks, className = '' }: BlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className={`text-slate-400 italic ${className}`}>
        <p>此課程節點還沒有內容。請稍後再來查看。</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {blocks.map((block, index) => (
        <BlockComponent key={index} block={block} />
      ))}
    </div>
  );
}

/**
 * 渲染單個 Block
 */
function BlockComponent({ block }: { block: ContentBlock }) {
  // 現在只有 markdown block
  return (
    <div className="prose prose-invert prose-emerald max-w-none markdown-content">
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
              <ImageBlock 
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
              return <VideoBlock url={href} title={title} />;
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
    </div>
  );
}



