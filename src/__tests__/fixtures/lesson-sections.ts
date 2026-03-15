/**
 * Test fixtures for lesson content sections
 * Reusable mock data for tests that need ContentSection arrays
 */

import type {
  ContentSection,
  TimelineSection,
  ChecklistSection,
  SafetySection,
  TeachingStepSection,
  CheckpointSection,
  OutcomesSection,
  VocabularySection,
  ResourceSection,
  ProseSection,
  HeadingSection,
} from '@/lib/types/content';

export const mockHeading: HeadingSection = {
  id: 'heading-1',
  type: 'heading',
  level: 1,
  text: 'Introduction to Bamboo Frame Building',
};

export const mockTimeline: TimelineSection = {
  id: 'timeline-1',
  type: 'timeline',
  title: 'Lesson Schedule',
  rows: [
    { time: '09:00', activity: 'Welcome & Safety Briefing', duration: '15 min' },
    { time: '09:15', activity: 'Tool Demonstration', duration: '30 min', notes: 'Show all cutting tools' },
    { time: '09:45', activity: 'Hands-on Practice', duration: '45 min' },
    { time: '10:30', activity: 'Review & Cleanup', duration: '15 min' },
  ],
};

export const mockChecklist: ChecklistSection = {
  id: 'checklist-1',
  type: 'checklist',
  category: 'materials',
  title: 'Required Materials',
  items: [
    { text: 'Bamboo culm sections (4x)', quantity: '4' },
    { text: 'Epoxy resin and hardener' },
    { text: 'Fiber wrapping tape', quantity: '2 rolls' },
    { text: 'Sandpaper (80, 120, 220 grit)' },
  ],
};

export const mockSafety: SafetySection = {
  id: 'safety-1',
  type: 'safety',
  level: 'critical',
  title: 'Personal Protective Equipment',
  content: 'All learners must wear appropriate PPE at all times in the workshop.',
  items: ['Safety goggles', 'Dust mask', 'Work gloves', 'Closed-toe shoes'],
};

export const mockTeachingStep: TeachingStepSection = {
  id: 'step-1',
  type: 'teaching-step',
  stepNumber: 1,
  title: 'Preparing the Bamboo',
  instruction: 'Select and inspect bamboo culms for structural integrity.',
  duration: '20 min',
  tips: ['Choose straight sections with minimal nodes', 'Check for insect damage'],
  warnings: ['Bamboo splinters can be sharp - handle with gloves'],
  activities: [
    { text: 'Inspect each culm for cracks', duration: '5 min' },
    { text: 'Mark cutting points with tape', duration: '10 min' },
  ],
};

export const mockCheckpoint: CheckpointSection = {
  id: 'checkpoint-1',
  type: 'checkpoint',
  title: 'Quality Checkpoint: Bamboo Selection',
  items: [
    { criterion: 'No visible cracks or splits', description: 'Inspect under good lighting' },
    { criterion: 'Consistent diameter', description: 'Use caliper to verify ±2mm tolerance' },
    { criterion: 'Dry and seasoned', description: 'Moisture content below 12%' },
  ],
};

export const mockOutcomes: OutcomesSection = {
  id: 'outcomes-1',
  type: 'outcomes',
  title: 'Learning Outcomes',
  items: [
    'Identify suitable bamboo for bicycle frame construction',
    'Demonstrate safe use of workshop tools',
    'Apply basic jointing techniques',
  ],
};

export const mockVocabulary: VocabularySection = {
  id: 'vocab-1',
  type: 'vocabulary',
  terms: [
    { term: 'Culm', definition: 'The main stem of a bamboo plant' },
    { term: 'Node', definition: 'The raised ring where leaves emerge from the stem' },
    { term: 'Internode', definition: 'The section between two nodes' },
  ],
};

export const mockResource: ResourceSection = {
  id: 'resource-1',
  type: 'resource',
  resourceType: 'pdf',
  url: '/docs/bamboo-selection-guide.pdf',
  title: 'Bamboo Selection Guide',
  caption: 'Reference document for material sourcing',
};

export const mockProse: ProseSection = {
  id: 'prose-1',
  type: 'prose',
  content:
    'Bamboo has been used in construction for thousands of years. Its high strength-to-weight ratio makes it an excellent material for bicycle frames.',
};

/**
 * Complete lesson sections array - represents a typical lesson
 */
export const mockLessonSections: ContentSection[] = [
  mockHeading,
  mockOutcomes,
  mockSafety,
  mockTimeline,
  mockChecklist,
  mockTeachingStep,
  {
    id: 'step-2',
    type: 'teaching-step',
    stepNumber: 2,
    title: 'Cutting the Bamboo',
    instruction: 'Use the hacksaw to cut culms to the marked lengths.',
    duration: '30 min',
  } as TeachingStepSection,
  mockCheckpoint,
  mockVocabulary,
  mockProse,
  mockResource,
];

/**
 * Empty lesson with no sections
 */
export const emptyLessonSections: ContentSection[] = [];

/**
 * Minimal lesson with just a heading and prose
 */
export const minimalLessonSections: ContentSection[] = [
  mockHeading,
  mockProse,
];
