'use client';

import type { ContentSection } from '@/lib/types/content';
import { SectionRenderer } from '@/components/sections/SectionRenderer';
import { cn } from '@/lib/utils';

interface CurrentSectionProps {
  section: ContentSection;
  lessonId: string;
  isPresentation?: boolean;
  isDarkMode?: boolean;
}

export function CurrentSection({ section, lessonId, isPresentation = false, isDarkMode = false }: CurrentSectionProps) {
  return (
    <div className={cn(
      "min-h-[calc(100vh-200px)] flex items-start justify-center py-8 px-4",
      isPresentation && "py-12"
    )}>
      <div className={cn(
        "w-full",
        isPresentation ? "max-w-4xl" : "max-w-3xl"
      )}>
        {/* Rendering for teaching/presentation mode */}
        <div className={cn(
          "animate-fade-in",
          isPresentation ? "presentation-section" : "teaching-section",
          isPresentation && isDarkMode && "text-slate-100"
        )}>
          <SectionRenderer
            section={section}
            lessonId={lessonId}
            variant={isPresentation ? "presentation" : "large"}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        /* Teaching mode typography */
        .teaching-section :global(h1),
        .teaching-section :global(h2),
        .teaching-section :global(h3) {
          font-size: 2rem;
          line-height: 1.2;
        }

        .teaching-section :global(p),
        .teaching-section :global(li) {
          font-size: 1.25rem;
          line-height: 1.6;
        }

        @media (min-width: 1024px) {
          .teaching-section :global(h1),
          .teaching-section :global(h2),
          .teaching-section :global(h3) {
            font-size: 2.5rem;
          }

          .teaching-section :global(p),
          .teaching-section :global(li) {
            font-size: 1.5rem;
          }
        }

        /* Presentation mode typography - extra large */
        .presentation-section :global(h1),
        .presentation-section :global(h2),
        .presentation-section :global(h3) {
          font-size: 2.5rem;
          line-height: 1.2;
        }

        .presentation-section :global(p),
        .presentation-section :global(li) {
          font-size: 1.5rem;
          line-height: 1.75;
        }

        @media (min-width: 1024px) {
          .presentation-section :global(h1),
          .presentation-section :global(h2),
          .presentation-section :global(h3) {
            font-size: 3rem;
          }

          .presentation-section :global(p),
          .presentation-section :global(li) {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
}
