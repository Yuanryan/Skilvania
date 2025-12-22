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
  switch (block.type) {
    case 'markdown':
      return (
        <div className="prose prose-invert prose-emerald max-w-none markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
          >
            {block.content}
          </ReactMarkdown>
        </div>
      );
    
    case 'image':
      return <ImageBlock url={block.url} alt={block.alt} caption={block.caption} />;
    
    case 'video':
      return <VideoBlock url={block.url} provider={block.provider} title={block.title} />;
    
    default:
      return null;
  }
}


