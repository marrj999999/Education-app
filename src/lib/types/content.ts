/**
 * Content Section Types for Parsed Notion Blocks
 *
 * These types represent structured content parsed from raw Notion blocks
 * for use in different view modes (Prep Mode, Teaching Mode).
 */

// =============================================================================
// Section Interfaces
// =============================================================================

/**
 * Timeline/Schedule section - parsed from tables with time/activity/duration columns
 */
export interface TimelineSection {
  id: string;
  type: 'timeline';
  title?: string;
  rows: Array<{
    time: string;
    activity: string;
    duration: string;
    notes?: string;
  }>;
}

/**
 * Checklist section - materials, tools, equipment lists
 */
export interface ChecklistSection {
  id: string;
  type: 'checklist';
  category: 'materials' | 'tools' | 'equipment' | 'preparation';
  title: string;
  items: Array<{
    text: string;
    quantity?: string;
  }>;
}

/**
 * Safety section - critical warnings from red/yellow callouts
 */
export interface SafetySection {
  id: string;
  type: 'safety';
  level: 'critical' | 'warning' | 'caution';
  title?: string;
  content: string;
  items?: string[];
}

/**
 * Teaching step section - numbered instruction steps (SECTION pattern)
 */
export interface TeachingStepSection {
  id: string;
  type: 'teaching-step';
  stepNumber: number;
  title?: string;
  instruction: string;
  duration?: string;
  tips?: string[];
  warnings?: string[];
  /** Structured activities with optional durations */
  activities?: Array<{
    text: string;
    duration?: string;
  }>;
  /** Teaching approach notes for instructors */
  teachingApproach?: string;
  /** Differentiation guidance for different learner levels */
  differentiation?: string;
  /** Multiple paragraphs of content (when more than just instruction) */
  paragraphs?: string[];
  /** Embedded resources (images, videos, files) within this section */
  resources?: Array<{
    type: 'image' | 'video' | 'file' | 'embed';
    url: string;
    title?: string;
    caption?: string;
  }>;
  /** Embedded tables within this section */
  tables?: Array<{
    headers: string[];
    rows: string[][];
  }>;
  /** Quote blocks / key scripts for instructor reference */
  quotes?: string[];
}

/**
 * Checkpoint section - quality check / assessment criteria
 */
export interface CheckpointSection {
  id: string;
  type: 'checkpoint';
  title: string;
  items: Array<{
    criterion: string;
    description?: string;
  }>;
}

/**
 * Outcomes section - learning objectives
 */
export interface OutcomesSection {
  id: string;
  type: 'outcomes';
  title: string;
  items: string[];
}

/**
 * Vocabulary section - term/definition pairs from tables
 */
export interface VocabularySection {
  id: string;
  type: 'vocabulary';
  terms: Array<{
    term: string;
    definition: string;
  }>;
}

/**
 * Resource section - PDFs, videos, images, files
 */
export interface ResourceSection {
  id: string;
  type: 'resource';
  resourceType: 'pdf' | 'video' | 'image' | 'file';
  url: string;
  title?: string;
  caption?: string;
}

/**
 * Prose section - fallback for unstructured content
 */
export interface ProseSection {
  id: string;
  type: 'prose';
  content: string;
  htmlContent?: string;
}

/**
 * Heading section - section headings (h1/h2/h3)
 */
export interface HeadingSection {
  id: string;
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
}

// =============================================================================
// Union Type
// =============================================================================

/**
 * Union of all content section types
 */
export type ContentSection =
  | TimelineSection
  | ChecklistSection
  | SafetySection
  | TeachingStepSection
  | CheckpointSection
  | OutcomesSection
  | VocabularySection
  | ResourceSection
  | ProseSection
  | HeadingSection;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for TimelineSection
 */
export function isTimelineSection(section: ContentSection): section is TimelineSection {
  return section.type === 'timeline';
}

/**
 * Type guard for ChecklistSection
 */
export function isChecklistSection(section: ContentSection): section is ChecklistSection {
  return section.type === 'checklist';
}

/**
 * Type guard for SafetySection
 */
export function isSafetySection(section: ContentSection): section is SafetySection {
  return section.type === 'safety';
}

/**
 * Type guard for TeachingStepSection
 */
export function isTeachingStepSection(section: ContentSection): section is TeachingStepSection {
  return section.type === 'teaching-step';
}

/**
 * Type guard for CheckpointSection
 */
export function isCheckpointSection(section: ContentSection): section is CheckpointSection {
  return section.type === 'checkpoint';
}

/**
 * Type guard for OutcomesSection
 */
export function isOutcomesSection(section: ContentSection): section is OutcomesSection {
  return section.type === 'outcomes';
}

/**
 * Type guard for VocabularySection
 */
export function isVocabularySection(section: ContentSection): section is VocabularySection {
  return section.type === 'vocabulary';
}

/**
 * Type guard for ResourceSection
 */
export function isResourceSection(section: ContentSection): section is ResourceSection {
  return section.type === 'resource';
}

/**
 * Type guard for ProseSection
 */
export function isProseSection(section: ContentSection): section is ProseSection {
  return section.type === 'prose';
}

/**
 * Type guard for HeadingSection
 */
export function isHeadingSection(section: ContentSection): section is HeadingSection {
  return section.type === 'heading';
}
