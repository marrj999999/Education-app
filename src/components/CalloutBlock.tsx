'use client';

import React from 'react';
import type { NotionBlock, RichText } from '@/lib/types';
import {
  LightbulbIcon,
  WarningIcon,
  WrenchIcon,
  InfoIcon,
  LevelIcon,
  CogIcon,
  ClipboardIcon,
  ChevronRightIcon,
  PlayIcon,
} from '@/components/Icons';
import InstructorNote from './InstructorNote';

interface IconProps {
  className?: string;
  size?: number | string;
}

interface CalloutBlockProps {
  block: NotionBlock;
}

// PDF manual-style callout types (Video Tutorial, Important Step, Builder Tip)
const MANUAL_CALLOUT_TYPES: Record<string, { type: 'video' | 'important' | 'builder_tip'; label: string }> = {
  '▶️': { type: 'video', label: 'Video Tutorial' },
  '▶': { type: 'video', label: 'Video Tutorial' },
  '🎬': { type: 'video', label: 'Video Tutorial' },
  '📹': { type: 'video', label: 'Video Tutorial' },
  '🎥': { type: 'video', label: 'Video Tutorial' },
  '⚠️': { type: 'important', label: 'Important step' },
  '❗': { type: 'important', label: 'Important step' },
  '‼️': { type: 'important', label: 'Important step' },
  '💡': { type: 'builder_tip', label: 'Builder Tip' },
  '⚡': { type: 'builder_tip', label: 'Builder Tip' },
};

// Emoji to instructor note type mapping
const INSTRUCTOR_EMOJI_MAP: Record<string, 'tip' | 'warning' | 'issue' | 'info'> = {
  '💡': 'tip',
  '⚠️': 'warning',
  '🔧': 'issue',
  'ℹ️': 'info',
  '❗': 'warning',
  '⚡': 'tip',
  '🛠️': 'issue',
  '🛠': 'issue',
  '⚙️': 'issue',
  '📝': 'info',
  '👉': 'tip',
};

// Emoji to Icon component mapping for non-InstructorNote callouts
const EMOJI_TO_ICON: Record<string, React.FC<IconProps>> = {
  '💡': LightbulbIcon,
  '⚠️': WarningIcon,
  '🔧': WrenchIcon,
  'ℹ️': InfoIcon,
  '❗': WarningIcon,
  '⚡': LevelIcon,
  '🛠️': WrenchIcon,
  '🛠': WrenchIcon,
  '⚙️': CogIcon,
  '📝': ClipboardIcon,
  '👉': ChevronRightIcon,
};

// Render rich text with annotations
function renderRichText(richText: RichText[]): React.ReactNode {
  return richText.map((text, index) => {
    let content: React.ReactNode = text.plain_text;

    if (text.annotations.bold) {
      content = <strong key={`bold-${index}`}>{content}</strong>;
    }
    if (text.annotations.italic) {
      content = <em key={`italic-${index}`}>{content}</em>;
    }
    if (text.annotations.code) {
      content = (
        <code key={`code-${index}`} className="bg-white/50 px-1 rounded text-sm font-mono">
          {content}
        </code>
      );
    }
    if (text.href) {
      content = (
        <a
          key={`link-${index}`}
          href={text.href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          {content}
        </a>
      );
    }

    return <span key={index}>{content}</span>;
  });
}

export default function CalloutBlock({ block }: CalloutBlockProps) {
  if (!block.callout) return null;

  const { rich_text, icon, color } = block.callout;

  // Check if this should be rendered as an InstructorNote based on emoji
  const emoji = icon?.type === 'emoji' ? icon.emoji : null;

  // Check for PDF manual-style callouts first (Video Tutorial, Important Step, Builder Tip)
  const manualCallout = emoji ? MANUAL_CALLOUT_TYPES[emoji] : null;

  if (manualCallout) {
    // Render as PDF manual-style callout (gray box with icon and label)
    const IconComponent = manualCallout.type === 'video'
      ? PlayIcon
      : manualCallout.type === 'important'
        ? WarningIcon
        : LightbulbIcon;

    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-100 border border-gray-200 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
          <IconComponent size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-semibold text-gray-900 mb-1">
            {manualCallout.label}
          </div>
          <div className="text-gray-700 leading-relaxed">
            {renderRichText(rich_text)}
          </div>
          {/* Render children if any */}
          {block.children && block.children.length > 0 && (
            <div className="mt-2 space-y-1">
              {block.children.map((child) => (
                <div key={child.id}>
                  {child.paragraph && (
                    <p className="text-gray-700">{child.paragraph.rich_text.map(t => t.plain_text).join('')}</p>
                  )}
                  {child.bulleted_list_item && (
                    <p className="flex items-start gap-2 text-gray-700">
                      <span>•</span>
                      <span>{child.bulleted_list_item.rich_text.map(t => t.plain_text).join('')}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const instructorNoteType = emoji ? INSTRUCTOR_EMOJI_MAP[emoji] : null;

  if (instructorNoteType) {
    // Render as enhanced InstructorNote component
    const text = rich_text.map(t => t.plain_text).join('');

    // Check for custom title in format "Title: content" or just content
    const colonIndex = text.indexOf(':');
    const hasCustomTitle = colonIndex > 0 && colonIndex < 30;
    const title = hasCustomTitle ? text.substring(0, colonIndex).trim() : undefined;
    const content = hasCustomTitle ? text.substring(colonIndex + 1).trim() : text;

    return (
      <InstructorNote type={instructorNoteType} title={title}>
        <span>{content}</span>
        {/* Render children if any */}
        {block.children && block.children.length > 0 && (
          <div className="mt-2 space-y-1">
            {block.children.map((child) => (
              <div key={child.id}>
                {child.paragraph && (
                  <p>{child.paragraph.rich_text.map(t => t.plain_text).join('')}</p>
                )}
                {child.bulleted_list_item && (
                  <p className="flex items-start gap-2">
                    <span>•</span>
                    <span>{child.bulleted_list_item.rich_text.map(t => t.plain_text).join('')}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </InstructorNote>
    );
  }

  // Map Notion colors to Tailwind classes
  // Based on the Bamboo Bicycle style guide:
  // Blue: Session overview, informational
  // Red: Safety warnings, alerts
  // Green: Teaching content, success
  // Yellow: Resources, references
  const colorStyles: Record<string, { bg: string; border: string; text: string }> = {
    default: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-800',
    },
    gray_background: {
      bg: 'bg-gray-100',
      border: 'border-gray-300',
      text: 'text-gray-800',
    },
    brown: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
    },
    brown_background: {
      bg: 'bg-amber-100',
      border: 'border-amber-300',
      text: 'text-amber-900',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
    },
    orange_background: {
      bg: 'bg-orange-100',
      border: 'border-orange-300',
      text: 'text-orange-900',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
    },
    yellow_background: {
      bg: 'bg-yellow-100',
      border: 'border-yellow-300',
      text: 'text-yellow-900',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
    },
    green_background: {
      bg: 'bg-green-100',
      border: 'border-green-300',
      text: 'text-green-900',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
    },
    blue_background: {
      bg: 'bg-blue-100',
      border: 'border-blue-300',
      text: 'text-blue-900',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900',
    },
    purple_background: {
      bg: 'bg-purple-100',
      border: 'border-purple-300',
      text: 'text-purple-900',
    },
    pink: {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      text: 'text-pink-900',
    },
    pink_background: {
      bg: 'bg-pink-100',
      border: 'border-pink-300',
      text: 'text-pink-900',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
    },
    red_background: {
      bg: 'bg-red-100',
      border: 'border-red-300',
      text: 'text-red-900',
    },
  };

  const styles = colorStyles[color] || colorStyles.default;

  // Get icon component for emoji (if available)
  const IconComponent = emoji ? EMOJI_TO_ICON[emoji] : null;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border mb-4
        ${styles.bg} ${styles.border} ${styles.text}
      `}
    >
      {IconComponent ? (
        <IconComponent size={24} className="flex-shrink-0 opacity-75" />
      ) : (
        <LightbulbIcon size={24} className="flex-shrink-0 opacity-75" />
      )}
      <div className="flex-1 min-w-0">
        <div className="leading-relaxed">
          {renderRichText(rich_text)}
        </div>
        {/* Render children if any */}
        {block.children && block.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {block.children.map((child) => (
              <div key={child.id}>
                {child.paragraph && (
                  <p>{renderRichText(child.paragraph.rich_text)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
