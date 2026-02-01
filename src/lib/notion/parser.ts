/**
 * Notion Block Parser
 *
 * Parses raw Notion blocks into structured ContentSection types
 * for Prep Mode and Teaching Mode views.
 */

import type { NotionBlock, RichText } from '@/lib/types';
import type {
  ContentSection,
  TimelineSection,
  ChecklistSection,
  SafetySection,
  TeachingStepSection,
  CheckpointSection,
  OutcomesSection,
  VocabularySection,
  ResourceSection,
  ProseSection,
  HeadingSection,
} from '@/lib/types/content';
import {
  extractText,
  generateSectionId,
  isSafetyContent,
  isChecklistHeading,
  isOutcomesHeading,
  isCheckpointHeading,
  isTeachingStepsHeading,
  detectTableType,
  getSafetyLevelFromColor,
  getChecklistCategory,
  extractQuantity,
  extractStepNumber,
  extractDuration,
  isSectionHeading,
  parseDuration,
  parseActivityWithDuration,
  parseInstructorNote,
} from './parser-utils';

// =============================================================================
// Main Parser Function
// =============================================================================

/**
 * Parse an array of Notion blocks into structured content sections
 *
 * @param blocks - Array of raw Notion blocks
 * @returns Array of parsed ContentSection objects
 */
export function parseNotionBlocks(blocks: NotionBlock[]): ContentSection[] {
  const sections: ContentSection[] = [];
  let i = 0;
  let proseBuffer: string[] = [];
  let stepCounter = 0;

  // Helper to flush accumulated prose content
  const flushProse = () => {
    if (proseBuffer.length > 0) {
      sections.push({
        id: generateSectionId(),
        type: 'prose',
        content: proseBuffer.join('\n\n'),
      } as ProseSection);
      proseBuffer = [];
    }
  };

  while (i < blocks.length) {
    const block = blocks[i];
    const blockType = block.type;

    // -------------------------------------------------------------------------
    // Priority 1: Callout blocks (safety detection)
    // -------------------------------------------------------------------------
    if (blockType === 'callout' && block.callout) {
      const callout = block.callout;
      const text = extractText(callout.rich_text);
      const color = callout.color || '';

      // Check if this is a safety callout (red/yellow/orange background)
      const isSafetyColor =
        color.includes('red') || color.includes('yellow') || color.includes('orange');

      // Also check content for safety keywords
      const hasSafetyContent = isSafetyContent(text);

      if (isSafetyColor || hasSafetyContent) {
        flushProse();
        const level = getSafetyLevelFromColor(color);

        // Extract title if present (format: "Title: content" or emoji followed by bold text)
        let title: string | undefined;
        let content = text;

        const colonIndex = text.indexOf(':');
        if (colonIndex > 0 && colonIndex < 50) {
          title = text.substring(0, colonIndex).trim();
          content = text.substring(colonIndex + 1).trim();
        }

        sections.push({
          id: block.id || generateSectionId(),
          type: 'safety',
          level,
          title,
          content,
        } as SafetySection);

        i++;
        continue;
      }

      // Non-safety callout: treat as prose
      proseBuffer.push(text);
      i++;
      continue;
    }

    // -------------------------------------------------------------------------
    // Priority 2: Table blocks
    // -------------------------------------------------------------------------
    if (blockType === 'table' && block.table) {
      flushProse();

      const tableSection = parseTable(block);
      if (tableSection) {
        sections.push(tableSection);
      }

      i++;
      continue;
    }

    // -------------------------------------------------------------------------
    // Priority 3: SECTION pattern detection (Teaching Steps)
    // -------------------------------------------------------------------------
    if (
      blockType === 'heading_1' ||
      blockType === 'heading_2' ||
      blockType === 'heading_3'
    ) {
      const headingContent = block[blockType as keyof NotionBlock] as { rich_text: RichText[] } | undefined;
      const headingText = extractText(headingContent?.rich_text);

      // Check for SECTION pattern (e.g., "SECTION 1: Introduction")
      const sectionMatch = isSectionHeading(headingText);
      if (sectionMatch) {
        flushProse();

        // Parse the section content - collect everything until next SECTION or heading_1
        const sectionContent = collectSectionContent(blocks, i + 1);

        sections.push({
          id: block.id || generateSectionId(),
          type: 'teaching-step',
          stepNumber: sectionMatch.sectionNumber,
          title: sectionMatch.title,
          instruction: sectionContent.instruction || sectionMatch.title,
          duration: sectionContent.duration,
          activities: sectionContent.activities.length > 0 ? sectionContent.activities : undefined,
          teachingApproach: sectionContent.teachingApproach,
          differentiation: sectionContent.differentiation,
          tips: sectionContent.tips.length > 0 ? sectionContent.tips : undefined,
          paragraphs: sectionContent.paragraphs.length > 0 ? sectionContent.paragraphs : undefined,
          resources: sectionContent.resources.length > 0 ? sectionContent.resources : undefined,
          tables: sectionContent.tables.length > 0 ? sectionContent.tables : undefined,
          quotes: sectionContent.quotes.length > 0 ? sectionContent.quotes : undefined,
        } as TeachingStepSection);

        // Skip to the end of the section content
        i = sectionContent.endIndex;
        continue;
      }

      // -------------------------------------------------------------------------
      // Priority 3b: Heading + following list combinations
      // -------------------------------------------------------------------------

      // Look ahead for following list items
      const followingListItems = collectFollowingListItems(blocks, i + 1);

      // Check if heading + list matches a special pattern
      if (followingListItems.length > 0) {
        // Checklist pattern
        if (isChecklistHeading(headingText)) {
          flushProse();
          const items = followingListItems.map((item) => extractQuantity(item));

          sections.push({
            id: block.id || generateSectionId(),
            type: 'checklist',
            category: getChecklistCategory(headingText),
            title: headingText,
            items,
          } as ChecklistSection);

          i = skipListItems(blocks, i + 1) + 1;
          continue;
        }

        // Outcomes pattern
        if (isOutcomesHeading(headingText)) {
          flushProse();

          sections.push({
            id: block.id || generateSectionId(),
            type: 'outcomes',
            title: headingText,
            items: followingListItems,
          } as OutcomesSection);

          i = skipListItems(blocks, i + 1) + 1;
          continue;
        }

        // Checkpoint pattern
        if (isCheckpointHeading(headingText)) {
          flushProse();

          const items = followingListItems.map((item) => ({
            criterion: item,
          }));

          sections.push({
            id: block.id || generateSectionId(),
            type: 'checkpoint',
            title: headingText,
            items,
          } as CheckpointSection);

          i = skipListItems(blocks, i + 1) + 1;
          continue;
        }
      }

      // Regular heading (no special pattern matched)
      flushProse();

      const level = blockType === 'heading_1' ? 1 : blockType === 'heading_2' ? 2 : 3;

      sections.push({
        id: block.id || generateSectionId(),
        type: 'heading',
        level,
        text: headingText,
      } as HeadingSection);

      // Reset step counter on new major section
      if (level <= 2) {
        stepCounter = 0;
      }

      i++;
      continue;
    }

    // -------------------------------------------------------------------------
    // Priority 4: Numbered list items
    // Only create teaching steps for explicit "Step X:" patterns
    // Group other numbered lists as prose
    // -------------------------------------------------------------------------
    if (blockType === 'numbered_list_item' && block.numbered_list_item) {
      const text = extractText(block.numbered_list_item.rich_text);

      // Check for explicit step/section pattern (e.g., "Step 1:", "SECTION 2:")
      const isExplicitStep = /^(?:step|section)\s+\d+[:.]/i.test(text);

      if (isExplicitStep) {
        flushProse();
        stepCounter++;

        // Check for explicit step number in text
        const explicitStep = extractStepNumber(text);
        const stepNumber = explicitStep || stepCounter;

        // Extract duration if present
        const duration = extractDuration(text);

        // Clean instruction text (remove step prefix if present)
        let instruction = text;
        const stepMatch = text.match(/^(?:step\s+\d+[:.]\s*|\d+\.\s*)/i);
        if (stepMatch) {
          instruction = text.substring(stepMatch[0].length);
        }

        // Check for tips (children with bullet points)
        const tips: string[] = [];
        const warnings: string[] = [];

        if (block.children && block.children.length > 0) {
          for (const child of block.children) {
            if (child.type === 'bulleted_list_item' && child.bulleted_list_item) {
              const childText = extractText(child.bulleted_list_item.rich_text);
              if (isSafetyContent(childText)) {
                warnings.push(childText);
              } else {
                tips.push(childText);
              }
            }
          }
        }

        sections.push({
          id: block.id || generateSectionId(),
          type: 'teaching-step',
          stepNumber,
          instruction,
          duration,
          tips: tips.length > 0 ? tips : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        } as TeachingStepSection);

        i++;
        continue;
      }

      // Non-step numbered lists: collect consecutive items as prose
      const numberedItems: string[] = [];
      let j = i;
      let itemNum = 1;

      while (j < blocks.length) {
        const currentBlock = blocks[j];
        if (currentBlock.type === 'numbered_list_item' && currentBlock.numbered_list_item) {
          const itemText = extractText(currentBlock.numbered_list_item.rich_text);
          // Stop if we hit an explicit step pattern
          if (/^(?:step|section)\s+\d+[:.]/i.test(itemText)) {
            break;
          }
          numberedItems.push(`${itemNum}. ${itemText}`);

          // Include nested content if present
          if (currentBlock.children && currentBlock.children.length > 0) {
            for (const child of currentBlock.children) {
              if (child.type === 'bulleted_list_item' && child.bulleted_list_item) {
                numberedItems.push(`   • ${extractText(child.bulleted_list_item.rich_text)}`);
              } else if (child.type === 'paragraph' && child.paragraph) {
                numberedItems.push(`   ${extractText(child.paragraph.rich_text)}`);
              }
            }
          }
          itemNum++;
          j++;
        } else {
          break;
        }
      }

      if (numberedItems.length > 0) {
        proseBuffer.push(numberedItems.join('\n'));
        i = j;
        continue;
      }

      i++;
      continue;
    }

    // -------------------------------------------------------------------------
    // Priority 5: Media/Resource blocks
    // -------------------------------------------------------------------------
    if (blockType === 'image' && block.image) {
      flushProse();

      const url = getMediaUrl(block.image);
      const caption = extractText(block.image.caption);

      sections.push({
        id: block.id || generateSectionId(),
        type: 'resource',
        resourceType: 'image',
        url,
        caption: caption || undefined,
      } as ResourceSection);

      i++;
      continue;
    }

    if (blockType === 'video' && block.video) {
      flushProse();

      const url = getMediaUrl(block.video);
      const caption = extractText(block.video.caption);

      sections.push({
        id: block.id || generateSectionId(),
        type: 'resource',
        resourceType: 'video',
        url,
        caption: caption || undefined,
      } as ResourceSection);

      i++;
      continue;
    }

    if (blockType === 'pdf' && block.pdf) {
      flushProse();

      const url = getFileUrl(block.pdf);
      const caption = extractText(block.pdf.caption);

      sections.push({
        id: block.id || generateSectionId(),
        type: 'resource',
        resourceType: 'pdf',
        url,
        title: block.pdf.name,
        caption: caption || undefined,
      } as ResourceSection);

      i++;
      continue;
    }

    if (blockType === 'file' && block.file) {
      flushProse();

      const url = getFileUrl(block.file);
      const caption = extractText(block.file.caption);

      sections.push({
        id: block.id || generateSectionId(),
        type: 'resource',
        resourceType: 'file',
        url,
        title: block.file.name,
        caption: caption || undefined,
      } as ResourceSection);

      i++;
      continue;
    }

    if (blockType === 'embed' && block.embed) {
      flushProse();

      const url = block.embed.url;
      const caption = extractText(block.embed.caption);

      // Determine resource type from URL
      let resourceType: 'video' | 'pdf' | 'file' = 'file';
      if (url.includes('youtube') || url.includes('vimeo') || url.includes('loom')) {
        resourceType = 'video';
      } else if (url.endsWith('.pdf')) {
        resourceType = 'pdf';
      }

      sections.push({
        id: block.id || generateSectionId(),
        type: 'resource',
        resourceType,
        url,
        caption: caption || undefined,
      } as ResourceSection);

      i++;
      continue;
    }

    // -------------------------------------------------------------------------
    // Priority 6: Paragraph and other text blocks (prose)
    // -------------------------------------------------------------------------
    if (blockType === 'paragraph' && block.paragraph) {
      const text = extractText(block.paragraph.rich_text);
      if (text.trim()) {
        proseBuffer.push(text);
      }
      i++;
      continue;
    }

    if (blockType === 'quote' && block.quote) {
      const text = extractText(block.quote.rich_text);
      if (text.trim()) {
        proseBuffer.push(`> ${text}`);
      }
      i++;
      continue;
    }

    if (blockType === 'bulleted_list_item' && block.bulleted_list_item) {
      const text = extractText(block.bulleted_list_item.rich_text);
      if (text.trim()) {
        proseBuffer.push(`• ${text}`);
      }
      i++;
      continue;
    }

    if (blockType === 'to_do' && block.to_do) {
      const text = extractText(block.to_do.rich_text);
      const checked = block.to_do.checked ? '☑' : '☐';
      if (text.trim()) {
        proseBuffer.push(`${checked} ${text}`);
      }
      i++;
      continue;
    }

    if (blockType === 'code' && block.code) {
      const text = extractText(block.code.rich_text);
      const language = block.code.language || '';
      if (text.trim()) {
        proseBuffer.push(`\`\`\`${language}\n${text}\n\`\`\``);
      }
      i++;
      continue;
    }

    if (blockType === 'divider') {
      // Flush prose before divider
      flushProse();
      i++;
      continue;
    }

    // -------------------------------------------------------------------------
    // Priority 7: Toggle blocks (collapsible sections)
    // -------------------------------------------------------------------------
    if (blockType === 'toggle' && block.toggle) {
      flushProse();
      const title = extractText(block.toggle.rich_text);

      // Add toggle title as heading
      sections.push({
        id: block.id || generateSectionId(),
        type: 'heading',
        level: 3,
        text: title,
      } as HeadingSection);

      // Recursively parse children if they exist
      if (block.children && block.children.length > 0) {
        const childSections = parseNotionBlocks(block.children);
        sections.push(...childSections);
      }

      i++;
      continue;
    }

    // -------------------------------------------------------------------------
    // Fallback: Extract text from any unrecognized block types
    // -------------------------------------------------------------------------
    const fallbackText = extractAnyText(block);
    if (fallbackText) {
      proseBuffer.push(fallbackText);
    }
    i++;
  }

  // Flush any remaining prose
  flushProse();

  // Reorder sections for optimal instructor delivery
  return reorderSectionsForTeaching(sections);
}

// =============================================================================
// Section Reordering for Instructor Delivery
// =============================================================================

/**
 * Reorder sections for optimal instructor delivery flow.
 *
 * Research-backed order (Nearpod, Pear Deck, Google Classroom patterns):
 * 1. Safety (always first - instructors need this before anything else)
 * 2. Learning Objectives/Overview (set expectations)
 * 3. Timeline/Pacing (instructors need timing before gathering materials)
 * 4. Materials Checklist (gather what's needed)
 * 5. Vocabulary (introduce key terms before teaching)
 * 6. Teaching Steps (main content, in original order)
 * 7. Assessment/Checkpoints (evaluation during/after)
 * 8. Resources (supplementary materials)
 * 9. Other content (reflection, etc.)
 */
function reorderSectionsForTeaching(sections: ContentSection[]): ContentSection[] {
  // Priority buckets
  const safety: ContentSection[] = [];
  const overview: ContentSection[] = [];
  const timeline: ContentSection[] = [];
  const materials: ContentSection[] = [];
  const vocabulary: ContentSection[] = [];
  const teachingSteps: ContentSection[] = [];
  const assessment: ContentSection[] = [];
  const resources: ContentSection[] = [];
  const other: ContentSection[] = [];

  // Helper to check heading text
  const getHeadingText = (section: ContentSection): string => {
    if (section.type === 'heading') {
      return (section as HeadingSection).text.toLowerCase();
    }
    return '';
  };

  // Track if we're in a specific section group (content after a heading belongs to that group)
  let currentGroup: 'overview' | 'timeline' | 'materials' | 'vocabulary' | 'teaching' | 'assessment' | 'resources' | 'other' | null = null;

  for (const section of sections) {
    // Safety sections always go first
    if (section.type === 'safety') {
      safety.push(section);
      continue;
    }

    // Check for section-defining headings
    if (section.type === 'heading') {
      const headingText = getHeadingText(section);

      if (headingText.includes('objective') || headingText.includes('overview') ||
          headingText.includes('goal') || headingText.includes('learning outcome')) {
        currentGroup = 'overview';
        overview.push(section);
        continue;
      }

      if (headingText.includes('timeline') || headingText.includes('pacing') ||
          headingText.includes('schedule') || headingText.includes('timing')) {
        currentGroup = 'timeline';
        timeline.push(section);
        continue;
      }

      if (headingText.includes('material') || headingText.includes('supplies') ||
          headingText.includes('equipment') || headingText.includes('what you') ||
          headingText.includes('checklist')) {
        currentGroup = 'materials';
        materials.push(section);
        continue;
      }

      if (headingText.includes('vocabulary') || headingText.includes('key term') ||
          headingText.includes('glossary') || headingText.includes('definition')) {
        currentGroup = 'vocabulary';
        vocabulary.push(section);
        continue;
      }

      if (headingText.includes('section') || headingText.includes('step') ||
          headingText.includes('activity') || headingText.includes('instruction') ||
          headingText.includes('teaching')) {
        currentGroup = 'teaching';
        teachingSteps.push(section);
        continue;
      }

      if (headingText.includes('assessment') || headingText.includes('checkpoint') ||
          headingText.includes('check for understanding') || headingText.includes('evaluation')) {
        currentGroup = 'assessment';
        assessment.push(section);
        continue;
      }

      if (headingText.includes('resource') || headingText.includes('reference') ||
          headingText.includes('additional') || headingText.includes('reflection')) {
        currentGroup = 'resources';
        resources.push(section);
        continue;
      }

      // Generic heading - goes to 'other' unless in a group
      if (currentGroup) {
        // Non-section-defining headings follow current group
        switch (currentGroup) {
          case 'overview': overview.push(section); break;
          case 'timeline': timeline.push(section); break;
          case 'materials': materials.push(section); break;
          case 'vocabulary': vocabulary.push(section); break;
          case 'teaching': teachingSteps.push(section); break;
          case 'assessment': assessment.push(section); break;
          case 'resources': resources.push(section); break;
          default: other.push(section);
        }
      } else {
        other.push(section);
      }
      continue;
    }

    // Specific section types go to their buckets regardless of heading context
    if (section.type === 'timeline') {
      timeline.push(section);
      continue;
    }

    if (section.type === 'checklist') {
      materials.push(section);
      continue;
    }

    if (section.type === 'vocabulary') {
      vocabulary.push(section);
      continue;
    }

    if (section.type === 'teaching-step') {
      teachingSteps.push(section);
      continue;
    }

    if (section.type === 'outcomes') {
      overview.push(section);
      continue;
    }

    if (section.type === 'checkpoint') {
      assessment.push(section);
      continue;
    }

    if (section.type === 'resource') {
      resources.push(section);
      continue;
    }

    // Prose and other content follow current group, or go to 'other'
    if (currentGroup) {
      switch (currentGroup) {
        case 'overview': overview.push(section); break;
        case 'timeline': timeline.push(section); break;
        case 'materials': materials.push(section); break;
        case 'vocabulary': vocabulary.push(section); break;
        case 'teaching': teachingSteps.push(section); break;
        case 'assessment': assessment.push(section); break;
        case 'resources': resources.push(section); break;
        default: other.push(section);
      }
    } else {
      other.push(section);
    }
  }

  // Assemble in optimal instructor order
  return [
    ...safety,
    ...overview,
    ...timeline,
    ...materials,
    ...vocabulary,
    ...teachingSteps,
    ...assessment,
    ...resources,
    ...other,
  ];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get URL from media content (image, video, audio)
 */
function getMediaUrl(media: { type: 'external' | 'file'; external?: { url: string }; file?: { url: string } }): string {
  if (media.type === 'external' && media.external) {
    return media.external.url;
  }
  if (media.type === 'file' && media.file) {
    return media.file.url;
  }
  return '';
}

/**
 * Get URL from file content
 */
function getFileUrl(file: { type: 'external' | 'file'; external?: { url: string }; file?: { url: string } }): string {
  if (file.type === 'external' && file.external) {
    return file.external.url;
  }
  if (file.type === 'file' && file.file) {
    return file.file.url;
  }
  return '';
}

/**
 * Extract text from any block type (fallback for unrecognized blocks)
 * Tries common patterns: rich_text, text, caption
 */
function extractAnyText(block: NotionBlock): string | null {
  const blockType = block.type;
  const blockContent = block[blockType as keyof NotionBlock];

  if (blockContent && typeof blockContent === 'object') {
    // Try rich_text (most common)
    if ('rich_text' in blockContent && Array.isArray(blockContent.rich_text)) {
      const text = extractText(blockContent.rich_text as RichText[]);
      if (text.trim()) return text;
    }
    // Try caption (for media blocks)
    if ('caption' in blockContent && Array.isArray(blockContent.caption)) {
      const text = extractText(blockContent.caption as RichText[]);
      if (text.trim()) return text;
    }
  }

  return null;
}

/**
 * Collect following bulleted list items (not numbered - those become teaching steps)
 */
function collectFollowingListItems(blocks: NotionBlock[], startIndex: number): string[] {
  const items: string[] = [];

  for (let i = startIndex; i < blocks.length; i++) {
    const block = blocks[i];

    // Only collect bulleted items and to_do for checklists/outcomes/checkpoints
    // Numbered items should be parsed as teaching steps
    if (block.type === 'bulleted_list_item' && block.bulleted_list_item) {
      items.push(extractText(block.bulleted_list_item.rich_text));
    } else if (block.type === 'to_do' && block.to_do) {
      items.push(extractText(block.to_do.rich_text));
    } else {
      // Stop at non-bulleted-list block (including numbered_list_item)
      break;
    }
  }

  return items;
}

/**
 * Skip over bulleted list items and return the last index
 * (Does not skip numbered items - those become teaching steps)
 */
function skipListItems(blocks: NotionBlock[], startIndex: number): number {
  let i = startIndex;

  while (i < blocks.length) {
    const block = blocks[i];
    // Only skip bulleted items and to_do
    const isBulletedItem =
      block.type === 'bulleted_list_item' ||
      block.type === 'to_do';

    if (!isBulletedItem) {
      return i - 1;
    }
    i++;
  }

  return i - 1;
}

/**
 * Parse a table block into a content section
 */
function parseTable(block: NotionBlock): TimelineSection | VocabularySection | ChecklistSection | null {
  if (!block.table || !block.children || block.children.length === 0) {
    return null;
  }

  const rows = block.children.filter((child) => child.type === 'table_row');
  if (rows.length === 0) {
    return null;
  }

  // Extract headers from first row
  const firstRow = rows[0];
  if (!firstRow.table_row || !firstRow.table_row.cells) {
    return null;
  }

  const headers = firstRow.table_row.cells.map((cell) =>
    cell.map((rt) => rt.plain_text).join('')
  );

  const tableType = detectTableType(headers);

  // Parse data rows (skip header row)
  const dataRows = rows.slice(1);

  if (tableType === 'timeline') {
    return parseTimelineTable(block.id, headers, dataRows);
  }

  if (tableType === 'vocabulary') {
    return parseVocabularyTable(block.id, headers, dataRows);
  }

  if (tableType === 'checklist') {
    return parseChecklistTable(block.id, headers, dataRows);
  }

  return null;
}

/**
 * Parse a timeline table
 */
function parseTimelineTable(
  blockId: string,
  headers: string[],
  dataRows: NotionBlock[]
): TimelineSection {
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  // Find column indices
  const timeIndex = lowerHeaders.findIndex(
    (h) => h.includes('time') || h.includes('when') || h.includes('schedule')
  );
  const activityIndex = lowerHeaders.findIndex(
    (h) => h.includes('activity') || h.includes('task') || h.includes('what') || h.includes('topic') || h.includes('section') || h.includes('content') || h.includes('phase') || h.includes('step')
  );
  const durationIndex = lowerHeaders.findIndex(
    (h) => h.includes('duration') || h.includes('length') || h.includes('mins')
  );
  const notesIndex = lowerHeaders.findIndex(
    (h) => h.includes('notes') || h.includes('comment')
  );

  const rows = dataRows.map((row) => {
    const cells = row.table_row?.cells || [];
    const getCellText = (index: number) =>
      index >= 0 && cells[index] ? cells[index].map((rt) => rt.plain_text).join('') : '';

    return {
      time: getCellText(timeIndex),
      activity: getCellText(activityIndex),
      duration: getCellText(durationIndex),
      notes: getCellText(notesIndex) || undefined,
    };
  });

  return {
    id: blockId || generateSectionId(),
    type: 'timeline',
    rows,
  };
}

/**
 * Parse a vocabulary table
 */
function parseVocabularyTable(
  blockId: string,
  headers: string[],
  dataRows: NotionBlock[]
): VocabularySection {
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  // Find column indices
  const termIndex = lowerHeaders.findIndex(
    (h) => h.includes('term') || h.includes('word') || h.includes('concept') || h.includes('name')
  );
  const definitionIndex = lowerHeaders.findIndex(
    (h) => h.includes('definition') || h.includes('meaning') || h.includes('description')
  );

  const terms = dataRows.map((row) => {
    const cells = row.table_row?.cells || [];
    const getCellText = (index: number) =>
      index >= 0 && cells[index] ? cells[index].map((rt) => rt.plain_text).join('') : '';

    return {
      term: getCellText(termIndex),
      definition: getCellText(definitionIndex),
    };
  });

  return {
    id: blockId || generateSectionId(),
    type: 'vocabulary',
    terms,
  };
}

/**
 * Parse a checklist table
 */
function parseChecklistTable(
  blockId: string,
  headers: string[],
  dataRows: NotionBlock[]
): ChecklistSection {
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  // Find column indices
  const itemIndex = lowerHeaders.findIndex(
    (h) => h.includes('item') || h.includes('material') || h.includes('tool')
  );
  const quantityIndex = lowerHeaders.findIndex(
    (h) => h.includes('quantity') || h.includes('amount') || h.includes('qty')
  );

  const items = dataRows.map((row) => {
    const cells = row.table_row?.cells || [];
    const getCellText = (index: number) =>
      index >= 0 && cells[index] ? cells[index].map((rt) => rt.plain_text).join('') : '';

    return {
      text: getCellText(itemIndex),
      quantity: getCellText(quantityIndex) || undefined,
    };
  });

  return {
    id: blockId || generateSectionId(),
    type: 'checklist',
    category: 'materials',
    title: 'Materials',
    items,
  };
}

/**
 * Collect content for a SECTION block
 *
 * Parses everything after a SECTION heading until:
 * - Next SECTION heading
 * - Next heading_1
 * - End of blocks
 *
 * Extracts:
 * - Duration from paragraphs (e.g., "15 minutes")
 * - Activities from bulleted list items
 * - Teaching Approach notes
 * - Differentiation notes
 * - Resources (images, videos, files)
 * - Tables
 * - Quotes
 * - All paragraphs
 */
function collectSectionContent(
  blocks: NotionBlock[],
  startIndex: number
): {
  instruction: string;
  duration: string | undefined;
  activities: Array<{ text: string; duration?: string }>;
  teachingApproach: string | undefined;
  differentiation: string | undefined;
  tips: string[];
  paragraphs: string[];
  resources: Array<{ type: 'image' | 'video' | 'file' | 'embed'; url: string; title?: string; caption?: string }>;
  tables: Array<{ headers: string[]; rows: string[][] }>;
  quotes: string[];
  endIndex: number;
} {
  const activities: Array<{ text: string; duration?: string }> = [];
  const tips: string[] = [];
  const paragraphs: string[] = [];
  const resources: Array<{ type: 'image' | 'video' | 'file' | 'embed'; url: string; title?: string; caption?: string }> = [];
  const tables: Array<{ headers: string[]; rows: string[][] }> = [];
  const quotes: string[] = [];
  let duration: string | undefined;
  let teachingApproach: string | undefined;
  let differentiation: string | undefined;
  let instruction = '';
  let i = startIndex;

  while (i < blocks.length) {
    const block = blocks[i];
    const blockType = block.type;

    // Stop at next SECTION heading or heading_1
    if (blockType === 'heading_1' || blockType === 'heading_2' || blockType === 'heading_3') {
      const headingContent = block[blockType as keyof NotionBlock] as { rich_text: RichText[] } | undefined;
      const headingText = extractText(headingContent?.rich_text);

      // Check if this is another SECTION heading
      if (isSectionHeading(headingText)) {
        break;
      }

      // For heading_1, always stop (major section boundary)
      if (blockType === 'heading_1') {
        break;
      }
    }

    // Parse paragraph for duration or instructor notes
    if (blockType === 'paragraph' && block.paragraph) {
      const text = extractText(block.paragraph.rich_text);

      // Check for instructor notes
      const instructorNote = parseInstructorNote(text);
      if (instructorNote.type === 'teaching-approach') {
        teachingApproach = instructorNote.content;
        i++;
        continue;
      }
      if (instructorNote.type === 'differentiation') {
        differentiation = instructorNote.content;
        i++;
        continue;
      }

      // Check for standalone duration
      const durationMatch = parseDuration(text);
      if (durationMatch && !duration) {
        // If the text is mostly just the duration, extract it
        const cleanText = text.replace(/[~≈]?\s*\d+\s*(?:mins?|minutes?)/gi, '').trim();
        if (cleanText.length < 20) {
          duration = durationMatch;
          i++;
          continue;
        }
      }

      // Capture all paragraphs (first one also becomes instruction)
      if (text.trim()) {
        paragraphs.push(text);
        if (!instruction) {
          instruction = text;
        }
      }
      i++;
      continue;
    }

    // Parse bulleted list items as activities (including nested children)
    if (blockType === 'bulleted_list_item' && block.bulleted_list_item) {
      const text = extractText(block.bulleted_list_item.rich_text);
      const parsed = parseActivityWithDuration(text);
      activities.push({
        text: parsed.activity,
        duration: parsed.duration || undefined,
      });
      // Recursively capture nested bullet children
      if (block.children && block.children.length > 0) {
        for (const child of block.children) {
          if (child.type === 'bulleted_list_item' && child.bulleted_list_item) {
            const childText = extractText(child.bulleted_list_item.rich_text);
            const childParsed = parseActivityWithDuration(childText);
            activities.push({
              text: childParsed.activity,
              duration: childParsed.duration || undefined,
            });
          }
        }
      }
      i++;
      continue;
    }

    // Parse numbered list items as activities too (including nested children)
    if (blockType === 'numbered_list_item' && block.numbered_list_item) {
      const text = extractText(block.numbered_list_item.rich_text);
      const parsed = parseActivityWithDuration(text);
      activities.push({
        text: parsed.activity,
        duration: parsed.duration || undefined,
      });
      // Recursively capture nested children
      if (block.children && block.children.length > 0) {
        for (const child of block.children) {
          if (child.type === 'bulleted_list_item' && child.bulleted_list_item) {
            const childText = extractText(child.bulleted_list_item.rich_text);
            const childParsed = parseActivityWithDuration(childText);
            activities.push({
              text: childParsed.activity,
              duration: childParsed.duration || undefined,
            });
          }
          if (child.type === 'numbered_list_item' && child.numbered_list_item) {
            const childText = extractText(child.numbered_list_item.rich_text);
            const childParsed = parseActivityWithDuration(childText);
            activities.push({
              text: childParsed.activity,
              duration: childParsed.duration || undefined,
            });
          }
        }
      }
      i++;
      continue;
    }

    // Parse to-do items as activities
    if (blockType === 'to_do' && block.to_do) {
      const text = extractText(block.to_do.rich_text);
      const parsed = parseActivityWithDuration(text);
      activities.push({
        text: parsed.activity,
        duration: parsed.duration || undefined,
      });
      i++;
      continue;
    }

    // Parse callouts for tips
    if (blockType === 'callout' && block.callout) {
      const text = extractText(block.callout.rich_text);
      tips.push(text);
      i++;
      continue;
    }

    // Parse quote blocks
    if (blockType === 'quote' && block.quote) {
      const text = extractText(block.quote.rich_text);
      if (text.trim()) {
        quotes.push(text);
      }
      i++;
      continue;
    }

    // Parse image resources
    if (blockType === 'image' && block.image) {
      resources.push({
        type: 'image',
        url: getMediaUrl(block.image),
        caption: extractText(block.image.caption) || undefined,
      });
      i++;
      continue;
    }

    // Parse video resources
    if (blockType === 'video' && block.video) {
      resources.push({
        type: 'video',
        url: getMediaUrl(block.video),
        caption: extractText(block.video.caption) || undefined,
      });
      i++;
      continue;
    }

    // Parse file resources
    if (blockType === 'file' && block.file) {
      resources.push({
        type: 'file',
        url: getFileUrl(block.file),
        title: block.file.name,
        caption: extractText(block.file.caption) || undefined,
      });
      i++;
      continue;
    }

    // Parse embed resources
    if (blockType === 'embed' && block.embed) {
      let embedType: 'video' | 'file' | 'embed' = 'embed';
      const url = block.embed.url;
      if (url.includes('youtube') || url.includes('vimeo') || url.includes('loom')) {
        embedType = 'video';
      }
      resources.push({
        type: embedType,
        url,
        caption: extractText(block.embed.caption) || undefined,
      });
      i++;
      continue;
    }

    // Parse tables
    if (blockType === 'table' && block.table && block.children) {
      const rows = block.children.filter((c) => c.type === 'table_row');
      if (rows.length > 0) {
        const headers = rows[0].table_row?.cells?.map((cell) =>
          cell.map((rt) => rt.plain_text).join('')
        ) || [];
        const dataRows = rows.slice(1).map((row) =>
          row.table_row?.cells?.map((cell) =>
            cell.map((rt) => rt.plain_text).join('')
          ) || []
        );
        tables.push({ headers, rows: dataRows });
      }
      i++;
      continue;
    }

    // Parse toggle blocks - recursively extract activities from children
    // Toggles often contain "What You'll Need", "What To Do" sections with bullet items
    if (blockType === 'toggle' && block.toggle) {
      const toggleTitle = extractText(block.toggle.rich_text);

      // Check for teaching guidance in toggle title
      const instructorNote = parseInstructorNote(toggleTitle);
      if (instructorNote.type === 'teaching-approach') {
        teachingApproach = instructorNote.content;
      }
      if (instructorNote.type === 'differentiation') {
        differentiation = instructorNote.content;
      }

      // Extract activities from toggle children
      if (block.children && block.children.length > 0) {
        for (const child of block.children) {
          if (child.type === 'bulleted_list_item' && child.bulleted_list_item) {
            const text = extractText(child.bulleted_list_item.rich_text);
            const parsed = parseActivityWithDuration(text);
            activities.push({
              text: parsed.activity,
              duration: parsed.duration || undefined,
            });
          }
          if (child.type === 'numbered_list_item' && child.numbered_list_item) {
            const text = extractText(child.numbered_list_item.rich_text);
            const parsed = parseActivityWithDuration(text);
            activities.push({
              text: parsed.activity,
              duration: parsed.duration || undefined,
            });
          }
          if (child.type === 'to_do' && child.to_do) {
            const text = extractText(child.to_do.rich_text);
            const parsed = parseActivityWithDuration(text);
            activities.push({
              text: parsed.activity,
              duration: parsed.duration || undefined,
            });
          }
          if (child.type === 'paragraph' && child.paragraph) {
            const text = extractText(child.paragraph.rich_text);
            // Check for instructor notes in toggle paragraphs
            const childNote = parseInstructorNote(text);
            if (childNote.type === 'teaching-approach') {
              teachingApproach = childNote.content;
            } else if (childNote.type === 'differentiation') {
              differentiation = childNote.content;
            } else if (text.trim()) {
              // If text looks like a bullet item, capture as activity
              // (Sometimes Notion stores bullet-like content as paragraphs with • prefix)
              if (text.startsWith('•') || text.startsWith('-') || text.startsWith('*')) {
                const cleanText = text.replace(/^[•\-*]\s*/, '');
                const parsed = parseActivityWithDuration(cleanText);
                activities.push({
                  text: parsed.activity,
                  duration: parsed.duration || undefined,
                });
              } else {
                paragraphs.push(text);
              }
            }
          }
        }
      }
      i++;
      continue;
    }

    // Skip other block types but continue parsing
    i++;
  }

  return {
    instruction,
    duration,
    activities,
    teachingApproach,
    differentiation,
    tips,
    paragraphs,
    resources,
    tables,
    quotes,
    endIndex: i,
  };
}
