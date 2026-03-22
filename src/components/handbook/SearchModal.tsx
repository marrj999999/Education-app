'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X, FileText, Video, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { HandbookSection, ChapterGroup } from '@/lib/types';
import { CHAPTER_COLORS } from '@/lib/types';

interface SearchModalProps {
  sections: Omit<HandbookSection, 'images' | 'blocks'>[];
  chapters?: ChapterGroup[];
  isOpen: boolean;
  onClose: () => void;
  courseSlug: string;
}

export function SearchModal({
  sections,
  chapters,
  isOpen,
  onClose,
  courseSlug,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // This would need to be handled by parent, but we can at least prevent default
        }
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search results
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const lower = query.toLowerCase();
    return sections.filter(section =>
      section.name.toLowerCase().includes(lower) ||
      (section.chapter?.toLowerCase().includes(lower)) ||
      (section.section?.toLowerCase().includes(lower))
    ).slice(0, 10); // Limit to 10 results
  }, [query, sections]);

  // Get chapter color for a section
  const getChapterColor = (chapterName?: string) => {
    if (!chapterName) return null;
    return CHAPTER_COLORS[chapterName] || null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Search handbook</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative px-4 pt-2 pb-3 border-b border-border">
          <Search size={18} className="absolute left-7 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search sections..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-base border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-7 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.trim() === '' ? (
            // Show chapters when no query
            <div className="p-4">
              <p className="text-xs text-text-tertiary uppercase font-medium mb-3">Browse by chapter</p>
              <div className="space-y-1">
                {chapters?.map(chapter => {
                  const color = chapter.color;
                  return (
                    <button
                      key={chapter.name}
                      onClick={() => {
                        // Jump to first section in chapter
                        if (chapter.sections[0]?.slug) {
                          onClose();
                          window.location.href = `/courses/${courseSlug}/${chapter.sections[0].slug}`;
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-l-4 transition-colors ${color.border} hover:${color.bg}`}
                    >
                      <span className={`font-medium ${color.text}`}>{chapter.name}</span>
                      <span className="text-xs text-text-tertiary ml-auto">
                        {chapter.sections.length} sections
                      </span>
                      <ArrowRight size={14} className="text-text-tertiary" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : results.length === 0 ? (
            // No results
            <div className="p-8 text-center">
              <FileText size={32} className="mx-auto text-text-tertiary mb-3" />
              <p className="text-text-tertiary">No sections found for &quot;{query}&quot;</p>
              <p className="text-xs text-text-tertiary mt-1">Try a different search term</p>
            </div>
          ) : (
            // Search results
            <ul className="py-2">
              {results.map(section => {
                const color = getChapterColor(section.chapter);
                return (
                  <li key={section.id}>
                    <Link
                      href={`/courses/${courseSlug}/${section.slug}`}
                      onClick={onClose}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-surface-hover transition-colors"
                    >
                      <FileText size={18} className="shrink-0 text-text-tertiary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {section.section && (
                            <span className="text-text-tertiary mr-1">{section.section}</span>
                          )}
                          {section.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {section.chapter && color && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}>
                              {section.chapter}
                            </span>
                          )}
                          {section.hasVideo && (
                            <span className="flex items-center gap-1 text-xs text-text-tertiary">
                              <Video size={12} />
                              Video
                            </span>
                          )}
                          {section.estTime && (
                            <span className="text-xs text-text-tertiary">{section.estTime}</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={14} className="shrink-0 text-text-tertiary mt-1" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-surface-hover text-xs text-text-tertiary flex items-center justify-between">
          <span>
            {results.length > 0 && `${results.length} result${results.length === 1 ? '' : 's'}`}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs">esc</kbd>
              to close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
