'use client';

import { useState, useEffect, useMemo } from 'react';
import type { NotionBlock } from '@/lib/types';

interface TOCItem {
  id: string;
  title: string;
  level: number;
}

interface TableOfContentsProps {
  blocks: NotionBlock[];
}

// Get short summary from heading (first 1-2 words, max 15 chars)
function getShortTitle(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words[0].length >= 10) return words[0].slice(0, 12);
  if (words.length === 1) return words[0];
  const twoWords = `${words[0]} ${words[1]}`;
  return twoWords.length > 15 ? words[0] : twoWords;
}

export default function TableOfContents({ blocks }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  // Extract headings from blocks recursively (only h1 and h2 for cleaner pills)
  const headings = useMemo(() => {
    const extractHeadings = (blocks: NotionBlock[]): TOCItem[] => {
      const items: TOCItem[] = [];
      for (const block of blocks) {
        if (['heading_1', 'heading_2'].includes(block.type)) {
          const content = block[block.type as 'heading_1' | 'heading_2'];
          if (content?.rich_text) {
            items.push({
              id: block.id,
              title: content.rich_text.map(t => t.plain_text).join(''),
              level: parseInt(block.type.split('_')[1])
            });
          }
        }
        // Check children recursively
        if (block.children) {
          items.push(...extractHeadings(block.children));
        }
      }
      return items;
    };
    return extractHeadings(blocks);
  }, [blocks]);

  // Intersection observer for active heading
  useEffect(() => {
    if (headings.length < 2) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  // Only show for content with 2+ headings
  if (headings.length < 2) return null;

  return (
    <nav aria-label="Page sections" className="mb-6 pb-6 border-b border-gray-200 print:hidden">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Jump to section
      </p>
      <div className="flex flex-wrap gap-2" role="list">
        {headings.map(h => (
          <a
            key={h.id}
            href={`#${h.id}`}
            role="listitem"
            aria-current={activeId === h.id ? 'true' : undefined}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(h.id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                window.history.pushState({}, '', `#${h.id}`);
              }
            }}
            className={`text-sm px-3 py-1.5 rounded-md border transition-all
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-600
              ${activeId === h.id
                ? 'bg-green-700 border-green-700 text-white font-medium'
                : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 hover:border-gray-300'
              }`}
            title={h.title}
          >
            {getShortTitle(h.title)}
          </a>
        ))}
      </div>
    </nav>
  );
}
