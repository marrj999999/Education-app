'use client';

import {
  Clock,
  CheckSquare,
  AlertTriangle,
  ListOrdered,
  ClipboardCheck,
  Target,
  BookOpen,
  FileText,
  Type,
  Heading,
} from 'lucide-react';
import type { ContentSection } from '@/lib/types/content';

interface SectionStepperProps {
  sections: ContentSection[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export function SectionStepper({ sections, currentIndex, onNavigate }: SectionStepperProps) {
  // Map section types to icons
  const typeIcons: Record<string, typeof Clock> = {
    timeline: Clock,
    checklist: CheckSquare,
    safety: AlertTriangle,
    'teaching-step': ListOrdered,
    checkpoint: ClipboardCheck,
    outcomes: Target,
    vocabulary: BookOpen,
    resource: FileText,
    prose: Type,
    heading: Heading,
  };

  return (
    <div className="bg-white border-b border-gray-200 py-3 px-4 overflow-x-auto">
      <div className="flex items-center justify-center gap-2 min-w-max">
        {sections.map((section, index) => {
          const Icon = typeIcons[section.type] || Type;
          const isActive = index === currentIndex;
          const isPast = index < currentIndex;

          return (
            <button
              key={section.id}
              onClick={() => onNavigate(index)}
              className={`
                relative flex items-center justify-center
                w-10 h-10 lg:w-12 lg:h-12 rounded-full
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${isActive
                  ? 'bg-blue-500 text-white scale-110 shadow-lg'
                  : isPast
                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                }
              `}
              aria-label={`Go to section ${index + 1}: ${section.type}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <Icon size={18} />

              {/* Section number tooltip */}
              <span
                className={`
                  absolute -bottom-5 text-xs font-medium
                  ${isActive ? 'text-blue-600' : 'text-gray-400'}
                `}
              >
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6 mb-1">
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{
              width: `${sections.length > 1 ? (currentIndex / (sections.length - 1)) * 100 : 100}%`,
            }}
          />
        </div>
      </div>

      {/* Current section indicator */}
      <div className="text-center text-sm text-gray-500 mt-2">
        Section {currentIndex + 1} of {sections.length}
      </div>
    </div>
  );
}
