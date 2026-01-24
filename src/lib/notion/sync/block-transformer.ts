/**
 * Block Transformer - Converts Notion blocks into instructor-friendly block types
 *
 * This module handles the transformation of raw Notion blocks into normalized
 * curriculum blocks that can be used by the session runner.
 */

import type { NotionBlock, RichText } from '@/lib/types';
import { BlockType } from '@prisma/client';

// Pattern to detect time durations in text (e.g., "5 min", "10 minutes", "15m")
const TIMER_PATTERN = /(\d+)\s*(min|minute|minutes|m)\b/i;

// Headers that indicate a materials table
const MATERIALS_TABLE_HEADERS = ['material', 'quantity', 'notes', 'item', 'resource', 'equipment', 'tool'];

// Headers that indicate an assessment grid
const ASSESSMENT_TABLE_HEADERS = ['criterion', 'criteria', 'evidence', 'assessment', 'learning outcome', 'ocn'];

// Emojis that indicate different block types
const TIMER_EMOJIS = ['⏱️', '⏰', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕'];
const KEY_POINT_EMOJIS = ['💡', '⭐', '📌', '🔑', '✨'];
const ACTIVITY_EMOJIS = ['🔨', '🛠️', '✋', '👐', '🎯', '✍️', '🔧'];
const DISCUSSION_EMOJIS = ['💬', '🗣️', '❓', '🤔', '💭'];
const WARNING_EMOJIS = ['⚠️', '🚨', '❗', '⛔'];

export interface TransformedBlock {
  notionBlockId: string;
  blockType: BlockType;
  content: Record<string, unknown>;
  durationMins?: number;
  isRequired: boolean;
  sortOrder: number;
}

/**
 * Extract plain text from rich text array
 */
export function extractPlainText(richText: RichText[] | undefined): string {
  if (!richText) return '';
  return richText.map(t => t.plain_text).join('');
}

/**
 * Transform an array of Notion blocks into curriculum blocks
 */
export function transformBlocks(notionBlocks: NotionBlock[]): TransformedBlock[] {
  const transformed: TransformedBlock[] = [];
  let sortOrder = 0;

  for (const block of notionBlocks) {
    const result = transformBlock(block, sortOrder);
    if (result) {
      transformed.push(result);
      sortOrder++;
    }
  }

  // Consolidate adjacent checklist items into single CHECKLIST blocks
  return consolidateChecklists(transformed);
}

/**
 * Transform a single Notion block
 */
function transformBlock(block: NotionBlock, sortOrder: number): TransformedBlock | null {
  switch (block.type) {
    case 'callout':
      return transformCallout(block, sortOrder);
    case 'to_do':
      return transformTodo(block, sortOrder);
    case 'table':
      return transformTable(block, sortOrder);
    case 'paragraph':
      return transformParagraph(block, sortOrder);
    case 'heading_1':
      return transformHeading(block, sortOrder, BlockType.HEADING_1);
    case 'heading_2':
      return transformHeading(block, sortOrder, BlockType.HEADING_2);
    case 'heading_3':
      return transformHeading(block, sortOrder, BlockType.HEADING_3);
    case 'bulleted_list_item':
      return transformListItem(block, sortOrder, BlockType.BULLETED_LIST);
    case 'numbered_list_item':
      return transformListItem(block, sortOrder, BlockType.NUMBERED_LIST);
    case 'toggle':
      return transformToggle(block, sortOrder);
    case 'quote':
      return transformQuote(block, sortOrder);
    case 'code':
      return transformCode(block, sortOrder);
    case 'image':
      return transformImage(block, sortOrder);
    case 'video':
      return transformVideo(block, sortOrder);
    case 'divider':
      return {
        notionBlockId: block.id,
        blockType: BlockType.DIVIDER,
        content: {},
        isRequired: false,
        sortOrder
      };
    default:
      return null;
  }
}

/**
 * Transform callout - detect timers, key points, activities, discussions
 */
function transformCallout(block: NotionBlock, sortOrder: number): TransformedBlock {
  const callout = block.callout;
  if (!callout) {
    return {
      notionBlockId: block.id,
      blockType: BlockType.CALLOUT,
      content: { text: '', icon: null, color: 'default' },
      isRequired: false,
      sortOrder
    };
  }

  const text = extractPlainText(callout.rich_text);
  const icon = callout.icon?.emoji;
  const color = callout.color;

  // Detect SECTION_TIMER pattern (time in text or timer emoji)
  const timerMatch = text.match(TIMER_PATTERN);
  if (timerMatch || (icon && TIMER_EMOJIS.includes(icon))) {
    const minutes = timerMatch ? parseInt(timerMatch[1]) : 5;
    return {
      notionBlockId: block.id,
      blockType: BlockType.SECTION_TIMER,
      content: {
        title: text.replace(TIMER_PATTERN, '').trim() || 'Timed Section',
        durationMinutes: minutes,
        icon,
        color
      },
      durationMins: minutes,
      isRequired: true,
      sortOrder
    };
  }

  // Detect KEY_POINT
  if (icon && KEY_POINT_EMOJIS.includes(icon)) {
    return {
      notionBlockId: block.id,
      blockType: BlockType.KEY_POINT,
      content: { text, icon, color },
      isRequired: true,
      sortOrder
    };
  }

  // Detect ACTIVITY
  if (icon && ACTIVITY_EMOJIS.includes(icon)) {
    return {
      notionBlockId: block.id,
      blockType: BlockType.ACTIVITY,
      content: { instructions: text, icon, color },
      isRequired: true,
      sortOrder
    };
  }

  // Detect DISCUSSION_PROMPT
  if (icon && DISCUSSION_EMOJIS.includes(icon)) {
    return {
      notionBlockId: block.id,
      blockType: BlockType.DISCUSSION_PROMPT,
      content: { prompt: text, icon, color },
      isRequired: false,
      sortOrder
    };
  }

  // Default callout
  return {
    notionBlockId: block.id,
    blockType: BlockType.CALLOUT,
    content: { text, icon, color },
    isRequired: icon ? WARNING_EMOJIS.includes(icon) : false,
    sortOrder
  };
}

/**
 * Transform to-do items - will be consolidated into CHECKLIST blocks
 */
function transformTodo(block: NotionBlock, sortOrder: number): TransformedBlock {
  const todo = block.to_do;
  return {
    notionBlockId: block.id,
    blockType: BlockType.CHECKLIST,
    content: {
      items: [{
        text: extractPlainText(todo?.rich_text),
        checked: todo?.checked ?? false
      }]
    },
    isRequired: true,
    sortOrder
  };
}

/**
 * Transform table - detect materials vs assessment grids
 */
function transformTable(block: NotionBlock, sortOrder: number): TransformedBlock {
  // Tables in Notion have their rows as children
  const children = block.children || [];
  if (children.length === 0) {
    return {
      notionBlockId: block.id,
      blockType: BlockType.TABLE,
      content: { headers: [], rows: [] },
      isRequired: false,
      sortOrder
    };
  }

  // Extract headers from first row
  const headerRow = children[0];
  const headers = headerRow?.table_row?.cells?.map(cell =>
    extractPlainText(cell).toLowerCase()
  ) || [];

  // Extract data rows
  const rows = children.slice(1).map(row =>
    row.table_row?.cells?.map(cell => extractPlainText(cell)) || []
  );

  // Check if it's a materials table
  const isMaterials = headers.some(h =>
    MATERIALS_TABLE_HEADERS.some(m => h.includes(m))
  );

  if (isMaterials) {
    return {
      notionBlockId: block.id,
      blockType: BlockType.MATERIALS_TABLE,
      content: {
        headers,
        items: rows.map(row => ({
          name: row[0] || '',
          quantity: row[1] || '',
          notes: row[2] || ''
        }))
      },
      isRequired: true,
      sortOrder
    };
  }

  // Check if it's an assessment grid
  const isAssessment = headers.some(h =>
    ASSESSMENT_TABLE_HEADERS.some(a => h.includes(a))
  );

  if (isAssessment) {
    return {
      notionBlockId: block.id,
      blockType: BlockType.ASSESSMENT_GRID,
      content: {
        headers,
        criteria: rows.map(row => ({
          code: row[0] || '',
          description: row[1] || '',
          evidenceGuidance: row[2] || ''
        }))
      },
      isRequired: true,
      sortOrder
    };
  }

  // Default table
  return {
    notionBlockId: block.id,
    blockType: BlockType.TABLE,
    content: {
      headers,
      rows,
      hasHeader: block.table?.has_column_header ?? true
    },
    isRequired: false,
    sortOrder
  };
}

/**
 * Transform paragraph
 */
function transformParagraph(block: NotionBlock, sortOrder: number): TransformedBlock | null {
  const text = extractPlainText(block.paragraph?.rich_text);

  // Skip empty paragraphs
  if (!text.trim()) return null;

  return {
    notionBlockId: block.id,
    blockType: BlockType.PARAGRAPH,
    content: {
      text,
      richText: block.paragraph?.rich_text || []
    },
    isRequired: false,
    sortOrder
  };
}

/**
 * Transform heading
 */
function transformHeading(block: NotionBlock, sortOrder: number, blockType: BlockType): TransformedBlock {
  const headingKey = block.type as 'heading_1' | 'heading_2' | 'heading_3';
  const heading = block[headingKey];

  return {
    notionBlockId: block.id,
    blockType,
    content: {
      text: extractPlainText(heading?.rich_text),
      color: heading?.color
    },
    isRequired: false,
    sortOrder
  };
}

/**
 * Transform list item
 */
function transformListItem(block: NotionBlock, sortOrder: number, blockType: BlockType): TransformedBlock {
  const itemKey = block.type === 'bulleted_list_item' ? 'bulleted_list_item' : 'numbered_list_item';
  const item = block[itemKey];

  return {
    notionBlockId: block.id,
    blockType,
    content: {
      text: extractPlainText(item?.rich_text),
      children: block.children?.map((child, idx) => transformBlock(child, idx)).filter(Boolean) || []
    },
    isRequired: false,
    sortOrder
  };
}

/**
 * Transform toggle
 */
function transformToggle(block: NotionBlock, sortOrder: number): TransformedBlock {
  return {
    notionBlockId: block.id,
    blockType: BlockType.TOGGLE,
    content: {
      title: extractPlainText(block.toggle?.rich_text),
      children: block.children?.map((child, idx) => transformBlock(child, idx)).filter(Boolean) || []
    },
    isRequired: false,
    sortOrder
  };
}

/**
 * Transform quote
 */
function transformQuote(block: NotionBlock, sortOrder: number): TransformedBlock {
  return {
    notionBlockId: block.id,
    blockType: BlockType.QUOTE,
    content: {
      text: extractPlainText(block.quote?.rich_text),
      color: block.quote?.color
    },
    isRequired: false,
    sortOrder
  };
}

/**
 * Transform code block
 */
function transformCode(block: NotionBlock, sortOrder: number): TransformedBlock {
  return {
    notionBlockId: block.id,
    blockType: BlockType.CODE,
    content: {
      code: extractPlainText(block.code?.rich_text),
      language: block.code?.language || 'plain'
    },
    isRequired: false,
    sortOrder
  };
}

/**
 * Transform image
 */
function transformImage(block: NotionBlock, sortOrder: number): TransformedBlock {
  const image = block.image;
  const url = image?.type === 'external'
    ? image.external?.url
    : image?.file?.url;

  return {
    notionBlockId: block.id,
    blockType: BlockType.IMAGE,
    content: {
      url: url || '',
      caption: extractPlainText(image?.caption),
      type: image?.type
    },
    isRequired: false,
    sortOrder
  };
}

/**
 * Transform video
 */
function transformVideo(block: NotionBlock, sortOrder: number): TransformedBlock {
  const video = block.video;
  const url = video?.type === 'external'
    ? video.external?.url
    : video?.file?.url;

  return {
    notionBlockId: block.id,
    blockType: BlockType.VIDEO,
    content: {
      url: url || '',
      caption: extractPlainText(video?.caption),
      type: video?.type
    },
    isRequired: false,
    sortOrder
  };
}

/**
 * Consolidate adjacent CHECKLIST blocks into single blocks with multiple items
 */
function consolidateChecklists(blocks: TransformedBlock[]): TransformedBlock[] {
  const consolidated: TransformedBlock[] = [];
  let currentChecklist: TransformedBlock | null = null;

  for (const block of blocks) {
    if (block.blockType === BlockType.CHECKLIST) {
      if (currentChecklist) {
        // Append items to existing checklist
        const existingItems = currentChecklist.content.items as Array<{ text: string; checked: boolean }>;
        const newItems = block.content.items as Array<{ text: string; checked: boolean }>;
        currentChecklist.content.items = [...existingItems, ...newItems];
      } else {
        // Start new checklist
        currentChecklist = {
          ...block,
          content: { items: [...(block.content.items as Array<{ text: string; checked: boolean }>)] }
        };
      }
    } else {
      // Non-checklist block - flush current checklist
      if (currentChecklist) {
        consolidated.push(currentChecklist);
        currentChecklist = null;
      }
      consolidated.push(block);
    }
  }

  // Don't forget trailing checklist
  if (currentChecklist) {
    consolidated.push(currentChecklist);
  }

  // Renumber sort orders
  return consolidated.map((block, index) => ({
    ...block,
    sortOrder: index
  }));
}

/**
 * Calculate total duration from blocks
 */
export function calculateTotalDuration(blocks: TransformedBlock[]): number {
  return blocks.reduce((total, block) => {
    return total + (block.durationMins || 0);
  }, 0);
}

/**
 * Extract OCN criteria codes from blocks
 */
export function extractOcnCriteria(blocks: TransformedBlock[]): string[] {
  const criteria: string[] = [];

  for (const block of blocks) {
    if (block.blockType === BlockType.ASSESSMENT_GRID) {
      const gridCriteria = block.content.criteria as Array<{ code: string }>;
      criteria.push(...gridCriteria.map(c => c.code).filter(Boolean));
    }
  }

  return [...new Set(criteria)]; // Deduplicate
}
