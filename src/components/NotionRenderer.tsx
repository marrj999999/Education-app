'use client';

import React, { memo, useMemo, createContext, useContext } from 'react';
import type { NotionBlock, RichText } from '@/lib/types';
import CalloutBlock from './CalloutBlock';
import TableBlock from './TableBlock';
import OptimizedImage from './OptimizedImage';
import VideoEmbed from './VideoEmbed';
import {
  ChevronRightIcon,
  DocumentIcon,
  DownloadIcon,
  LinkIcon,
  PlayIcon,
} from '@/components/Icons';
import LearningObjectives from './LearningObjectives';
import AssessmentCriteria from './AssessmentCriteria';
import MaterialsRequired from './MaterialsRequired';
import NotionToDo from './NotionToDo';

interface NotionRendererProps {
  blocks: NotionBlock[];
  /** Optional course slug for proper navigation links */
  courseSlug?: string;
}

// Context to pass courseSlug down to nested components
const CourseContext = createContext<string | undefined>(undefined);

/**
 * Allowed domains for external links and embeds
 * SECURITY: Only allow trusted domains to prevent XSS attacks
 */
const ALLOWED_LINK_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
  'loom.com',
  'www.loom.com',
  'notion.so',
  'notion.site',
  'google.com',
  'docs.google.com',
  'drive.google.com',
  'figma.com',
  'www.figma.com',
  'github.com',
  'gist.github.com',
  'codepen.io',
  'codesandbox.io',
  'amazonaws.com', // S3 for Notion files
  's3.us-west-2.amazonaws.com',
  'prod-files-secure.s3.us-west-2.amazonaws.com',
];

/**
 * Validate if a URL is safe to render
 * @returns true if URL is safe, false if potentially dangerous
 */
function isValidUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Check against allowed domains for embeds
    // For regular links, we're more permissive but still validate protocol
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a URL is from an allowed domain for embedding
 */
function isAllowedEmbedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return ALLOWED_LINK_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// Render rich text with annotations
function renderRichText(richText: RichText[]): React.ReactNode {
  return richText.map((text, index) => {
    let content: React.ReactNode = text.plain_text;

    // Apply annotations
    if (text.annotations.bold) {
      content = <strong key={`bold-${index}`}>{content}</strong>;
    }
    if (text.annotations.italic) {
      content = <em key={`italic-${index}`}>{content}</em>;
    }
    if (text.annotations.strikethrough) {
      content = <s key={`strike-${index}`}>{content}</s>;
    }
    if (text.annotations.underline) {
      content = <u key={`underline-${index}`}>{content}</u>;
    }
    if (text.annotations.code) {
      content = (
        <code
          key={`code-${index}`}
          className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono"
        >
          {content}
        </code>
      );
    }

    // Apply link - SECURITY: Validate URL before rendering
    if (text.href && isValidUrl(text.href)) {
      content = (
        <a
          key={`link-${index}`}
          href={text.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {content}
        </a>
      );
    } else if (text.href) {
      // Invalid URL - render as plain text
      console.warn('Blocked potentially unsafe URL:', text.href);
    }

    // Apply color
    if (text.annotations.color && text.annotations.color !== 'default') {
      const colorClasses: Record<string, string> = {
        gray: 'text-gray-500',
        brown: 'text-amber-700',
        orange: 'text-orange-500',
        yellow: 'text-yellow-600',
        green: 'text-green-600',
        blue: 'text-blue-600',
        purple: 'text-purple-600',
        pink: 'text-pink-600',
        red: 'text-red-600',
      };
      const colorClass = colorClasses[text.annotations.color];
      if (colorClass) {
        content = (
          <span key={`color-${index}`} className={colorClass}>
            {content}
          </span>
        );
      }
    }

    return <span key={index}>{content}</span>;
  });
}

// Child page link component - uses course context for proper navigation
function ChildPageLink({ block }: { block: NotionBlock }) {
  const courseSlug = useContext(CourseContext);
  const href = courseSlug
    ? `/courses/${courseSlug}/lessons/${block.id}`
    : `/lessons/${block.id}`;

  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors mb-4"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <DocumentIcon size={20} className="text-gray-500" />
      </div>
      <span className="font-medium text-gray-900">{block.child_page?.title}</span>
      <ChevronRightIcon size={20} className="text-gray-400 ml-auto" />
    </a>
  );
}

// Link to page component - uses course context for proper navigation
function LinkToPageLink({ block }: { block: NotionBlock }) {
  const courseSlug = useContext(CourseContext);
  const href = courseSlug
    ? `/courses/${courseSlug}/lessons/${block.link_to_page?.page_id}`
    : `/lessons/${block.link_to_page?.page_id}`;

  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors mb-4"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <DocumentIcon size={20} className="text-gray-500" />
      </div>
      <span className="font-medium text-gray-900">Linked Page</span>
      <ChevronRightIcon size={20} className="text-gray-400 ml-auto" />
    </a>
  );
}

// Individual block renderer - memoized for performance
const BlockRenderer = memo(function BlockRenderer({ block }: { block: NotionBlock }): React.ReactNode {
  switch (block.type) {
    case 'paragraph':
      if (!block.paragraph?.rich_text.length) {
        return <div className="h-6" />; // Empty paragraph spacer
      }
      return (
        <p className="text-gray-700 text-base leading-loose mb-5">
          {renderRichText(block.paragraph.rich_text)}
        </p>
      );

    case 'heading_1':
      return (
        <h1 id={block.id} className="group/heading font-mono text-2xl font-semibold text-gray-900 mt-10 mb-5 scroll-mt-20">
          {block.heading_1 && renderRichText(block.heading_1.rich_text)}
          <a href={`#${block.id}`} className="ml-2 text-gray-300 opacity-0 group-hover/heading:opacity-100 transition-opacity" aria-label="Link to section">#</a>
        </h1>
      );

    case 'heading_2':
      return (
        <h2 id={block.id} className="group/heading font-mono text-xl font-semibold text-gray-900 mt-8 mb-4 scroll-mt-20">
          {block.heading_2 && renderRichText(block.heading_2.rich_text)}
          <a href={`#${block.id}`} className="ml-2 text-gray-300 opacity-0 group-hover/heading:opacity-100 transition-opacity" aria-label="Link to section">#</a>
        </h2>
      );

    case 'heading_3':
      return (
        <h3 id={block.id} className="group/heading font-mono text-lg font-medium text-gray-900 mt-6 mb-3 scroll-mt-20">
          {block.heading_3 && renderRichText(block.heading_3.rich_text)}
          <a href={`#${block.id}`} className="ml-2 text-gray-300 opacity-0 group-hover/heading:opacity-100 transition-opacity" aria-label="Link to section">#</a>
        </h3>
      );

    case 'bulleted_list_item':
      return (
        <li className="text-gray-700 text-base leading-relaxed ml-2 mb-2 pl-2">
          {block.bulleted_list_item && renderRichText(block.bulleted_list_item.rich_text)}
          {block.children && (
            <ul className="list-disc ml-6 mt-3 space-y-2">
              {block.children.map((child) => (
                <BlockRenderer key={child.id} block={child} />
              ))}
            </ul>
          )}
        </li>
      );

    case 'numbered_list_item':
      return (
        <li className="text-gray-700 text-base leading-relaxed ml-2 mb-2 pl-2">
          {block.numbered_list_item && renderRichText(block.numbered_list_item.rich_text)}
          {block.children && (
            <ol className="list-decimal ml-6 mt-3 space-y-2">
              {block.children.map((child) => (
                <BlockRenderer key={child.id} block={child} />
              ))}
            </ol>
          )}
        </li>
      );

    case 'to_do':
      return (
        <NotionToDo
          richText={block.to_do?.rich_text || []}
          initialChecked={block.to_do?.checked || false}
          renderRichText={renderRichText}
        />
      );

    case 'toggle':
      return (
        <details className="mb-4 group bg-gray-50 rounded-lg border border-gray-200 overflow-hidden transition-all duration-200">
          <summary className="cursor-pointer font-medium text-gray-900 hover:bg-gray-100 list-none flex items-center gap-2 p-3 transition-colors select-none">
            <ChevronRightIcon
              size={16}
              className="text-gray-400 transition-transform duration-200 group-open:rotate-90 shrink-0"
            />
            {block.toggle && renderRichText(block.toggle.rich_text)}
          </summary>
          {block.children && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-white animate-[fadeIn_150ms_ease-in]">
              {block.children.map((child) => (
                <BlockRenderer key={child.id} block={child} />
              ))}
            </div>
          )}
        </details>
      );

    case 'callout':
      return <CalloutBlock block={block} />;

    case 'quote':
      return (
        <blockquote className="border-l-4 border-gray-400 pl-6 py-3 mb-6 text-gray-700 bg-gray-50 rounded-r-lg">
          {block.quote && renderRichText(block.quote.rich_text)}
        </blockquote>
      );

    case 'divider':
      return <hr className="my-10 border-gray-300" />;

    case 'table':
      return <TableBlock block={block} />;

    case 'code':
      const language = block.code?.language || 'text';
      const codeText = block.code ? block.code.rich_text.map((t) => t.plain_text).join('') : '';
      return (
        <div className="relative mb-4 group/code">
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-1 bg-gray-800 rounded-t-lg">
            <span className="text-xs font-mono text-gray-400">{language}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codeText);
                const btn = document.getElementById(`copy-${block.id}`);
                if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); }
              }}
              id={`copy-${block.id}`}
              className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-gray-700"
            >
              Copy
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 pt-10 overflow-x-auto text-sm">
            <code>{codeText}</code>
          </pre>
        </div>
      );

    case 'image':
      const imageUrl = block.image?.type === 'external'
        ? block.image.external?.url
        : block.image?.file?.url;
      if (!imageUrl) return null;
      const imageCaption = block.image?.caption?.map(c => c.plain_text).join('') || '';
      return (
        <OptimizedImage
          src={imageUrl}
          alt={imageCaption || 'Image'}
          caption={imageCaption || undefined}
        />
      );

    case 'video':
      const videoUrl = block.video?.type === 'external'
        ? block.video.external?.url
        : block.video?.file?.url;
      if (!videoUrl) return null;
      const videoCaption = block.video?.caption?.map(c => c.plain_text).join('') || '';
      return (
        <VideoEmbed
          url={videoUrl}
          title={videoCaption || 'Video'}
          caption={videoCaption || undefined}
        />
      );

    case 'embed':
      if (!block.embed?.url) return null;
      const embedUrl = block.embed.url;
      const embedCaption = block.embed?.caption?.map(c => c.plain_text).join('') || '';

      // SECURITY: Validate embed URL
      if (!isValidUrl(embedUrl)) {
        console.warn('Blocked potentially unsafe embed URL:', embedUrl);
        return (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-gray-500 text-sm">
            Embedded content unavailable
          </div>
        );
      }

      // Check if it's a video embed
      if (embedUrl.includes('youtube') || embedUrl.includes('youtu.be') ||
          embedUrl.includes('vimeo') || embedUrl.includes('loom')) {
        return (
          <VideoEmbed
            url={embedUrl}
            title={embedCaption || 'Embedded Video'}
            caption={embedCaption || undefined}
          />
        );
      }

      // SECURITY: Only allow embeds from trusted domains
      if (!isAllowedEmbedDomain(embedUrl)) {
        return (
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors mb-4"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <LinkIcon size={20} className="text-blue-500" />
            </div>
            <span className="text-blue-600 hover:underline truncate">{embedUrl}</span>
          </a>
        );
      }

      // Generic embed fallback - SECURITY: Sandbox the iframe
      return (
        <div className="mb-6">
          <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video">
            <iframe
              src={embedUrl}
              title={embedCaption || 'Embedded content'}
              className="absolute inset-0 w-full h-full"
              loading="lazy"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          {embedCaption && (
            <p className="text-sm text-gray-500 mt-2 text-center italic">{embedCaption}</p>
          )}
        </div>
      );

    case 'file':
    case 'pdf':
      const fileUrl = block.file?.type === 'external'
        ? block.file.external?.url
        : block.file?.file?.url;
      const fileName = block.file?.name || 'Download file';
      if (!fileUrl) return null;
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors mb-4"
        >
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <DocumentIcon size={20} className="text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{fileName}</p>
            <p className="text-sm text-gray-500">Click to download</p>
          </div>
          <DownloadIcon size={20} className="text-gray-400" />
        </a>
      );

    case 'bookmark':
      if (!block.bookmark?.url) return null;
      return (
        <a
          href={block.bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors mb-4"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <LinkIcon size={20} className="text-blue-500" />
          </div>
          <span className="text-blue-600 hover:underline truncate">{block.bookmark.url}</span>
        </a>
      );

    case 'child_page':
      return <ChildPageLink block={block} />;

    case 'link_to_page':
      return <LinkToPageLink block={block} />;

    case 'column_list':
      return (
        <div className="flex gap-4 mb-4">
          {block.children?.map((column) => (
            <div key={column.id} className="flex-1">
              {column.children?.map((child) => (
                <BlockRenderer key={child.id} block={child} />
              ))}
            </div>
          ))}
        </div>
      );

    case 'column':
      return (
        <>
          {block.children?.map((child) => (
            <BlockRenderer key={child.id} block={child} />
          ))}
        </>
      );

    case 'audio':
      const audioUrl = block.audio?.type === 'external'
        ? block.audio.external?.url
        : block.audio?.file?.url;
      if (!audioUrl) return null;
      const audioCaption = block.audio?.caption?.map(c => c.plain_text).join('') || '';
      return (
        <div className="mb-4">
          <audio controls className="w-full rounded-lg">
            <source src={audioUrl} />
            Your browser does not support audio playback.
          </audio>
          {audioCaption && (
            <p className="text-sm text-gray-500 mt-2 text-center italic">{audioCaption}</p>
          )}
        </div>
      );

    default:
      // Unknown block type - render children if any
      if (block.children) {
        return (
          <>
            {block.children.map((child) => (
              <BlockRenderer key={child.id} block={child} />
            ))}
          </>
        );
      }
      return null;
  }
});

// Helper to get plain text from a block
function getBlockText(block: NotionBlock): string {
  const blockType = block.type as keyof NotionBlock;
  const content = block[blockType];
  if (content && typeof content === 'object' && 'rich_text' in content) {
    return (content as { rich_text: Array<{ plain_text: string }> }).rich_text?.map(t => t.plain_text).join('') || '';
  }
  return '';
}

// Detect if a heading indicates learning objectives
function isLearningObjectivesHeading(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('objective') ||
         lower.includes('what you') ||
         lower.includes('you will learn') ||
         lower.includes('learning outcome') ||
         lower.includes('by the end');
}

// Detect if a heading indicates materials required
function isMaterialsHeading(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('material') ||
         lower.includes('equipment') ||
         lower.includes('resource') ||
         lower.includes('you will need') ||
         lower.includes('required');
}

// Detect if a heading indicates assessment criteria
function isAssessmentHeading(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('assessment') ||
         lower.includes('criteria') ||
         lower.includes('competenc') ||
         lower.includes('checklist');
}

// Detect special content type based on heading + following list
interface SpecialContent {
  type: 'learning_objectives' | 'materials' | 'assessment' | null;
  title?: string;
  items: string[];
  headingIndex: number;
  listEndIndex: number;
}

function detectSpecialContent(blocks: NotionBlock[], startIndex: number): SpecialContent | null {
  const block = blocks[startIndex];

  // Only detect from heading_2 or heading_3
  if (!['heading_2', 'heading_3'].includes(block.type)) return null;

  const headingText = getBlockText(block);
  let contentType: 'learning_objectives' | 'materials' | 'assessment' | null = null;

  if (isLearningObjectivesHeading(headingText)) {
    contentType = 'learning_objectives';
  } else if (isMaterialsHeading(headingText)) {
    contentType = 'materials';
  } else if (isAssessmentHeading(headingText)) {
    contentType = 'assessment';
  }

  if (!contentType) return null;

  // Look for bulleted list items following the heading
  const items: string[] = [];
  let listEndIndex = startIndex;

  for (let i = startIndex + 1; i < blocks.length; i++) {
    const nextBlock = blocks[i];
    if (nextBlock.type === 'bulleted_list_item') {
      items.push(getBlockText(nextBlock));
      listEndIndex = i;
    } else if (nextBlock.type === 'paragraph' && !getBlockText(nextBlock).trim()) {
      // Skip empty paragraphs
      continue;
    } else {
      // Stop at any other block type
      break;
    }
  }

  // Must have at least 2 items to render as special content
  if (items.length < 2) return null;

  return {
    type: contentType,
    title: headingText,
    items,
    headingIndex: startIndex,
    listEndIndex,
  };
}

// Render special content components
function SpecialContentRenderer({ content }: { content: SpecialContent }) {
  switch (content.type) {
    case 'learning_objectives':
      return (
        <LearningObjectives
          objectives={content.items}
          title={content.title}
        />
      );
    case 'materials':
      return (
        <MaterialsRequired
          materials={content.items.map(item => ({
            type: 'equipment' as const,
            item,
          }))}
        />
      );
    case 'assessment':
      return (
        <AssessmentCriteria
          criteria={content.items.map((item, i) => ({
            id: `criterion-${i}`,
            text: item,
          }))}
          editable
        />
      );
    default:
      return null;
  }
}

export default memo(function NotionRenderer({ blocks, courseSlug }: NotionRendererProps) {
  // Build render elements in a single pass
  const renderElements = useMemo(() => {
    // First pass: detect special content patterns
    const specialContents: Map<number, SpecialContent> = new Map();
    const skipIndices: Set<number> = new Set();

    for (let i = 0; i < blocks.length; i++) {
      if (skipIndices.has(i)) continue;

      const specialContent = detectSpecialContent(blocks, i);
      if (specialContent) {
        specialContents.set(i, specialContent);
        // Mark all blocks in this special content as skip
        for (let j = i; j <= specialContent.listEndIndex; j++) {
          skipIndices.add(j);
        }
      }
    }

    // Second pass: render blocks in order, grouping lists on-the-fly
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < blocks.length) {
      // Check for special content starting at this index
      const specialContent = specialContents.get(i);
      if (specialContent) {
        elements.push(
          <SpecialContentRenderer key={`special-${i}`} content={specialContent} />
        );
        // Skip to after the special content
        i = specialContent.listEndIndex + 1;
        continue;
      }

      // Skip if this block was part of special content (shouldn't happen, but safety check)
      if (skipIndices.has(i)) {
        i++;
        continue;
      }

      const block = blocks[i];

      // Group consecutive bulleted list items
      if (block.type === 'bulleted_list_item') {
        const listItems: NotionBlock[] = [];
        const startIndex = i;
        while (i < blocks.length && blocks[i].type === 'bulleted_list_item' && !skipIndices.has(i)) {
          listItems.push(blocks[i]);
          i++;
        }
        elements.push(
          <ul key={`ul-${startIndex}`} className="list-disc ml-6 mb-6 space-y-1">
            {listItems.map((listBlock) => (
              <BlockRenderer key={listBlock.id} block={listBlock} />
            ))}
          </ul>
        );
        continue;
      }

      // Group consecutive numbered list items
      if (block.type === 'numbered_list_item') {
        const listItems: NotionBlock[] = [];
        const startIndex = i;
        while (i < blocks.length && blocks[i].type === 'numbered_list_item' && !skipIndices.has(i)) {
          listItems.push(blocks[i]);
          i++;
        }
        elements.push(
          <ol key={`ol-${startIndex}`} className="list-decimal ml-6 mb-6 space-y-1">
            {listItems.map((listBlock) => (
              <BlockRenderer key={listBlock.id} block={listBlock} />
            ))}
          </ol>
        );
        continue;
      }

      // Render single block
      elements.push(<BlockRenderer key={block.id} block={block} />);
      i++;
    }

    return elements;
  }, [blocks]);

  return (
    <CourseContext.Provider value={courseSlug}>
      <div className="notion-content">
        {renderElements}
      </div>
    </CourseContext.Provider>
  );
});
