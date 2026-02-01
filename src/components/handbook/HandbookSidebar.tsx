'use client';

import { useState, useEffect } from 'react';
import { Menu, X, ChevronLeft, Search } from 'lucide-react';
import Link from 'next/link';
import type { HandbookSection, ChapterGroup } from '@/lib/types';

type TocSection = Omit<HandbookSection, 'images' | 'blocks'>;

interface HandbookSidebarProps {
  sections: TocSection[];
  chapters?: ChapterGroup[];
  activeSection?: string;
  activeSectionSlug?: string;
  title: string;
  courseSlug: string;
  onSearchClick?: () => void;
}

export function HandbookSidebar({
  sections,
  title,
  courseSlug,
  onSearchClick,
}: HandbookSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>('');
  const [readProgress, setReadProgress] = useState(0);

  // Track scroll position for active section + progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);

      for (const section of sections) {
        const el = document.getElementById(`section-${section.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom > 120) {
            setCurrentSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const handleSectionClick = (sectionId: string) => {
    setIsOpen(false);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
        aria-label="Open table of contents"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 lg:top-16 left-0 z-50 lg:z-auto
          w-72 h-screen lg:h-[calc(100vh-4rem)]
          bg-white border-r border-gray-100
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-hidden flex flex-col
          print:hidden
        `}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-gray-50 shrink-0">
          <div
            className="h-full bg-gray-900 transition-all duration-150 ease-out"
            style={{ width: `${readProgress}%` }}
          />
        </div>

        {/* Mobile header */}
        <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between lg:hidden">
          <span className="font-semibold text-gray-900">Contents</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-50 rounded text-gray-500"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Back link */}
        <div className="hidden lg:block px-5 pt-5 pb-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={14} />
            <span>All Courses</span>
          </Link>
        </div>

        {/* Title + Search */}
        <div className="px-5 pb-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {onSearchClick && (
            <button
              onClick={onSearchClick}
              className="mt-3 w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Search size={14} />
              <span>Search...</span>
              <kbd className="ml-auto text-xs text-gray-300 px-1.5 py-0.5">⌘K</kbd>
            </button>
          )}
        </div>

        {/* Flat section list */}
        <nav className="flex-1 overflow-y-auto py-2">
          <ul>
            {sections.map((section, index) => {
              const isActive = currentSection === section.id;
              return (
                <li key={section.id}>
                  <button
                    onClick={() => handleSectionClick(section.id)}
                    className={`
                      w-full text-left px-5 py-2 text-sm transition-colors
                      ${isActive
                        ? 'text-gray-900 font-medium bg-gray-50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className={`inline-block w-8 ${isActive ? 'text-gray-900' : 'text-gray-300'}`}>
                      {section.section || `${index + 1}.`}
                    </span>
                    {section.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
          <span>{Math.round(readProgress)}%</span>
          <button
            onClick={() => window.print()}
            className="hover:text-gray-600 transition-colors"
          >
            Print
          </button>
        </div>
      </aside>
    </>
  );
}
