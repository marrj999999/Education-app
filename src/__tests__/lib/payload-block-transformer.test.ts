/**
 * Tests for the Payload block → ContentSection transformer
 * Verifies all block types are correctly mapped to ContentSection types
 *
 * Note: payloadBlockToContentSection and extractTextFromLexical are private
 * in queries.ts, so we test them indirectly via getPayloadLessonSections
 * or re-export them for testing. Here we test via the public API.
 */

// Mock the payload module
jest.mock('payload', () => ({
  getPayload: jest.fn(),
}));

jest.mock('@payload-config', () => ({}), { virtual: true });

import { getPayload } from 'payload';
import { getPayloadLessonSections } from '@/lib/payload/queries';

const mockPayload = {
  find: jest.fn(),
  findByID: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

(getPayload as jest.Mock).mockResolvedValue(mockPayload);

describe('Payload Block Transformer (via getPayloadLessonSections)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as jest.Mock).mockResolvedValue(mockPayload);
  });

  function mockLessonWithBlocks(blocks: any[]) {
    mockPayload.findByID.mockResolvedValue({
      id: 'lesson-1',
      title: 'Test Lesson',
      sections: blocks,
    });
  }

  describe('heading block', () => {
    it('should transform heading blocks correctly', async () => {
      mockLessonWithBlocks([
        { id: 'h1', blockType: 'heading', level: '2', text: 'Section Title' },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'h1',
        type: 'heading',
        level: 2,
        text: 'Section Title',
      });
    });

    it('should default heading level to 2', async () => {
      mockLessonWithBlocks([
        { id: 'h2', blockType: 'heading', text: 'No Level' },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({ type: 'heading', level: 2 });
    });
  });

  describe('prose block', () => {
    it('should extract text from Lexical rich text', async () => {
      mockLessonWithBlocks([
        {
          id: 'p1',
          blockType: 'prose',
          content: {
            root: {
              children: [
                {
                  children: [
                    { type: 'text', text: 'Hello ' },
                    { type: 'text', text: 'world' },
                  ],
                },
              ],
            },
          },
        },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'prose',
        content: 'Hello world',
      });
    });

    it('should handle empty Lexical content', async () => {
      mockLessonWithBlocks([
        { id: 'p2', blockType: 'prose', content: null },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({ type: 'prose', content: '' });
    });
  });

  describe('timeline block', () => {
    it('should transform timeline rows', async () => {
      mockLessonWithBlocks([
        {
          id: 't1',
          blockType: 'timeline',
          title: 'Schedule',
          rows: [
            { time: '09:00', activity: 'Intro', duration: '15 min', notes: 'Be ready' },
            { time: '09:15', activity: 'Demo', duration: '30 min' },
          ],
        },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({
        type: 'timeline',
        title: 'Schedule',
        rows: [
          { time: '09:00', activity: 'Intro', duration: '15 min', notes: 'Be ready' },
          { time: '09:15', activity: 'Demo', duration: '30 min', notes: undefined },
        ],
      });
    });

    it('should handle missing rows', async () => {
      mockLessonWithBlocks([
        { id: 't2', blockType: 'timeline', title: 'Empty' },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({ type: 'timeline', rows: [] });
    });
  });

  describe('checklist block', () => {
    it('should transform checklist items with category', async () => {
      mockLessonWithBlocks([
        {
          id: 'cl1',
          blockType: 'checklist',
          category: 'tools',
          title: 'Tools Needed',
          items: [
            { text: 'Hacksaw', quantity: '1' },
            { text: 'Sandpaper' },
          ],
        },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({
        type: 'checklist',
        category: 'tools',
        title: 'Tools Needed',
        items: [
          { text: 'Hacksaw', quantity: '1' },
          { text: 'Sandpaper', quantity: undefined },
        ],
      });
    });

    it('should default category to materials', async () => {
      mockLessonWithBlocks([
        { id: 'cl2', blockType: 'checklist', title: 'List', items: [] },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({ category: 'materials' });
    });
  });

  describe('safety block', () => {
    it('should transform safety with items', async () => {
      mockLessonWithBlocks([
        {
          id: 's1',
          blockType: 'safety',
          level: 'critical',
          title: 'PPE Required',
          content: 'Always wear protection',
          items: [{ text: 'Goggles' }, { text: 'Gloves' }],
        },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({
        type: 'safety',
        level: 'critical',
        title: 'PPE Required',
        content: 'Always wear protection',
        items: ['Goggles', 'Gloves'],
      });
    });

    it('should default level to warning', async () => {
      mockLessonWithBlocks([
        { id: 's2', blockType: 'safety', content: 'Be careful' },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({ level: 'warning' });
    });

    it('should omit items when empty', async () => {
      mockLessonWithBlocks([
        { id: 's3', blockType: 'safety', content: 'Note', items: [] },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({ items: undefined });
    });
  });

  describe('teachingStep block', () => {
    it('should transform teaching step with all fields', async () => {
      mockLessonWithBlocks([
        {
          id: 'ts1',
          blockType: 'teachingStep',
          stepNumber: 3,
          title: 'Apply epoxy',
          instruction: 'Mix resin and hardener',
          duration: '20 min',
          tips: [{ text: 'Mix slowly' }],
          warnings: [{ text: 'Ventilation required' }],
          activities: [{ text: 'Practice mixing', duration: '5 min' }],
          paragraphs: [{ text: 'Additional info' }],
        },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({
        type: 'teaching-step',
        stepNumber: 3,
        title: 'Apply epoxy',
        instruction: 'Mix resin and hardener',
        duration: '20 min',
        tips: ['Mix slowly'],
        warnings: ['Ventilation required'],
        activities: [{ text: 'Practice mixing', duration: '5 min' }],
        paragraphs: ['Additional info'],
      });
    });

    it('should omit optional arrays when empty', async () => {
      mockLessonWithBlocks([
        {
          id: 'ts2',
          blockType: 'teachingStep',
          stepNumber: 1,
          instruction: 'Do the thing',
          tips: [],
          warnings: [],
          activities: [],
        },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({
        tips: undefined,
        warnings: undefined,
        activities: undefined,
      });
    });
  });

  describe('checkpoint block', () => {
    it('should transform checkpoint items', async () => {
      mockLessonWithBlocks([
        {
          id: 'cp1',
          blockType: 'checkpoint',
          title: 'Quality Check',
          items: [
            { criterion: 'Even thickness', description: 'Use caliper' },
            { criterion: 'No cracks' },
          ],
        },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({
        type: 'checkpoint',
        title: 'Quality Check',
        items: [
          { criterion: 'Even thickness', description: 'Use caliper' },
          { criterion: 'No cracks', description: undefined },
        ],
      });
    });
  });

  describe('outcomes block', () => {
    it('should transform outcomes items', async () => {
      mockLessonWithBlocks([
        {
          id: 'o1',
          blockType: 'outcomes',
          title: 'Learning Objectives',
          items: [{ text: 'Understand materials' }, { text: 'Apply techniques' }],
        },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({
        type: 'outcomes',
        title: 'Learning Objectives',
        items: ['Understand materials', 'Apply techniques'],
      });
    });

    it('should default title to Learning Outcomes', async () => {
      mockLessonWithBlocks([
        { id: 'o2', blockType: 'outcomes', items: [{ text: 'Item 1' }] },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({ title: 'Learning Outcomes' });
    });
  });

  describe('vocabulary block', () => {
    it('should transform vocabulary terms', async () => {
      mockLessonWithBlocks([
        {
          id: 'v1',
          blockType: 'vocabulary',
          terms: [
            { term: 'Culm', definition: 'The stem of bamboo' },
            { term: 'Node', definition: 'Joint of bamboo stem' },
          ],
        },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({
        type: 'vocabulary',
        terms: [
          { term: 'Culm', definition: 'The stem of bamboo' },
          { term: 'Node', definition: 'Joint of bamboo stem' },
        ],
      });
    });
  });

  describe('resource block', () => {
    it('should transform resource blocks', async () => {
      mockLessonWithBlocks([
        {
          id: 'r1',
          blockType: 'resource',
          resourceType: 'pdf',
          url: '/docs/guide.pdf',
          title: 'Build Guide',
          caption: 'Reference document',
        },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({
        type: 'resource',
        resourceType: 'pdf',
        url: '/docs/guide.pdf',
        title: 'Build Guide',
        caption: 'Reference document',
      });
    });

    it('should default resourceType to file', async () => {
      mockLessonWithBlocks([
        { id: 'r2', blockType: 'resource', url: '/stuff.zip' },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result[0]).toMatchObject({ resourceType: 'file' });
    });
  });

  describe('unknown and edge cases', () => {
    it('should skip unknown block types', async () => {
      mockLessonWithBlocks([
        { id: 'u1', blockType: 'unknown-type', data: 'test' },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result).toHaveLength(0);
    });

    it('should skip blocks without blockType', async () => {
      mockLessonWithBlocks([
        { id: 'n1', data: 'test' },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result).toHaveLength(0);
    });

    it('should skip null blocks', async () => {
      mockLessonWithBlocks([null, undefined]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result).toHaveLength(0);
    });

    it('should handle multiple blocks of mixed types', async () => {
      mockLessonWithBlocks([
        { id: 'h1', blockType: 'heading', level: '1', text: 'Title' },
        { id: 'p1', blockType: 'prose', content: null },
        { id: 's1', blockType: 'safety', level: 'warning', content: 'Be safe' },
        { id: 'ts1', blockType: 'teachingStep', stepNumber: 1, instruction: 'Do it' },
      ]);

      const result = await getPayloadLessonSections('lesson-1');
      expect(result).toHaveLength(4);
      expect(result.map((s) => s.type)).toEqual([
        'heading',
        'prose',
        'safety',
        'teaching-step',
      ]);
    });

    it('should return empty array when lesson has no sections', async () => {
      mockPayload.findByID.mockResolvedValue({
        id: 'lesson-1',
        title: 'Empty Lesson',
      });

      const result = await getPayloadLessonSections('lesson-1');
      expect(result).toEqual([]);
    });

    it('should return empty array when lesson is not found', async () => {
      mockPayload.findByID.mockRejectedValue(new Error('Not found'));

      const result = await getPayloadLessonSections('nonexistent');
      expect(result).toEqual([]);
    });
  });
});
