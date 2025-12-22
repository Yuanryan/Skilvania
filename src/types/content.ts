// Content Block 類型定義

export type ContentBlockType = 'markdown' | 'image' | 'video';

export interface MarkdownBlock {
  type: 'markdown';
  content: string;
}

export interface ImageBlock {
  type: 'image';
  url: string;
  alt?: string;
  caption?: string;
}

export interface VideoBlock {
  type: 'video';
  url: string;
  provider?: 'youtube' | 'vimeo' | 'other';
  title?: string;
}

export type ContentBlock = MarkdownBlock | ImageBlock | VideoBlock;

// 內容格式：可以是 Markdown 字串或 Block 陣列
export type NodeContent = string | ContentBlock[];

// 檢測內容是否為 JSON Block 格式
export function isBlockFormat(content: string): boolean {
  if (!content || content.trim() === '') return false;
  
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.every(block => 
      typeof block === 'object' && 
      block !== null && 
      'type' in block &&
      (block.type === 'markdown' || block.type === 'image' || block.type === 'video')
    );
  } catch {
    return false;
  }
}

// 解析內容為 Block 陣列
export function parseContent(content: string): ContentBlock[] {
  if (!content || content.trim() === '') {
    return [];
  }

  // 如果是 Block 格式，直接解析
  if (isBlockFormat(content)) {
    try {
      return JSON.parse(content) as ContentBlock[];
    } catch {
      // 如果解析失敗，當作 Markdown 處理
      return [{ type: 'markdown', content }];
    }
  }

  // 否則當作 Markdown 處理
  return [{ type: 'markdown', content }];
}

// 將 Block 陣列轉換為字串（用於儲存）
export function stringifyContent(blocks: ContentBlock[]): string {
  if (blocks.length === 0) return '';
  
  // 如果只有一個 markdown block，直接返回內容（向後兼容）
  if (blocks.length === 1 && blocks[0].type === 'markdown') {
    return blocks[0].content;
  }
  
  // 否則返回 JSON 字串
  return JSON.stringify(blocks);
}

// 將 Markdown 字串轉換為 Block 陣列
export function markdownToBlocks(markdown: string): ContentBlock[] {
  if (!markdown || markdown.trim() === '') {
    return [];
  }
  
  return [{ type: 'markdown', content: markdown }];
}

