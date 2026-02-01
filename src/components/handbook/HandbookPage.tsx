'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, BookOpen, Printer, Search } from 'lucide-react';
import type { Course, HandbookSection as HandbookSectionType, ChapterGroup } from '@/lib/types';
import { HandbookSidebar } from './HandbookSidebar';
import { HandbookSection } from './HandbookSection';
import { SearchModal } from './SearchModal';

interface HandbookPageProps {
  course: Course;
  sections: HandbookSectionType[];
  chapters?: ChapterGroup[];
}

export function HandbookPage({ course, sections, chapters: serverChapters }: HandbookPageProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Prepare TOC data (lightweight, no blocks/images)
  const tocSections = useMemo(() => sections.map(({ id, name, pageRange, order, section, chapter, slug, icon, hasVideo, estTime }) => ({
    id, name, pageRange, order, section, chapter, slug, icon, hasVideo, estTime,
  })), [sections]);

  // Chapters for search modal
  const chapters = useMemo(() => {
    if (serverChapters && serverChapters.length > 0) return serverChapters;
    return [];
  }, [serverChapters]);

  // Cmd+K search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky header — minimal */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 -ml-2 hover:bg-gray-50 transition-colors text-gray-400"
                aria-label="Back to courses"
              >
                <ChevronLeft size={20} />
              </Link>
              <h1 className="font-semibold text-sm text-gray-900 hidden sm:block">{course.title}</h1>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Search"
              >
                <Search size={16} />
                <kbd className="hidden md:inline text-xs text-gray-300 px-1.5 py-0.5">⌘K</kbd>
              </button>
              <button
                onClick={() => window.print()}
                className="p-2 hover:bg-gray-50 transition-colors text-gray-400"
                aria-label="Print"
              >
                <Printer size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="flex">
        <HandbookSidebar
          sections={tocSections}
          title={course.shortTitle}
          courseSlug={course.slug}
          onSearchClick={() => setIsSearchOpen(true)}
        />

        <main className="flex-1 min-w-0">
          {/* Hero — just title and description */}
          <div className="px-8 lg:px-16 pt-12 pb-8 max-w-4xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {course.title}
            </h1>
            {course.description && (
              <p className="text-lg text-gray-500 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>

          {/* Sections */}
          <div className="px-8 lg:px-16 pb-16 max-w-4xl">
            {sections.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen size={32} className="mx-auto mb-4 text-gray-300" />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">No sections found</h2>
                <p className="text-gray-400 text-sm">
                  Unable to load handbook content.
                </p>
              </div>
            ) : (
              <div>
                {sections.map((section, index) => (
                  <HandbookSection
                    key={section.id}
                    section={section}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-100 print:hidden">
            <div className="max-w-4xl px-8 lg:px-16 py-6">
              <p className="text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Bamboo Bicycle Club
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* Search Modal */}
      <SearchModal
        sections={tocSections}
        chapters={chapters.length > 0 ? chapters : undefined}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        courseSlug={course.slug}
      />
    </div>
  );
}
