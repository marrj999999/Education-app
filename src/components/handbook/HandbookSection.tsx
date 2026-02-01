'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HandbookSection as HandbookSectionType, ChapterColorScheme } from '@/lib/types';
import NotionRenderer from '@/components/NotionRenderer';

interface HandbookSectionProps {
  section: HandbookSectionType;
  index: number;
  color?: string;
  courseSlug?: string;
  prevSection?: Pick<HandbookSectionType, 'slug' | 'name' | 'section' | 'chapter'> | null;
  nextSection?: Pick<HandbookSectionType, 'slug' | 'name' | 'section' | 'chapter'> | null;
  chapterColor?: ChapterColorScheme;
}

export function HandbookSection({
  section,
  index,
  courseSlug,
  prevSection,
  nextSection,
}: HandbookSectionProps) {
  const hasBlocks = section.blocks && section.blocks.length > 0;
  const hasImages = section.images && section.images.length > 0;
  const hasPrevNext = courseSlug && (prevSection || nextSection);

  return (
    <section
      id={`section-${section.id}`}
      className="handbook-section py-10 scroll-mt-24 border-b border-gray-100 last:border-b-0 print:py-4 print:break-inside-avoid"
    >
      {/* Section Title — PDF manual style with phase badge */}
      <div className="flex items-start gap-4 mb-6">
        {/* Phase number badge */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-mono text-sm font-bold">
          {String(index + 1).padStart(2, '0')}
        </div>
        <h2 className="text-2xl font-mono font-semibold text-gray-900 pt-1">
          {section.name}
          {!section.name.endsWith('.') && '.'}
        </h2>
      </div>

      {/* Content */}
      {hasBlocks ? (
        <div className="prose prose-gray max-w-none">
          <NotionRenderer blocks={section.blocks!} />
        </div>
      ) : hasImages ? (
        <div className={`
          ${section.images!.length === 1
            ? 'max-w-2xl'
            : 'grid grid-cols-1 md:grid-cols-2 gap-8'}
        `}>
          {section.images!.map((image, imgIndex) => (
            <figure key={imgIndex}>
              <div className="relative overflow-hidden">
                {image.url.endsWith('.svg') ? (
                  <img
                    src={image.url}
                    alt={image.caption || `Image ${imgIndex + 1}`}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                ) : (
                  <Image
                    src={image.url}
                    alt={image.caption || `Image ${imgIndex + 1}`}
                    width={800}
                    height={600}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                )}
              </div>
              {image.caption && (
                <figcaption className="mt-2 text-sm text-gray-500">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm italic">
          No content for this section.
        </div>
      )}

      {/* Previous / Next Navigation (multi-page mode only) */}
      {hasPrevNext && (
        <nav className="flex items-stretch justify-between mt-12 pt-8 border-t border-gray-100 gap-4">
          {prevSection ? (
            <Link
              href={`/courses/${courseSlug}/${prevSection.slug}`}
              className="flex-1 group flex flex-col items-start p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                <ChevronLeft size={14} />
                Previous
              </span>
              <span className="font-medium text-gray-900 group-hover:text-gray-700">
                {prevSection.section && (
                  <span className="text-gray-400 mr-1">{prevSection.section}</span>
                )}
                {prevSection.name}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          {nextSection ? (
            <Link
              href={`/courses/${courseSlug}/${nextSection.slug}`}
              className="flex-1 group flex flex-col items-end text-right p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                Next
                <ChevronRight size={14} />
              </span>
              <span className="font-medium text-gray-900 group-hover:text-gray-700">
                {nextSection.section && (
                  <span className="text-gray-400 mr-1">{nextSection.section}</span>
                )}
                {nextSection.name}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </nav>
      )}
    </section>
  );
}
