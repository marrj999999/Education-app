'use client';

import Link from 'next/link';
import { ChevronLeft, BookOpen, FileText, Printer } from 'lucide-react';
import type { Course, HandbookSection as HandbookSectionType } from '@/lib/types';
import { COURSE_COLOR_THEMES } from '@/lib/courses';
import { HandbookSidebar } from './HandbookSidebar';
import { HandbookSection } from './HandbookSection';
import { DynamicIcon } from '@/components/Icons';

interface HandbookPageProps {
  course: Course;
  sections: HandbookSectionType[];
}

export function HandbookPage({ course, sections }: HandbookPageProps) {
  const totalImages = sections.reduce((acc, section) => acc + section.images.length, 0);

  // Prepare TOC data (sections without images for sidebar)
  const tocSections = sections.map(({ id, name, pageRange, order }) => ({
    id,
    name,
    pageRange,
    order,
  }));

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Urban Arrow style: clean, white, minimal */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="h-16 flex items-center justify-between">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 -ml-2 hover:bg-gray-100 transition-colors text-gray-600"
                aria-label="Back to courses"
              >
                <ChevronLeft size={20} />
              </Link>
              <div className="flex items-center gap-3">
                <DynamicIcon name={course.icon} size={20} className="text-gray-500" />
                <div className="hidden sm:block">
                  <h1 className="font-semibold text-base leading-tight text-gray-900">{course.title}</h1>
                </div>
              </div>
            </div>

            {/* Right: Stats + Print */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
                <span>{sections.length} sections</span>
                <span>{totalImages} images</span>
              </div>
              <button
                onClick={() => window.print()}
                className="p-2 hover:bg-gray-100 transition-colors text-gray-600"
                aria-label="Print handbook"
              >
                <Printer size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar */}
        <HandbookSidebar
          sections={tocSections}
          title={course.shortTitle}
          color={course.color}
        />

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {/* Hero Banner - Urban Arrow style: clean, white */}
          <div className="bg-white py-10 px-6 lg:px-12 border-b border-gray-200">
            <div className="max-w-3xl">
              <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 mb-3">
                {course.title}
              </h1>
              <p className="text-base text-gray-600 mb-6">
                {course.description}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>{sections.length} Sections</span>
                <span>&middot;</span>
                <span>{totalImages} Illustrations</span>
                <span>&middot;</span>
                <span>{course.level}</span>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="px-8 lg:px-16 py-12 max-w-5xl mx-auto">
            {sections.length === 0 ? (
              <div className="text-center py-16 border border-gray-200">
                <BookOpen size={32} className="mx-auto mb-4 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  No sections found
                </h2>
                <p className="text-gray-500 text-sm">
                  Unable to load handbook content. Please check the Notion database configuration.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
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

          {/* Footer - Urban Arrow style: minimal */}
          <footer className="border-t border-gray-200 bg-white mt-12 print:hidden">
            <div className="max-w-4xl mx-auto px-6 lg:px-12 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">Bamboo Bicycle Club</span>
                  <span>&middot;</span>
                  <span>{course.title}</span>
                </div>
                <p>&copy; {new Date().getFullYear()} All rights reserved</p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
