/**
 * Parser Utility Functions
 *
 * Helper functions for parsing Notion blocks into structured content sections.
 */

import type { RichText } from '@/lib/types';

// =============================================================================
// Text Extraction
// =============================================================================

/**
 * Extract plain text from Notion rich_text array
 *
 * @param richText - Array of Notion RichText objects
 * @returns Combined plain text string
 */
export function extractText(richText: RichText[] | undefined): string {
  if (!richText || !Array.isArray(richText)) {
    return '';
  }
  return richText.map((rt) => rt.plain_text).join('');
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate unique section ID
 *
 * @returns Unique string ID for a content section
 */
export function generateSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// Content Detection Functions
// =============================================================================

/**
 * Detect if text contains safety-related keywords or emojis
 *
 * @param text - Text to check
 * @returns True if text indicates safety content
 */
export function isSafetyContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  const safetyKeywords = [
    'safety',
    'warning',
    'caution',
    'danger',
    'hazard',
    'critical',
    'important',
    'alert',
    'risk',
  ];
  const safetyEmojis = ['⚠️', '🔴', '❗', '🚨', '⛔', '☠️', '💀', '🔥'];

  // Check for keywords
  const hasKeyword = safetyKeywords.some((keyword) => lowerText.includes(keyword));

  // Check for emojis
  const hasEmoji = safetyEmojis.some((emoji) => text.includes(emoji));

  return hasKeyword || hasEmoji;
}

/**
 * Detect if heading indicates a materials/tools/equipment section
 *
 * @param text - Heading text to check
 * @returns True if heading indicates a checklist section
 */
export function isChecklistHeading(text: string): boolean {
  const lowerText = text.toLowerCase();
  const checklistPatterns = [
    'materials',
    'tools',
    'equipment',
    "what you'll need",
    'what you will need',
    'you will need',
    'resources needed',
    'supplies',
    'items needed',
    'requirements',
    'things you need',
    'preparation materials',
    'kit list',
    // Additional patterns for setup/prep checklists
    'setup',
    'set up',
    'room setup',
    'considerations',
    'checklist',
    'pre-session',
    'before you start',
    'preparation',
    'prep list',
  ];

  return checklistPatterns.some((pattern) => lowerText.includes(pattern));
}

/**
 * Detect if heading indicates a learning outcomes section
 *
 * @param text - Heading text to check
 * @returns True if heading indicates outcomes section
 */
export function isOutcomesHeading(text: string): boolean {
  const lowerText = text.toLowerCase();
  const outcomesPatterns = [
    'learning outcomes',
    'learning objectives',
    'objectives',
    'by the end',
    'learners will',
    'students will',
    'you will learn',
    'what you will learn',
    'goals',
    'outcomes',
    'aims',
  ];

  return outcomesPatterns.some((pattern) => lowerText.includes(pattern));
}

/**
 * Detect if heading indicates a checkpoint/assessment section
 *
 * @param text - Heading text to check
 * @returns True if heading indicates checkpoint section
 */
export function isCheckpointHeading(text: string): boolean {
  const lowerText = text.toLowerCase();
  const checkpointPatterns = [
    'what to look for',
    'quality check',
    'assessment',
    'checkpoint',
    'success criteria',
    'evaluation',
    'criteria',
    'check points',
    'quality criteria',
    'signs of success',
    'how to assess',
    'verification',
  ];

  return checkpointPatterns.some((pattern) => lowerText.includes(pattern));
}

/**
 * Detect if heading indicates a teaching steps/instructions section
 *
 * @param text - Heading text to check
 * @returns True if heading indicates teaching steps section
 */
export function isTeachingStepsHeading(text: string): boolean {
  const lowerText = text.toLowerCase();
  const stepsPatterns = [
    'what to do',
    'instructions',
    'procedure',
    'steps',
    'method',
    'how to',
    'process',
    'directions',
    'guide',
    'tutorial',
    'activity',
    'demonstration',
  ];

  return stepsPatterns.some((pattern) => lowerText.includes(pattern));
}

// =============================================================================
// Table Detection
// =============================================================================

/**
 * Detect table type based on header columns
 *
 * @param headers - Array of column header strings
 * @returns Table type: 'timeline', 'vocabulary', or 'unknown'
 */
export function detectTableType(
  headers: string[]
): 'timeline' | 'vocabulary' | 'checklist' | 'unknown' {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  // Timeline detection: has "time" AND ("activity" OR "duration")
  const hasTime = lowerHeaders.some(
    (h) => h.includes('time') || h.includes('when') || h.includes('schedule')
  );
  const hasActivity = lowerHeaders.some(
    (h) =>
      h.includes('activity') ||
      h.includes('task') ||
      h.includes('what') ||
      h.includes('action') ||
      h.includes('topic') ||
      h.includes('section') ||
      h.includes('content') ||
      h.includes('phase') ||
      h.includes('step')
  );
  const hasDuration = lowerHeaders.some(
    (h) => h.includes('duration') || h.includes('length') || h.includes('mins') || h.includes('min')
  );

  if (hasTime && (hasActivity || hasDuration)) {
    return 'timeline';
  }

  // Vocabulary detection: has "term" AND "definition"
  const hasTerm = lowerHeaders.some(
    (h) => h.includes('term') || h.includes('word') || h.includes('concept') || h.includes('name')
  );
  const hasDefinition = lowerHeaders.some(
    (h) =>
      h.includes('definition') ||
      h.includes('meaning') ||
      h.includes('description') ||
      h.includes('explanation')
  );

  if (hasTerm && hasDefinition) {
    return 'vocabulary';
  }

  // Checklist detection: has "item" AND ("quantity" OR "amount")
  const hasItem = lowerHeaders.some(
    (h) =>
      h.includes('item') || h.includes('material') || h.includes('tool') || h.includes('equipment')
  );
  const hasQuantity = lowerHeaders.some(
    (h) => h.includes('quantity') || h.includes('amount') || h.includes('qty') || h.includes('count')
  );

  if (hasItem && hasQuantity) {
    return 'checklist';
  }

  return 'unknown';
}

// =============================================================================
// Color Detection for Safety Levels
// =============================================================================

/**
 * Determine safety level from Notion callout color
 *
 * @param color - Notion color string (e.g., "red_background")
 * @returns Safety level: 'critical', 'warning', or 'caution'
 */
export function getSafetyLevelFromColor(color: string): 'critical' | 'warning' | 'caution' {
  const lowerColor = color.toLowerCase();

  if (lowerColor.includes('red')) {
    return 'critical';
  }
  if (lowerColor.includes('yellow') || lowerColor.includes('orange')) {
    return 'warning';
  }
  return 'caution';
}

// =============================================================================
// Checklist Category Detection
// =============================================================================

/**
 * Determine checklist category from heading text
 *
 * @param text - Heading text
 * @returns Checklist category
 */
export function getChecklistCategory(
  text: string
): 'materials' | 'tools' | 'equipment' | 'preparation' {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('tool')) {
    return 'tools';
  }
  if (lowerText.includes('equipment')) {
    return 'equipment';
  }
  if (lowerText.includes('prepar') || lowerText.includes('before')) {
    return 'preparation';
  }
  return 'materials';
}

// =============================================================================
// Quantity Extraction
// =============================================================================

/**
 * Extract quantity from checklist item text
 *
 * Matches patterns like:
 * - "Bamboo poles x 4" -> { text: "Bamboo poles", quantity: "4" }
 * - "4x Clamps" -> { text: "Clamps", quantity: "4" }
 * - "(2) Drill bits" -> { text: "Drill bits", quantity: "2" }
 *
 * @param text - Item text that may contain quantity
 * @returns Object with text and optional quantity
 */
export function extractQuantity(text: string): { text: string; quantity?: string } {
  // Pattern: "item x N" or "item × N"
  const patternXSuffix = /^(.+?)\s*[x×]\s*(\d+)$/i;
  const matchXSuffix = text.match(patternXSuffix);
  if (matchXSuffix) {
    return { text: matchXSuffix[1].trim(), quantity: matchXSuffix[2] };
  }

  // Pattern: "Nx item" or "N x item"
  const patternXPrefix = /^(\d+)\s*[x×]\s*(.+)$/i;
  const matchXPrefix = text.match(patternXPrefix);
  if (matchXPrefix) {
    return { text: matchXPrefix[2].trim(), quantity: matchXPrefix[1] };
  }

  // Pattern: "(N) item"
  const patternParens = /^\((\d+)\)\s*(.+)$/;
  const matchParens = text.match(patternParens);
  if (matchParens) {
    return { text: matchParens[2].trim(), quantity: matchParens[1] };
  }

  // Pattern: "N item" at start (only if number is followed by space and item)
  const patternNumPrefix = /^(\d+)\s+(.+)$/;
  const matchNumPrefix = text.match(patternNumPrefix);
  if (matchNumPrefix) {
    return { text: matchNumPrefix[2].trim(), quantity: matchNumPrefix[1] };
  }

  return { text: text.trim() };
}

// =============================================================================
// Step Number Extraction
// =============================================================================

/**
 * Extract step number from text
 *
 * Matches patterns like:
 * - "Step 1: Do this" -> 1
 * - "1. Do this" -> 1
 * - "Step One: Do this" -> 1
 *
 * @param text - Text that may contain step number
 * @returns Step number or null if not found
 */
export function extractStepNumber(text: string): number | null {
  // Pattern: "Step N:" or "Step N."
  const patternStep = /^step\s+(\d+)[:.]/i;
  const matchStep = text.match(patternStep);
  if (matchStep) {
    return parseInt(matchStep[1], 10);
  }

  // Pattern: "N." at start (numbered list style)
  const patternNum = /^(\d+)\.\s/;
  const matchNum = text.match(patternNum);
  if (matchNum) {
    return parseInt(matchNum[1], 10);
  }

  // Word numbers (Step One, Step Two, etc.)
  const wordNumbers: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };

  const patternWord = /^step\s+(one|two|three|four|five|six|seven|eight|nine|ten)[:.]/i;
  const matchWord = text.match(patternWord);
  if (matchWord) {
    return wordNumbers[matchWord[1].toLowerCase()];
  }

  return null;
}

// =============================================================================
// Duration Extraction
// =============================================================================

/**
 * Extract duration from text
 *
 * Matches patterns like:
 * - "(5 mins)" -> "5 mins"
 * - "10 minutes" -> "10 minutes"
 * - "~15min" -> "~15min"
 *
 * @param text - Text that may contain duration
 * @returns Duration string or undefined
 */
export function extractDuration(text: string): string | undefined {
  // Pattern: "(N mins)" or "(N minutes)" or "(N min)"
  const patternParens = /\(([~]?\d+\s*(?:mins?|minutes?))\)/i;
  const matchParens = text.match(patternParens);
  if (matchParens) {
    return matchParens[1];
  }

  // Pattern: "N mins" or "N minutes" standalone
  const patternMins = /(\d+\s*(?:mins?|minutes?))/i;
  const matchMins = text.match(patternMins);
  if (matchMins) {
    return matchMins[1];
  }

  return undefined;
}

// =============================================================================
// SECTION Pattern Detection (Teaching Steps)
// =============================================================================

/**
 * Detect if heading matches a teaching section pattern
 *
 * Matches patterns like:
 * - "SECTION 1: Introduction"
 * - "Section 2: Main Activity"
 * - "Day 1: Design & Preparation"
 * - "🔍 Day 1: Design & Preparation" (with emoji prefix)
 * - "Session 3: Building"
 * - "Part 2: Assembly"
 * - "Lesson 5: Components"
 * - "Phase 1: Planning"
 * - "Module 2: Basics"
 * - "Week 1: Introduction"
 * - "1. Day 7 Review (15 minutes)" (numbered prefix)
 * - "3. Key Geometry Concepts" (numbered teaching step)
 *
 * @param text - Heading text to check
 * @returns Object with section number and title, or null if not a match
 */
export function isSectionHeading(
  text: string
): { sectionNumber: number; title: string } | null {
  // First check for numbered headings like "1. Title" BEFORE any text cleaning
  // (because emoji/symbol regex can accidentally strip digits)
  const numberedPattern = /^(\d+)\.\s+(.+)$/;
  const numberedMatch = text.trim().match(numberedPattern);

  if (numberedMatch) {
    return {
      sectionNumber: parseInt(numberedMatch[1], 10),
      title: numberedMatch[2].trim(),
    };
  }

  // Strip leading emoji and special characters for keyword-based patterns
  // This handles patterns like "🔍 Day 1:" or "📌 SECTION 2:"
  // Note: Only strip actual emoji characters, not digits or letters
  const cleanText = text.replace(/^[\s\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}📌🔍🔨🎨✅📝📋🔴🎯📑⏱️📓]+/u, '').trim();

  // Pattern: "KEYWORD N:" or "KEYWORD N -" or "KEYWORD N."
  // Keywords: section, day, session, part, lesson, phase, module, week, unit, stage
  const pattern = /^(?:section|day|session|part|lesson|phase|module|week|unit|stage)\s+(\d+)\s*[:.\-–—]\s*(.+)$/i;
  const match = cleanText.match(pattern);

  if (match) {
    return {
      sectionNumber: parseInt(match[1], 10),
      title: match[2].trim(),
    };
  }

  // Also match range patterns like "Day 1-3:" or "Lesson 11-15:"
  const rangePattern = /^(?:section|day|session|part|lesson|phase|module|week|unit|stage)s?\s+(\d+)\s*[-–—]\s*\d+\s*[:.\-–—]\s*(.+)$/i;
  const rangeMatch = cleanText.match(rangePattern);

  if (rangeMatch) {
    return {
      sectionNumber: parseInt(rangeMatch[1], 10),
      title: rangeMatch[2].trim(),
    };
  }

  return null;
}

/**
 * Parse duration from text
 *
 * Matches patterns like:
 * - "15 minutes"
 * - "45 min"
 * - "~20 mins"
 * - "(10 minutes)"
 *
 * @param text - Text that may contain duration
 * @returns Duration string or null if not found
 */
export function parseDuration(text: string): string | null {
  // Pattern with parentheses: "(N minutes)" or "(~N min)"
  const patternParens = /\(([~≈]?\s*\d+\s*(?:mins?|minutes?|min))\)/i;
  const matchParens = text.match(patternParens);
  if (matchParens) {
    return matchParens[1].trim();
  }

  // Pattern standalone: "N minutes" or "~N min"
  const patternStandalone = /([~≈]?\s*\d+\s*(?:mins?|minutes?))/i;
  const matchStandalone = text.match(patternStandalone);
  if (matchStandalone) {
    return matchStandalone[1].trim();
  }

  return null;
}

/**
 * Parse activity text that may contain duration
 *
 * Matches patterns like:
 * - "Welcome and introduction (2 min)"
 * - "Activity overview (5 minutes)"
 * - "Discussion"
 *
 * @param text - Activity text that may contain duration
 * @returns Object with activity text and optional duration
 */
export function parseActivityWithDuration(
  text: string
): { activity: string; duration: string | null } {
  // Pattern: "Activity text (N min)" or "Activity text (N minutes)"
  const pattern = /^(.+?)\s*\(([~≈]?\s*\d+\s*(?:mins?|minutes?))\)\s*$/i;
  const match = text.match(pattern);

  if (match) {
    return {
      activity: match[1].trim(),
      duration: match[2].trim(),
    };
  }

  return {
    activity: text.trim(),
    duration: null,
  };
}

/**
 * Detect instructor note type from text
 *
 * Matches patterns like:
 * - "Teaching Approach: Use visual aids..."
 * - "Differentiation: For beginners..."
 * - "Teaching approach - Focus on..."
 *
 * @param text - Text that may be an instructor note
 * @returns Object with note type and content
 */
export function parseInstructorNote(
  text: string
): { type: 'teaching-approach' | 'differentiation' | null; content: string } {
  const lowerText = text.toLowerCase();

  // Check for Teaching Approach
  const teachingPattern = /^teaching\s*approach\s*[:.\-–—]\s*(.+)$/i;
  const teachingMatch = text.match(teachingPattern);
  if (teachingMatch) {
    return {
      type: 'teaching-approach',
      content: teachingMatch[1].trim(),
    };
  }

  // Check for Differentiation
  const diffPattern = /^differentiation\s*[:.\-–—]\s*(.+)$/i;
  const diffMatch = text.match(diffPattern);
  if (diffMatch) {
    return {
      type: 'differentiation',
      content: diffMatch[1].trim(),
    };
  }

  // Also check if the text just starts with these keywords (for multi-line notes)
  if (lowerText.startsWith('teaching approach')) {
    return {
      type: 'teaching-approach',
      content: text.replace(/^teaching\s*approach\s*[:.\-–—]?\s*/i, '').trim(),
    };
  }

  if (lowerText.startsWith('differentiation')) {
    return {
      type: 'differentiation',
      content: text.replace(/^differentiation\s*[:.\-–—]?\s*/i, '').trim(),
    };
  }

  return {
    type: null,
    content: text,
  };
}
