import { orderSections, getZoneLabel } from '@/lib/lesson-layout';
import type { ContentSection } from '@/lib/types/content';

// Helper to create mock sections
function mockSection(type: string, overrides: Record<string, any> = {}): ContentSection {
  const id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
  const base = { id };

  switch (type) {
    case 'prose':
      return { ...base, type: 'prose', content: overrides.content || 'Test prose', ...overrides } as ContentSection;
    case 'heading':
      return { ...base, type: 'heading', level: 2, text: overrides.text || 'Test heading', ...overrides } as ContentSection;
    case 'outcomes':
      return { ...base, type: 'outcomes', title: 'Learning Outcomes', items: ['Item 1'], ...overrides } as ContentSection;
    case 'timeline':
      return { ...base, type: 'timeline', rows: [{ time: '9:00', activity: 'Start', duration: '10m' }], ...overrides } as ContentSection;
    case 'safety':
      return { ...base, type: 'safety', level: 'warning', content: 'Be safe', ...overrides } as ContentSection;
    case 'checklist':
      return { ...base, type: 'checklist', title: 'Materials', category: overrides.category || 'materials', items: [{ text: 'Item' }], ...overrides } as ContentSection;
    case 'vocabulary':
      return { ...base, type: 'vocabulary', terms: [{ term: 'Term', definition: 'Def' }], ...overrides } as ContentSection;
    case 'teaching-step':
      return { ...base, type: 'teaching-step', stepNumber: overrides.stepNumber || 1, instruction: 'Do this', ...overrides } as ContentSection;
    case 'checkpoint':
      return { ...base, type: 'checkpoint', title: 'Check', items: [{ criterion: 'Can do X' }], ...overrides } as ContentSection;
    case 'resource':
      return { ...base, type: 'resource', resourceType: 'file', url: '/test.pdf', ...overrides } as ContentSection;
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

describe('Lesson Layout Ordering', () => {
  describe('orderSections', () => {
    it('returns original order for legacy layout', () => {
      const sections = [
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('prose'),
        mockSection('safety'),
      ];
      const result = orderSections(sections, 'legacy');
      expect(result).toBe(sections); // same reference
    });

    it('returns empty array for empty input', () => {
      expect(orderSections([], 'standard-v1')).toEqual([]);
    });

    it('NEVER loses blocks (33 blocks like L13)', () => {
      const sections = [
        mockSection('prose'),
        mockSection('heading', { text: 'Unit Details' }),
        mockSection('prose'),
        mockSection('heading', { text: 'Session Timeline' }),
        mockSection('prose'),
        mockSection('prose'),
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('teaching-step', { stepNumber: 2 }),
        mockSection('teaching-step', { stepNumber: 3 }),
        mockSection('teaching-step', { stepNumber: 4 }),
        mockSection('teaching-step', { stepNumber: 5 }),
        mockSection('teaching-step', { stepNumber: 6 }),
        mockSection('teaching-step', { stepNumber: 7 }),
        mockSection('teaching-step', { stepNumber: 8 }),
        mockSection('teaching-step', { stepNumber: 9 }),
        mockSection('checklist', { title: 'Materials Needed' }),
        mockSection('heading', { text: 'Room Setup' }),
        mockSection('prose'),
        mockSection('heading', { text: 'Security Considerations' }),
        mockSection('prose'),
        mockSection('checkpoint', { title: 'OCN Assessment' }),
        mockSection('heading', { text: 'TEACHING TIPS' }),
        mockSection('heading', { text: 'For Mixed Ability Groups' }),
        mockSection('prose'),
        mockSection('heading', { text: 'For Prison Education Context' }),
        mockSection('prose'),
        mockSection('heading', { text: 'Engagement Strategies' }),
        mockSection('prose'),
        mockSection('heading', { text: 'Behavior Management' }),
        mockSection('prose'),
        mockSection('safety', { title: 'RESOURCES & REFERENCES' }),
        mockSection('prose'),
        mockSection('resource'),
      ];

      const result = orderSections(sections, 'standard-v1');

      // CRITICAL: no blocks lost
      expect(result).toHaveLength(33);
      expect(new Set(result.map(s => s.id))).toEqual(new Set(sections.map(s => s.id)));
    });

    it('places safety before teaching steps', () => {
      const sections = [
        mockSection('prose'),
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('safety'),
      ];
      const result = orderSections(sections, 'standard-v1');

      const safetyIdx = result.findIndex(s => s.type === 'safety');
      const stepIdx = result.findIndex(s => s.type === 'teaching-step');
      expect(safetyIdx).toBeLessThan(stepIdx);
    });

    it('places outcomes before teaching steps', () => {
      const sections = [
        mockSection('prose'),
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('outcomes'),
      ];
      const result = orderSections(sections, 'standard-v1');

      const outcomesIdx = result.findIndex(s => s.type === 'outcomes');
      const stepIdx = result.findIndex(s => s.type === 'teaching-step');
      expect(outcomesIdx).toBeLessThan(stepIdx);
    });

    it('places checklist materials before teaching steps', () => {
      const sections = [
        mockSection('prose'),
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('checklist'),
      ];
      const result = orderSections(sections, 'standard-v1');

      const checklistIdx = result.findIndex(s => s.type === 'checklist');
      const stepIdx = result.findIndex(s => s.type === 'teaching-step');
      expect(checklistIdx).toBeLessThan(stepIdx);
    });

    it('places resources after teaching steps', () => {
      const sections = [
        mockSection('resource'),
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('prose'),
      ];
      const result = orderSections(sections, 'standard-v1');

      const resourceIdx = result.findIndex(s => s.type === 'resource');
      const stepIdx = result.findIndex(s => s.type === 'teaching-step');
      expect(resourceIdx).toBeGreaterThan(stepIdx);
    });

    it('places checkpoint after teaching steps', () => {
      const sections = [
        mockSection('checkpoint'),
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('prose'),
      ];
      const result = orderSections(sections, 'standard-v1');

      const checkpointIdx = result.findIndex(s => s.type === 'checkpoint');
      const stepIdx = result.findIndex(s => s.type === 'teaching-step');
      expect(checkpointIdx).toBeGreaterThan(stepIdx);
    });

    it('keeps teaching steps sorted by stepNumber', () => {
      const sections = [
        mockSection('prose'),
        mockSection('teaching-step', { stepNumber: 3 }),
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('teaching-step', { stepNumber: 2 }),
      ];
      const result = orderSections(sections, 'standard-v1');

      const steps = result.filter(s => s.type === 'teaching-step');
      expect((steps[0] as any).stepNumber).toBe(1);
      expect((steps[1] as any).stepNumber).toBe(2);
      expect((steps[2] as any).stepNumber).toBe(3);
    });

    it('moves instructor note headings to end', () => {
      const sections = [
        mockSection('heading', { text: 'TEACHING TIPS' }),
        mockSection('prose', { content: 'Tip content' }),
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('prose', { content: 'Overview' }),
      ];
      const result = orderSections(sections, 'standard-v1');

      // Teaching tips heading should be after teaching step
      const tipsIdx = result.findIndex(s => s.type === 'heading' && (s as any).text === 'TEACHING TIPS');
      const stepIdx = result.findIndex(s => s.type === 'teaching-step');
      expect(tipsIdx).toBeGreaterThan(stepIdx);
    });

    it('puts preparation checklists in reflection zone', () => {
      const sections = [
        mockSection('checklist', { category: 'preparation', title: 'Next Session Prep' }),
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('prose'),
      ];
      const result = orderSections(sections, 'standard-v1');

      const prepIdx = result.findIndex(s => s.type === 'checklist' && (s as any).category === 'preparation');
      const stepIdx = result.findIndex(s => s.type === 'teaching-step');
      expect(prepIdx).toBeGreaterThan(stepIdx);
    });
  });

  describe('getZoneLabel', () => {
    it('returns null for legacy layout', () => {
      const sections = [mockSection('outcomes')];
      expect(getZoneLabel(sections, 0, 'legacy')).toBeNull();
    });

    it('returns Preparation for outcomes', () => {
      const sections = [mockSection('prose'), mockSection('outcomes')];
      expect(getZoneLabel(sections, 1, 'standard-v1')).toBe('Preparation');
    });

    it('returns Delivery for teaching step after non-delivery', () => {
      const sections = [mockSection('outcomes'), mockSection('teaching-step', { stepNumber: 1 })];
      expect(getZoneLabel(sections, 1, 'standard-v1')).toBe('Delivery');
    });

    it('returns null when zone does not change', () => {
      const sections = [
        mockSection('teaching-step', { stepNumber: 1 }),
        mockSection('teaching-step', { stepNumber: 2 }),
      ];
      expect(getZoneLabel(sections, 1, 'standard-v1')).toBeNull();
    });
  });
});
