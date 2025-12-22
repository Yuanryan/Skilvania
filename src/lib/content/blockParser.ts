// Block 解析和轉換工具

import { ContentBlock, parseContent, stringifyContent, markdownToBlocks } from '@/types/content';

/**
 * 解析內容為 Block 陣列
 */
export function parseBlocks(content: string): ContentBlock[] {
  return parseContent(content);
}

/**
 * 將 Block 陣列轉換為儲存格式字串
 */
export function stringifyBlocks(blocks: ContentBlock[]): string {
  return stringifyContent(blocks);
}

/**
 * 將 Markdown 轉換為 Block 陣列
 */
export function convertMarkdownToBlocks(markdown: string): ContentBlock[] {
  return markdownToBlocks(markdown);
}

/**
 * 驗證 Block 格式是否正確
 */
export function validateBlock(block: any): block is ContentBlock {
  if (!block || typeof block !== 'object') return false;
  
  if (!('type' in block)) return false;
  
  switch (block.type) {
    case 'markdown':
      return typeof block.content === 'string';
    case 'image':
      return typeof block.url === 'string' && 
             (block.alt === undefined || typeof block.alt === 'string') &&
             (block.caption === undefined || typeof block.caption === 'string');
    case 'video':
      return typeof block.url === 'string' &&
             (block.provider === undefined || ['youtube', 'vimeo', 'other'].includes(block.provider)) &&
             (block.title === undefined || typeof block.title === 'string');
    default:
      return false;
  }
}

/**
 * 驗證 Block 陣列
 */
export function validateBlocks(blocks: any[]): blocks is ContentBlock[] {
  return Array.isArray(blocks) && blocks.every(validateBlock);
}


