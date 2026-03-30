/**
 * Parser Tests
 *
 * Tests for the Notion block parser with mock data for all content types.
 */

import { parseNotionBlocks } from '../parser';
import type { NotionBlock } from '@/lib/types';
import type {
  SafetySection,
  TimelineSection,
  ChecklistSection,
  OutcomesSection,
  CheckpointSection,
  TeachingStepSection,
  VocabularySection,
  ResourceSection,
  ProseSection,
  HeadingSection,
} from '@/lib/types/content';

// =============================================================================
// Mock Data
// =============================================================================

// Safety callout (red background)
const mockSafetyCalloutRed: NotionBlock = {
  id: 'safety-1',
  type: 'callout',
  has_children: false,
  callout: {
    icon: { type: 'emoji', emoji: '⚠️' },
    color: 'red_background',
    rich_text: [{ type: 'text', plain_text: 'Always wear safety goggles when using power tools', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

// Safety callout (yellow background)
const mockSafetyCalloutYellow: NotionBlock = {
  id: 'safety-2',
  type: 'callout',
  has_children: false,
  callout: {
    icon: { type: 'emoji', emoji: '⚠️' },
    color: 'yellow_background',
    rich_text: [{ type: 'text', plain_text: 'Warning: Keep hands clear of the blade', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

// Non-safety callout (blue)
const mockInfoCallout: NotionBlock = {
  id: 'info-1',
  type: 'callout',
  has_children: false,
  callout: {
    icon: { type: 'emoji', emoji: 'ℹ️' },
    color: 'blue_background',
    rich_text: [{ type: 'text', plain_text: 'Tip: Use a damp cloth for better adhesion', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

// Timeline table
const mockTimelineTable: NotionBlock = {
  id: 'timeline-1',
  type: 'table',
  has_children: true,
  table: {
    table_width: 4,
    has_column_header: true,
    has_row_header: false,
  },
  children: [
    {
      id: 'row-header',
      type: 'table_row',
      has_children: false,
      table_row: {
        cells: [
          [{ type: 'text', plain_text: 'Time', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: 'Activity', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: 'Duration', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: 'Notes', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
        ],
      },
    },
    {
      id: 'row-1',
      type: 'table_row',
      has_children: false,
      table_row: {
        cells: [
          [{ type: 'text', plain_text: '09:00', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: 'Introduction', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: '15 mins', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: 'Welcome participants', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
        ],
      },
    },
    {
      id: 'row-2',
      type: 'table_row',
      has_children: false,
      table_row: {
        cells: [
          [{ type: 'text', plain_text: '09:15', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: 'Safety Briefing', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: '30 mins', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: '', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
        ],
      },
    },
  ],
};

// Vocabulary table
const mockVocabularyTable: NotionBlock = {
  id: 'vocab-1',
  type: 'table',
  has_children: true,
  table: {
    table_width: 2,
    has_column_header: true,
    has_row_header: false,
  },
  children: [
    {
      id: 'vocab-header',
      type: 'table_row',
      has_children: false,
      table_row: {
        cells: [
          [{ type: 'text', plain_text: 'Term', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: 'Definition', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
        ],
      },
    },
    {
      id: 'vocab-row-1',
      type: 'table_row',
      has_children: false,
      table_row: {
        cells: [
          [{ type: 'text', plain_text: 'Lug', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: 'A socket joint that connects tubes', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
        ],
      },
    },
    {
      id: 'vocab-row-2',
      type: 'table_row',
      has_children: false,
      table_row: {
        cells: [
          [{ type: 'text', plain_text: 'Mitre', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          [{ type: 'text', plain_text: 'An angled cut at the end of a tube', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
        ],
      },
    },
  ],
};

// Materials heading + list
const mockMaterialsHeading: NotionBlock = {
  id: 'materials-heading',
  type: 'heading_2',
  has_children: false,
  heading_2: {
    rich_text: [{ type: 'text', plain_text: 'Materials Needed', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

const mockMaterialsList: NotionBlock[] = [
  {
    id: 'material-1',
    type: 'bulleted_list_item',
    has_children: false,
    bulleted_list_item: {
      rich_text: [{ type: 'text', plain_text: 'Bamboo poles x 4', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
    },
  },
  {
    id: 'material-2',
    type: 'bulleted_list_item',
    has_children: false,
    bulleted_list_item: {
      rich_text: [{ type: 'text', plain_text: 'Hemp fibre', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
    },
  },
  {
    id: 'material-3',
    type: 'bulleted_list_item',
    has_children: false,
    bulleted_list_item: {
      rich_text: [{ type: 'text', plain_text: '2x Epoxy resin kits', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
    },
  },
];

// Outcomes heading + list
const mockOutcomesHeading: NotionBlock = {
  id: 'outcomes-heading',
  type: 'heading_2',
  has_children: false,
  heading_2: {
    rich_text: [{ type: 'text', plain_text: 'Learning Outcomes', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

const mockOutcomesList: NotionBlock[] = [
  {
    id: 'outcome-1',
    type: 'bulleted_list_item',
    has_children: false,
    bulleted_list_item: {
      rich_text: [{ type: 'text', plain_text: 'Understand bamboo properties', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
    },
  },
  {
    id: 'outcome-2',
    type: 'bulleted_list_item',
    has_children: false,
    bulleted_list_item: {
      rich_text: [{ type: 'text', plain_text: 'Apply lamination techniques', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
    },
  },
];

// Checkpoint heading + list
const mockCheckpointHeading: NotionBlock = {
  id: 'checkpoint-heading',
  type: 'heading_2',
  has_children: false,
  heading_2: {
    rich_text: [{ type: 'text', plain_text: 'What to Look For', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

const mockCheckpointList: NotionBlock[] = [
  {
    id: 'checkpoint-1',
    type: 'bulleted_list_item',
    has_children: false,
    bulleted_list_item: {
      rich_text: [{ type: 'text', plain_text: 'Joints are flush and aligned', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
    },
  },
  {
    id: 'checkpoint-2',
    type: 'bulleted_list_item',
    has_children: false,
    bulleted_list_item: {
      rich_text: [{ type: 'text', plain_text: 'No visible gaps in lamination', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
    },
  },
];

// Numbered list (teaching steps)
const mockNumberedSteps: NotionBlock[] = [
  {
    id: 'step-1',
    type: 'numbered_list_item',
    has_children: false,
    numbered_list_item: {
      rich_text: [{ type: 'text', plain_text: 'Measure and mark the bamboo at 50cm intervals', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
    },
  },
  {
    id: 'step-2',
    type: 'numbered_list_item',
    has_children: false,
    numbered_list_item: {
      rich_text: [{ type: 'text', plain_text: 'Cut along the marked lines using a fine-tooth saw (5 mins)', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
    },
  },
  {
    id: 'step-3',
    type: 'numbered_list_item',
    has_children: false,
    numbered_list_item: {
      rich_text: [{ type: 'text', plain_text: 'Sand the cut edges smooth', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
    },
  },
];

// Resource blocks
const mockImageBlock: NotionBlock = {
  id: 'image-1',
  type: 'image',
  has_children: false,
  image: {
    type: 'external',
    external: { url: 'https://example.com/bamboo-joint.jpg' },
    caption: [{ type: 'text', plain_text: 'Example of a properly aligned joint', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

const mockVideoBlock: NotionBlock = {
  id: 'video-1',
  type: 'video',
  has_children: false,
  video: {
    type: 'external',
    external: { url: 'https://youtube.com/watch?v=abc123' },
    caption: [{ type: 'text', plain_text: 'Tutorial video', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

const mockPdfBlock: NotionBlock = {
  id: 'pdf-1',
  type: 'pdf',
  has_children: false,
  pdf: {
    type: 'external',
    external: { url: 'https://example.com/manual.pdf' },
    name: 'Bamboo Building Manual',
    caption: [{ type: 'text', plain_text: 'Reference document', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

const mockEmbedBlock: NotionBlock = {
  id: 'embed-1',
  type: 'embed',
  has_children: false,
  embed: {
    url: 'https://vimeo.com/123456',
    caption: [{ type: 'text', plain_text: 'Demonstration video', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

// Prose blocks
const mockParagraph1: NotionBlock = {
  id: 'para-1',
  type: 'paragraph',
  has_children: false,
  paragraph: {
    rich_text: [{ type: 'text', plain_text: 'This is the first paragraph of introductory content.', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

const mockParagraph2: NotionBlock = {
  id: 'para-2',
  type: 'paragraph',
  has_children: false,
  paragraph: {
    rich_text: [{ type: 'text', plain_text: 'This is the second paragraph that should be combined.', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

// Heading blocks
// Note: "Module 1:" pattern is detected as a SECTION heading and becomes a teaching-step.
// Using a simple title that won't trigger section detection.
const mockHeading1: NotionBlock = {
  id: 'h1-1',
  type: 'heading_1',
  has_children: false,
  heading_1: {
    rich_text: [{ type: 'text', plain_text: 'Welcome to Bamboo Building', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

const mockHeading2: NotionBlock = {
  id: 'h2-1',
  type: 'heading_2',
  has_children: false,
  heading_2: {
    rich_text: [{ type: 'text', plain_text: 'Section Overview', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

const mockHeading3: NotionBlock = {
  id: 'h3-1',
  type: 'heading_3',
  has_children: false,
  heading_3: {
    rich_text: [{ type: 'text', plain_text: 'Subsection Details', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
  },
};

// =============================================================================
// Tests
// =============================================================================

describe('parseNotionBlocks', () => {
  // ---------------------------------------------------------------------------
  // Safety Section Tests
  // ---------------------------------------------------------------------------
  describe('Safety Detection', () => {
    test('detects SafetySection from red callout', () => {
      const result = parseNotionBlocks([mockSafetyCalloutRed]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('safety');

      const safety = result[0] as SafetySection;
      expect(safety.level).toBe('critical');
      expect(safety.content).toContain('safety goggles');
    });

    test('detects SafetySection from yellow callout', () => {
      const result = parseNotionBlocks([mockSafetyCalloutYellow]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('safety');

      const safety = result[0] as SafetySection;
      expect(safety.level).toBe('warning');
      expect(safety.content).toContain('blade');
    });

    test('non-safety callout becomes prose', () => {
      const result = parseNotionBlocks([mockInfoCallout]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('prose');
    });
  });

  // ---------------------------------------------------------------------------
  // Timeline Section Tests
  // ---------------------------------------------------------------------------
  describe('Timeline Detection', () => {
    test('detects TimelineSection from table with time columns', () => {
      const result = parseNotionBlocks([mockTimelineTable]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('timeline');

      const timeline = result[0] as TimelineSection;
      expect(timeline.rows).toHaveLength(2);
      expect(timeline.rows[0].time).toBe('09:00');
      expect(timeline.rows[0].activity).toBe('Introduction');
      expect(timeline.rows[0].duration).toBe('15 mins');
      expect(timeline.rows[0].notes).toBe('Welcome participants');
    });
  });

  // ---------------------------------------------------------------------------
  // Checklist Section Tests
  // ---------------------------------------------------------------------------
  describe('Checklist Detection', () => {
    test('detects ChecklistSection from materials heading + list', () => {
      const result = parseNotionBlocks([mockMaterialsHeading, ...mockMaterialsList]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('checklist');

      const checklist = result[0] as ChecklistSection;
      expect(checklist.category).toBe('materials');
      expect(checklist.title).toBe('Materials Needed');
      expect(checklist.items).toHaveLength(3);
      expect(checklist.items[0].text).toBe('Bamboo poles');
      expect(checklist.items[0].quantity).toBe('4');
      expect(checklist.items[2].text).toBe('Epoxy resin kits');
      expect(checklist.items[2].quantity).toBe('2');
    });
  });

  // ---------------------------------------------------------------------------
  // Outcomes Section Tests
  // ---------------------------------------------------------------------------
  describe('Outcomes Detection', () => {
    test('detects OutcomesSection from learning outcomes heading', () => {
      const result = parseNotionBlocks([mockOutcomesHeading, ...mockOutcomesList]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('outcomes');

      const outcomes = result[0] as OutcomesSection;
      expect(outcomes.title).toBe('Learning Outcomes');
      expect(outcomes.items).toHaveLength(2);
      expect(outcomes.items[0]).toBe('Understand bamboo properties');
      expect(outcomes.items[1]).toBe('Apply lamination techniques');
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint Section Tests
  // ---------------------------------------------------------------------------
  describe('Checkpoint Detection', () => {
    test('detects CheckpointSection from what to look for heading', () => {
      const result = parseNotionBlocks([mockCheckpointHeading, ...mockCheckpointList]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('checkpoint');

      const checkpoint = result[0] as CheckpointSection;
      expect(checkpoint.title).toBe('What to Look For');
      expect(checkpoint.items).toHaveLength(2);
      expect(checkpoint.items[0].criterion).toBe('Joints are flush and aligned');
      expect(checkpoint.items[1].criterion).toBe('No visible gaps in lamination');
    });
  });

  // ---------------------------------------------------------------------------
  // Teaching Step Section Tests
  // ---------------------------------------------------------------------------
  describe('Teaching Step Detection', () => {
    test('numbered list items without explicit step pattern become prose', () => {
      // The parser only creates teaching-step sections for items with explicit
      // "Step X:" or "SECTION X:" patterns. Other numbered items become prose.
      const result = parseNotionBlocks(mockNumberedSteps);

      // Numbered items without "Step X:" prefix are grouped as prose
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('prose');

      const prose = result[0] as ProseSection;
      expect(prose.content).toContain('1. Measure and mark');
      expect(prose.content).toContain('2. Cut along');
      expect(prose.content).toContain('3. Sand the cut');
    });

    test('detects TeachingStepSection from explicit step pattern', () => {
      const explicitSteps: NotionBlock[] = [
        {
          id: 'step-explicit-1',
          type: 'numbered_list_item',
          has_children: false,
          numbered_list_item: {
            rich_text: [{ type: 'text', plain_text: 'Step 1: Measure and mark the bamboo', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          },
        },
        {
          id: 'step-explicit-2',
          type: 'numbered_list_item',
          has_children: false,
          numbered_list_item: {
            rich_text: [{ type: 'text', plain_text: 'Step 2: Cut along the lines (5 mins)', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }],
          },
        },
      ];

      const result = parseNotionBlocks(explicitSteps);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('teaching-step');
      expect(result[1].type).toBe('teaching-step');

      const step1 = result[0] as TeachingStepSection;
      expect(step1.stepNumber).toBe(1);
      expect(step1.instruction).toContain('Measure and mark');

      const step2 = result[1] as TeachingStepSection;
      expect(step2.stepNumber).toBe(2);
      expect(step2.duration).toBe('5 mins');
    });
  });

  // ---------------------------------------------------------------------------
  // Vocabulary Section Tests
  // ---------------------------------------------------------------------------
  describe('Vocabulary Detection', () => {
    test('detects VocabularySection from term/definition table', () => {
      const result = parseNotionBlocks([mockVocabularyTable]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('vocabulary');

      const vocab = result[0] as VocabularySection;
      expect(vocab.terms).toHaveLength(2);
      expect(vocab.terms[0].term).toBe('Lug');
      expect(vocab.terms[0].definition).toBe('A socket joint that connects tubes');
      expect(vocab.terms[1].term).toBe('Mitre');
      expect(vocab.terms[1].definition).toBe('An angled cut at the end of a tube');
    });
  });

  // ---------------------------------------------------------------------------
  // Resource Section Tests
  // ---------------------------------------------------------------------------
  describe('Resource Detection', () => {
    test('detects ResourceSection from image block', () => {
      const result = parseNotionBlocks([mockImageBlock]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('resource');

      const resource = result[0] as ResourceSection;
      expect(resource.resourceType).toBe('image');
      expect(resource.url).toBe('https://example.com/bamboo-joint.jpg');
      expect(resource.caption).toBe('Example of a properly aligned joint');
    });

    test('detects ResourceSection from video block', () => {
      const result = parseNotionBlocks([mockVideoBlock]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('resource');

      const resource = result[0] as ResourceSection;
      expect(resource.resourceType).toBe('video');
      expect(resource.url).toBe('https://youtube.com/watch?v=abc123');
    });

    test('detects ResourceSection from PDF block', () => {
      const result = parseNotionBlocks([mockPdfBlock]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('resource');

      const resource = result[0] as ResourceSection;
      expect(resource.resourceType).toBe('pdf');
      expect(resource.title).toBe('Bamboo Building Manual');
    });

    test('detects ResourceSection from embed blocks', () => {
      const result = parseNotionBlocks([mockEmbedBlock]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('resource');

      const resource = result[0] as ResourceSection;
      expect(resource.resourceType).toBe('video');
      expect(resource.url).toBe('https://vimeo.com/123456');
    });
  });

  // ---------------------------------------------------------------------------
  // Prose Section Tests
  // ---------------------------------------------------------------------------
  describe('Prose Detection', () => {
    test('falls back to ProseSection for unrecognised blocks', () => {
      const result = parseNotionBlocks([mockParagraph1]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('prose');

      const prose = result[0] as ProseSection;
      expect(prose.content).toContain('first paragraph');
    });

    test('combines consecutive prose blocks', () => {
      const result = parseNotionBlocks([mockParagraph1, mockParagraph2]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('prose');

      const prose = result[0] as ProseSection;
      expect(prose.content).toContain('first paragraph');
      expect(prose.content).toContain('second paragraph');
    });
  });

  // ---------------------------------------------------------------------------
  // Heading Section Tests
  // ---------------------------------------------------------------------------
  describe('Heading Detection', () => {
    test('detects HeadingSection for standalone h1', () => {
      const result = parseNotionBlocks([mockHeading1]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('heading');

      const heading = result[0] as HeadingSection;
      expect(heading.level).toBe(1);
      expect(heading.text).toBe('Welcome to Bamboo Building');
    });

    test('detects HeadingSection for standalone h2', () => {
      const result = parseNotionBlocks([mockHeading2]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('heading');

      const heading = result[0] as HeadingSection;
      expect(heading.level).toBe(2);
      expect(heading.text).toBe('Section Overview');
    });

    test('detects HeadingSection for standalone h3', () => {
      const result = parseNotionBlocks([mockHeading3]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('heading');

      const heading = result[0] as HeadingSection;
      expect(heading.level).toBe(3);
      expect(heading.text).toBe('Subsection Details');
    });
  });

  // ---------------------------------------------------------------------------
  // Combined Content Tests
  // ---------------------------------------------------------------------------
  describe('Combined Content', () => {
    test('handles mixed content correctly and reorders for teaching', () => {
      const mixedBlocks = [
        mockHeading1,
        mockParagraph1,
        mockSafetyCalloutRed,
        mockMaterialsHeading,
        ...mockMaterialsList,
        ...mockNumberedSteps,
      ];

      const result = parseNotionBlocks(mixedBlocks);

      // Parser reorders for optimal instructor delivery:
      // 1. Safety first
      // 2. Materials (checklists)
      // 3. Other content (heading, prose, numbered-list-as-prose)
      //
      // Note: mockNumberedSteps without "Step X:" pattern become prose,
      // and paragraph + numbered prose may combine into one prose section

      // Check that we have the expected section types (order is reordered for teaching)
      const types = result.map(s => s.type);

      // Safety should be first
      expect(types[0]).toBe('safety');

      // Should have checklist
      expect(types).toContain('checklist');

      // Should have heading
      expect(types).toContain('heading');

      // Should have prose (from paragraph and/or numbered list)
      expect(types).toContain('prose');

      // Total sections: safety, checklist, heading, prose (combined or separate)
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    test('reorders outcomes before checkpoints', () => {
      const orderedBlocks = [
        mockCheckpointHeading,  // Put checkpoint first in input
        ...mockCheckpointList,
        mockOutcomesHeading,    // Put outcomes second in input
        ...mockOutcomesList,
      ];

      const result = parseNotionBlocks(orderedBlocks);

      expect(result).toHaveLength(2);
      // After reordering: outcomes (overview) comes before checkpoint (assessment)
      expect(result[0].type).toBe('outcomes');
      expect(result[1].type).toBe('checkpoint');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------
  describe('Edge Cases', () => {
    test('handles empty blocks array', () => {
      const result = parseNotionBlocks([]);
      expect(result).toHaveLength(0);
    });

    test('handles blocks with missing content', () => {
      const emptyBlock: NotionBlock = {
        id: 'empty-1',
        type: 'paragraph',
        has_children: false,
        paragraph: {
          rich_text: [],
        },
      };

      const result = parseNotionBlocks([emptyBlock]);
      // Empty paragraphs should be skipped
      expect(result).toHaveLength(0);
    });

    test('all sections have unique IDs', () => {
      const mixedBlocks = [
        mockHeading1,
        mockParagraph1,
        mockSafetyCalloutRed,
        mockImageBlock,
      ];

      const result = parseNotionBlocks(mixedBlocks);
      const ids = result.map((s) => s.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
