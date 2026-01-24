'use client';

import Image from 'next/image';
import type { HandbookSection as HandbookSectionType } from '@/lib/types';
import NotionRenderer from '@/components/NotionRenderer';

interface HandbookSectionProps {
  section: HandbookSectionType;
  index: number;
  color?: string;
}

export function HandbookSection({ section, index }: HandbookSectionProps) {
  const hasBlocks = section.blocks && section.blocks.length > 0;
  const hasImages = section.images && section.images.length > 0;

  return (
    <section
      id={`section-${section.id}`}
      className="handbook-section py-12 scroll-mt-24"
    >
      {/* Section Header - Urban Arrow style: large, bold with underline */}
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-200">
        {index + 1}. {section.name}
      </h2>

      {/* Render ALL Notion content using NotionRenderer */}
      {hasBlocks ? (
        <div className="prose prose-gray max-w-none">
          <NotionRenderer blocks={section.blocks!} />
        </div>
      ) : hasImages ? (
        /* Fallback to images-only display if no blocks */
        <div className={`
          ${section.images!.length === 1
            ? 'max-w-2xl'
            : 'grid grid-cols-1 md:grid-cols-2 gap-8'}
        `}>
          {section.images!.map((image, imgIndex) => (
            <figure key={imgIndex} className="handbook-image-container">
              <div className="relative bg-white border border-gray-300 overflow-hidden">
                {/* SVG images don't work well with Next/Image, use regular img */}
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
              {/* Figure caption - Urban Arrow style: Image X: description */}
              <figcaption className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Image {index + 1}:</span>
                {image.caption && <span className="ml-1">{image.caption}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8 bg-gray-50 border border-gray-200">
          <p className="text-gray-500 text-sm">No content for this section.</p>
        </div>
      )}
    </section>
  );
}
