'use client';

import { useState, useEffect } from 'react';
import { Menu, X, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { HandbookSection } from '@/lib/types';

interface HandbookSidebarProps {
  sections: Omit<HandbookSection, 'images'>[];
  activeSection?: string;
  title: string;
  color?: string;
}

export function HandbookSidebar({
  sections,
  activeSection,
  title,
  color = 'amber',
}: HandbookSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | undefined>(activeSection);

  // Track scroll position to update active section
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((section) => ({
        id: section.id,
        element: document.getElementById(`section-${section.id}`),
      }));

      // Find the section that is currently in view
      for (const { id, element } of sectionElements) {
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom > 120) {
            setCurrentSection(id);
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

  // Urban Arrow style: clean light theme
  const theme = {
    active: 'border-gray-900 bg-gray-100 text-gray-900',
    hover: 'hover:bg-gray-50 hover:text-gray-900',
    accent: 'text-gray-900',
    header: 'bg-white border-b border-gray-200',
  };

  return (
    <>
      {/* Mobile Toggle Button */}
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
          fixed lg:sticky top-0 lg:top-20 left-0 z-50 lg:z-auto
          w-80 lg:w-72 h-screen lg:h-[calc(100vh-5rem)]
          bg-white lg:bg-gray-50 border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-hidden flex flex-col
        `}
      >
        {/* Header */}
        <div className={`${theme.header} p-4 flex items-center justify-between lg:hidden`}>
          <span className="font-semibold text-gray-900">Contents</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 rounded text-gray-600"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Back Link (Desktop) */}
        <div className="hidden lg:block p-4 border-b border-gray-200">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={16} />
            <span>All Courses</span>
          </Link>
        </div>

        {/* Title */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{sections.length} sections</p>
        </div>

        {/* TOC List */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {sections.map((section, index) => {
              const isActive = currentSection === section.id;
              return (
                <li key={section.id}>
                  <button
                    onClick={() => handleSectionClick(section.id)}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-lg text-sm
                      border-l-2 transition-all duration-150
                      ${isActive
                        ? theme.active
                        : `border-transparent text-gray-600 ${theme.hover}`
                      }
                    `}
                  >
                    <span className="block truncate">
                      <span className={`font-semibold ${isActive ? theme.accent : 'text-gray-400'}`}>
                        {index + 1}.
                      </span>
                      {' '}{section.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          <button
            onClick={() => window.print()}
            className="hover:text-gray-700 transition-colors"
          >
            Print this handbook
          </button>
        </div>
      </aside>
    </>
  );
}
