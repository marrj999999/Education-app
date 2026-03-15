/**
 * Tests for content section type guards
 * Verifies all type guard functions correctly identify section types
 */

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
  type ContentSection,
  type TimelineSection,
  type ChecklistSection,
  type SafetySection,
  type TeachingStepSection,
  type CheckpointSection,
  type OutcomesSection,
  type VocabularySection,
  type ResourceSection,
  type ProseSection,
  type HeadingSection,
} from '@/lib/types/content';

// =============================================================================
// Test Fixtures
// =============================================================================

const fixtures: Record<string, ContentSection> = {
  timeline: {
    id: 'timeline-1',
    type: 'timeline',
    title: 'Lesson Schedule',
    rows: [
      { time: '09:00', activity: 'Introduction', duration: '15 min' },
      { time: '09:15', activity: 'Demo', duration: '30 min', notes: 'Use video' },
    ],
  } as TimelineSection,

  checklist: {
    id: 'checklist-1',
    type: 'checklist',
    category: 'materials',
    title: 'Required Materials',
    items: [
      { text: 'Bamboo strips', quantity: '4' },
      { text: 'Epoxy resin' },
    ],
  } as ChecklistSection,

  safety: {
    id: 'safety-1',
    type: 'safety',
    level: 'critical',
    title: 'PPE Required',
    content: 'Always wear safety goggles',
    items: ['Goggles', 'Gloves'],
  } as SafetySection,

  teachingStep: {
    id: 'step-1',
    type: 'teaching-step',
    stepNumber: 1,
    title: 'Prepare the bamboo',
    instruction: 'Split bamboo into strips using a knife',
    duration: '15 min',
    tips: ['Use sharp blade'],
    warnings: ['Watch for splinters'],
  } as TeachingStepSection,

  checkpoint: {
    id: 'checkpoint-1',
    type: 'checkpoint',
    title: 'Quality Check',
    items: [
      { criterion: 'Even thickness', description: 'Check with caliper' },
      { criterion: 'No cracks' },
    ],
  } as CheckpointSection,

  outcomes: {
    id: 'outcomes-1',
    type: 'outcomes',
    title: 'Learning Outcomes',
    items: ['Understand bamboo properties', 'Apply jointing techniques'],
  } as OutcomesSection,

  vocabulary: {
    id: 'vocab-1',
    type: 'vocabulary',
    terms: [
      { term: 'Culm', definition: 'The stem of a bamboo plant' },
      { term: 'Node', definition: 'The joint of a bamboo stem' },
    ],
  } as VocabularySection,

  resource: {
    id: 'resource-1',
    type: 'resource',
    resourceType: 'pdf',
    url: '/docs/guide.pdf',
    title: 'Build Guide',
    caption: 'Reference document',
  } as ResourceSection,

  prose: {
    id: 'prose-1',
    type: 'prose',
    content: 'This is a paragraph of content',
    htmlContent: '<p>This is a paragraph of content</p>',
  } as ProseSection,

  heading: {
    id: 'heading-1',
    type: 'heading',
    level: 2,
    text: 'Getting Started',
  } as HeadingSection,
};

const allSectionTypes = Object.keys(fixtures);

describe('Content Type Guards', () => {
  describe('isTimelineSection', () => {
    it('should return true for timeline sections', () => {
      expect(isTimelineSection(fixtures.timeline)).toBe(true);
    });

    it('should return false for all other section types', () => {
      allSectionTypes
        .filter((t) => t !== 'timeline')
        .forEach((t) => {
          expect(isTimelineSection(fixtures[t])).toBe(false);
        });
    });
  });

  describe('isChecklistSection', () => {
    it('should return true for checklist sections', () => {
      expect(isChecklistSection(fixtures.checklist)).toBe(true);
    });

    it('should return false for all other section types', () => {
      allSectionTypes
        .filter((t) => t !== 'checklist')
        .forEach((t) => {
          expect(isChecklistSection(fixtures[t])).toBe(false);
        });
    });
  });

  describe('isSafetySection', () => {
    it('should return true for safety sections', () => {
      expect(isSafetySection(fixtures.safety)).toBe(true);
    });

    it('should return false for all other section types', () => {
      allSectionTypes
        .filter((t) => t !== 'safety')
        .forEach((t) => {
          expect(isSafetySection(fixtures[t])).toBe(false);
        });
    });
  });

  describe('isTeachingStepSection', () => {
    it('should return true for teaching-step sections', () => {
      expect(isTeachingStepSection(fixtures.teachingStep)).toBe(true);
    });

    it('should return false for all other section types', () => {
      allSectionTypes
        .filter((t) => t !== 'teachingStep')
        .forEach((t) => {
          expect(isTeachingStepSection(fixtures[t])).toBe(false);
        });
    });
  });

  describe('isCheckpointSection', () => {
    it('should return true for checkpoint sections', () => {
      expect(isCheckpointSection(fixtures.checkpoint)).toBe(true);
    });

    it('should return false for all other section types', () => {
      allSectionTypes
        .filter((t) => t !== 'checkpoint')
        .forEach((t) => {
          expect(isCheckpointSection(fixtures[t])).toBe(false);
        });
    });
  });

  describe('isOutcomesSection', () => {
    it('should return true for outcomes sections', () => {
      expect(isOutcomesSection(fixtures.outcomes)).toBe(true);
    });

    it('should return false for all other section types', () => {
      allSectionTypes
        .filter((t) => t !== 'outcomes')
        .forEach((t) => {
          expect(isOutcomesSection(fixtures[t])).toBe(false);
        });
    });
  });

  describe('isVocabularySection', () => {
    it('should return true for vocabulary sections', () => {
      expect(isVocabularySection(fixtures.vocabulary)).toBe(true);
    });

    it('should return false for all other section types', () => {
      allSectionTypes
        .filter((t) => t !== 'vocabulary')
        .forEach((t) => {
          expect(isVocabularySection(fixtures[t])).toBe(false);
        });
    });
  });

  describe('isResourceSection', () => {
    it('should return true for resource sections', () => {
      expect(isResourceSection(fixtures.resource)).toBe(true);
    });

    it('should return false for all other section types', () => {
      allSectionTypes
        .filter((t) => t !== 'resource')
        .forEach((t) => {
          expect(isResourceSection(fixtures[t])).toBe(false);
        });
    });
  });

  describe('isProseSection', () => {
    it('should return true for prose sections', () => {
      expect(isProseSection(fixtures.prose)).toBe(true);
    });

    it('should return false for all other section types', () => {
      allSectionTypes
        .filter((t) => t !== 'prose')
        .forEach((t) => {
          expect(isProseSection(fixtures[t])).toBe(false);
        });
    });
  });

  describe('isHeadingSection', () => {
    it('should return true for heading sections', () => {
      expect(isHeadingSection(fixtures.heading)).toBe(true);
    });

    it('should return false for all other section types', () => {
      allSectionTypes
        .filter((t) => t !== 'heading')
        .forEach((t) => {
          expect(isHeadingSection(fixtures[t])).toBe(false);
        });
    });
  });

  describe('Section data structure', () => {
    it('should have valid timeline rows', () => {
      const section = fixtures.timeline as TimelineSection;
      expect(section.rows.length).toBeGreaterThan(0);
      section.rows.forEach((row) => {
        expect(row.time).toBeTruthy();
        expect(row.activity).toBeTruthy();
        expect(row.duration).toBeTruthy();
      });
    });

    it('should have valid checklist items', () => {
      const section = fixtures.checklist as ChecklistSection;
      expect(section.items.length).toBeGreaterThan(0);
      expect(section.category).toBe('materials');
      section.items.forEach((item) => {
        expect(item.text).toBeTruthy();
      });
    });

    it('should have valid safety levels', () => {
      const validLevels = ['critical', 'warning', 'caution'];
      const section = fixtures.safety as SafetySection;
      expect(validLevels).toContain(section.level);
    });

    it('should have valid heading levels', () => {
      const section = fixtures.heading as HeadingSection;
      expect([1, 2, 3]).toContain(section.level);
    });

    it('should have valid resource types', () => {
      const validTypes = ['pdf', 'video', 'image', 'file'];
      const section = fixtures.resource as ResourceSection;
      expect(validTypes).toContain(section.resourceType);
    });

    it('should have valid checklist categories', () => {
      const validCategories = ['materials', 'tools', 'equipment', 'preparation'];
      const section = fixtures.checklist as ChecklistSection;
      expect(validCategories).toContain(section.category);
    });
  });
});
