/**
 * Lesson Layout Ordering
 *
 * Reorders ContentSection[] into a standard instructor-focused layout
 * without losing any content. The ordering is display-only — the CMS
 * blocks remain in their original order in the database.
 *
 * Zones:
 *  1. Overview (first prose block)
 *  2. Prep (outcomes, timeline, safety, checklists, vocabulary)
 *  3. Delivery (teaching steps, heading+prose content)
 *  4. Assessment (checkpoint blocks)
 *  5. Resources (resource blocks)
 *  6. Reflection (instructor notes, prep-for-next-session checklists)
 */

import type { ContentSection, HeadingSection } from '@/lib/types/content';

export type LayoutVersion = 'standard-v1' | 'multi-day-v1' | 'legacy';

// Heading text patterns that indicate instructor notes (Zone 6)
const INSTRUCTOR_NOTE_PATTERNS = /teaching tips|instructor notes|instructor reflection|reflection guide|for mixed ability|for prison education|engagement strateg|behavior management|contingency|preparation for next/i;

// Heading text patterns that indicate a multi-day section header
const DAY_HEADING_PATTERN = /^DAY \d|^Day \d/;

interface ZonedSection {
  zone: number;
  subOrder: number; // preserve relative order within zone
  section: ContentSection;
}

/**
 * Classify a section into a zone based on its type and content.
 * Returns the zone number (1-6).
 */
function classifySection(
  section: ContentSection,
  index: number,
  isFirstProse: boolean,
  followsInstructorHeading: boolean,
): number {
  switch (section.type) {
    case 'prose':
      if (isFirstProse) return 1; // overview
      if (followsInstructorHeading) return 6; // instructor notes
      return 3; // delivery content

    case 'outcomes':
      return 2; // prep

    case 'timeline':
      return 2; // prep

    case 'safety':
      // Safety blocks with content about resources/references are Zone 5
      if (section.title?.toLowerCase().includes('resources') ||
          section.content?.toLowerCase().includes('resources & references')) {
        return 5;
      }
      return 2; // prep — safety must be early

    case 'checklist':
      if (section.category === 'preparation') return 6; // next session prep
      return 2; // prep — materials/tools/equipment

    case 'vocabulary':
      return 2; // prep

    case 'teaching-step':
      return 3; // delivery

    case 'heading':
      if (INSTRUCTOR_NOTE_PATTERNS.test(section.text)) return 6;
      return 3; // delivery content heading

    case 'checkpoint':
      return 4; // assessment

    case 'resource':
      return 5; // resources

    default:
      return 3; // delivery fallback
  }
}

/**
 * Reorder sections into the standard instructor layout.
 * GUARANTEES: output.length === input.length (no data loss).
 * Falls back to original order if any inconsistency detected.
 */
export function orderSections(
  sections: ContentSection[],
  layout: LayoutVersion,
): ContentSection[] {
  if (layout === 'legacy' || sections.length === 0) {
    return sections;
  }

  const zoned: ZonedSection[] = [];
  let firstProseSeen = false;
  let currentInstructorHeading = false;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const isFirstProse = section.type === 'prose' && !firstProseSeen;

    if (section.type === 'prose' && !firstProseSeen) {
      firstProseSeen = true;
    }

    // Track heading→prose pairs for instructor notes detection
    if (section.type === 'heading') {
      currentInstructorHeading = INSTRUCTOR_NOTE_PATTERNS.test(
        (section as HeadingSection).text,
      );
    } else if (section.type !== 'prose') {
      currentInstructorHeading = false;
    }

    const zone = classifySection(section, i, isFirstProse, currentInstructorHeading);

    zoned.push({
      zone,
      subOrder: i, // preserve original position within zone
      section,
    });
  }

  // Sort by zone first, then by original position within each zone
  zoned.sort((a, b) => {
    if (a.zone !== b.zone) return a.zone - b.zone;
    // Within zone 3 (delivery), sort teaching steps by stepNumber
    if (a.zone === 3 &&
        a.section.type === 'teaching-step' &&
        b.section.type === 'teaching-step') {
      return a.section.stepNumber - b.section.stepNumber;
    }
    return a.subOrder - b.subOrder;
  });

  const ordered = zoned.map((z) => z.section);

  // SAFETY CHECK: no blocks lost
  if (ordered.length !== sections.length) {
    console.error(
      `[lesson-layout] Block count mismatch: input=${sections.length}, output=${ordered.length}. Using original order.`,
    );
    return sections;
  }

  return ordered;
}

/**
 * Get the zone label for a section based on its position in an ordered array.
 * Returns the zone label if this section starts a new zone, null otherwise.
 */
export function getZoneLabel(
  sections: ContentSection[],
  index: number,
  layout: LayoutVersion,
): string | null {
  if (layout === 'legacy' || index <= 0 || index >= sections.length) {
    return null;
  }

  const section = sections[index];
  const prevSection = index > 0 ? sections[index - 1] : null;

  // Zone transitions based on type changes
  const currentZoneType = getZoneType(section);
  const prevZoneType = prevSection ? getZoneType(prevSection) : null;

  if (currentZoneType !== prevZoneType && currentZoneType) {
    return currentZoneType;
  }

  return null;
}

function getZoneType(section: ContentSection): string | null {
  switch (section.type) {
    case 'outcomes':
    case 'timeline':
    case 'safety':
    case 'vocabulary':
      return 'Preparation';
    case 'checklist':
      return section.category === 'preparation' ? 'Next Session' : 'Preparation';
    case 'teaching-step':
      return 'Delivery';
    case 'checkpoint':
      return 'Assessment';
    case 'resource':
      return 'Resources';
    default:
      return null;
  }
}
