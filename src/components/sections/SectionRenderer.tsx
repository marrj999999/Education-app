'use client';

import { useState, useEffect } from 'react';
import type { ContentSection } from '@/lib/types/content';
import {
  isTimelineSection,
  isChecklistSection,
  isSafetySection,
  isTeachingStepSection,
  isCheckpointSection,
  isOutcomesSection,
  isVocabularySection,
  isResourceSection,
  isProseSection,
  isHeadingSection,
} from '@/lib/types/content';

import { TimelineCard } from './TimelineCard';
import { ChecklistDisplay } from './ChecklistDisplay';
import { SafetyCallout } from './SafetyCallout';
import { TeachingStepDisplay } from './TeachingStepDisplay';
import { CheckpointList } from './CheckpointList';
import { OutcomesList } from './OutcomesList';
import { VocabularyCards } from './VocabularyCards';
import { ResourceEmbed } from './ResourceEmbed';
import { ProseBlock } from './ProseBlock';
import { HeadingBlock } from './HeadingBlock';

interface SectionRendererProps {
  section: ContentSection;
  variant?: 'compact' | 'large' | 'teaching' | 'presentation';
  lessonId?: string; // For localStorage keys
}

export function SectionRenderer({ section, variant = 'compact', lessonId }: SectionRendererProps) {
  // Map teaching/presentation variants to 'large' for components that only support compact/large
  const basicVariant: 'compact' | 'large' = variant === 'teaching' || variant === 'presentation' ? 'large' : variant;
  // State for checklist items (persisted to localStorage)
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  // Load checked items from localStorage
  useEffect(() => {
    if (lessonId && isChecklistSection(section) && typeof window !== 'undefined') {
      const key = `checklist-${lessonId}-${section.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setCheckedItems(JSON.parse(saved));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [lessonId, section]);

  // Handle checklist toggle
  const handleChecklistToggle = (item: string) => {
    setCheckedItems((prev) => {
      const next = prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item];

      // Save to localStorage
      if (lessonId && isChecklistSection(section) && typeof window !== 'undefined') {
        const key = `checklist-${lessonId}-${section.id}`;
        localStorage.setItem(key, JSON.stringify(next));
      }

      return next;
    });
  };

  // Render based on section type
  if (isTimelineSection(section)) {
    return <TimelineCard section={section} variant={variant} />;
  }

  if (isChecklistSection(section)) {
    return (
      <ChecklistDisplay
        section={section}
        checked={checkedItems}
        onToggle={handleChecklistToggle}
        variant={variant}
      />
    );
  }

  if (isSafetySection(section)) {
    return <SafetyCallout section={section} variant={variant} />;
  }

  if (isTeachingStepSection(section)) {
    return <TeachingStepDisplay section={section} variant={variant} />;
  }

  if (isCheckpointSection(section)) {
    const storageKey = lessonId ? `checkpoint-${lessonId}-${section.id}` : undefined;
    return <CheckpointList section={section} storageKey={storageKey} variant={basicVariant} />;
  }

  if (isOutcomesSection(section)) {
    return <OutcomesList section={section} variant={basicVariant} />;
  }

  if (isVocabularySection(section)) {
    return <VocabularyCards section={section} variant={basicVariant} />;
  }

  if (isResourceSection(section)) {
    return <ResourceEmbed section={section} variant={basicVariant} />;
  }

  if (isProseSection(section)) {
    return <ProseBlock section={section} variant={basicVariant} />;
  }

  if (isHeadingSection(section)) {
    return <HeadingBlock section={section} variant={basicVariant} />;
  }

  // Fallback for unknown section types
  return (
    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
      <p className="text-sm text-gray-500">Unknown section type: {(section as ContentSection).type}</p>
    </div>
  );
}
